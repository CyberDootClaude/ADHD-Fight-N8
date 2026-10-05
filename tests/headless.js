// Fast engine tests that run in plain Node:
//  1. every fighter can play full matches in both game styles without errors
//  2. practice mode survives every dummy setting and never knocks anyone out
//  3. the CPU punishes whiffs, adapts to habits and plays its character's style
//  4. balance: no fighter's win rate drifts far from 50% (both styles)
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadGame } = require('./engine');

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};

const run = loadGame();

// 1. full matches
for (const classic of [false, true]) {
  const res = run(`(function () {
    const out = [];
    for (let i = 0; i < ROSTER.length; i++) {
      const j = (i + 5) % ROSTER.length;
      try {
        const m = new Match({ defs: [ROSTER[i], ROSTER[j]], stage: i % STAGES.length, inputs: [new PlayerInput(), new PlayerInput()],
          ai: [new AIController('hard'), new AIController('hard')], winsNeeded: 2, classic: ${classic} });
        let n = 0;
        while (!m.over && n < 60 * 60 * 8) { if (n % 600 === 0) m.f.forEach((f) => (f.meter = 100)); m.tick(); n++; }
        out.push([ROSTER[i].id, m.over, null]);
      } catch (e) { out.push([ROSTER[i].id, false, String(e.stack || e)]); }
    }
    return out;
  })()`);
  const bad = res.filter(([, over]) => !over);
  check(`${classic ? 'Classic' : 'Fast'}: all 16 fighters finish full matches`, bad.length === 0, bad.map((b) => `${b[0]}: ${b[2] || 'did not finish'}`).join('; '));
}

// 2. practice mode with every dummy action x guard (and a counterattack)
const prac = run(`(function () {
  const problems = [];
  let n = 0;
  for (let d = 0; d < DUMMY_ACTIONS.length; d++) for (let g = 0; g < DUMMY_GUARDS.length; g++) {
    const p = { dummy: d, guard: g, reversal: (d + g) % DUMMY_REVERSALS.length, health: n % 2, meter: 0, cooldowns: n % 2, position: n % 3, hitboxes: 0, inputs: 1, data: 1 };
    try {
      const m = new Match({ defs: [ROSTER[n % 16], ROSTER[(n * 7 + 3) % 16]], stage: 0, inputs: [new PlayerInput(), new PlayerInput()],
        ai: [new AIController('hard'), makePracticeAI(p)], practice: p, classic: n % 2 === 1 });
      for (let t = 0; t < 900; t++) { m.tick(); if (t === 450) m.resetPositions(); }
      if (m.f.some((f) => f.hp <= 0)) problems.push('KO in practice ' + d + '/' + g);
    } catch (e) { problems.push(String(e.stack || e)); }
    n++;
  }
  return problems;
})()`);
check('Practice: every dummy action and guard setting runs, nobody gets knocked out', prac.length === 0, prac.slice(0, 3).join('; '));

// 3. smarter CPU: punishes whiffs, learns to anti-air jump-ins, plays its character's style
const cpu = run(`(function () {
  // seeded randomness so these checks give the same result every run
  let seed = 12345;
  Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const mk = (a, b, ai0, ai1) => {
    const m = new Match({ defs: [ROSTER[a], ROSTER[b]], stage: 0, inputs: [new PlayerInput(), new PlayerInput()], ai: [ai0, ai1], winsNeeded: 99 });
    m.noKO = true; m.phase = 'fight'; m.inputLocked = false;
    return m;
  };
  const frozen = (lvl) => { const ai = new AIController(lvl); ai.decide = function () { this.wait = 5; }; return ai; };
  const out = {};
  // whiffed heavies at 196px: the CPU (only reacting, never starting attacks) should punish
  const m = mk(1, 3, null, frozen('hard'));
  m.ai[0] = { t: 0, update() { const t = this.t++; return t % 60 === 5 || t % 60 === 6 ? { H: true } : {}; } };
  for (let i = 0; i < 600; i++) { m.tick(); m.f[0].x = 1000; if (m.f[1].state !== 'attack' && m.f[1].state !== 'dash') m.f[1].x = 1200; m.f[0].hp = 1000; }
  out.punish = m.cpuPunish || 0;
  // repeated jump-ins: count stuffed jumps early vs late
  const seq = [];
  for (let rep = 0; rep < 8; rep++) {
    const g = mk(rep, (rep + 7) % 16, null, frozen('hard'));
    g.ai[0] = { update(me, opp) {
      const fwd = opp.x > me.x ? 'right' : 'left';
      const d = Math.abs(opp.x - me.x);
      if (me.state === 'air') return { [fwd]: true, H: me.y < -60 && d < 170 };
      if (me.state === 'idle' || me.state === 'walk') {
        if (d < 200) { me.x = opp.x + (me.x < opp.x ? -250 : 250); return {}; }
        return d > 270 ? { [fwd]: true } : { [fwd]: true, up: true };
      }
      return {};
    } };
    let wasAir = false, hit = false, n = 0;
    for (let i = 0; i < 60 * 40 && n < 20; i++) {
      g.tick();
      const p = g.f[0];
      const air = !p.onGround;
      if (air && !wasAir) hit = false;
      if (air && p.state === 'hit') hit = true;
      if (!air && wasAir) seq[n] = (seq[n] || 0) + (hit ? 1 : 0), n++;
      wasAir = air;
      g.f[0].hp = g.f[1].hp = 1000;
    }
  }
  const avg = (a) => a.reduce((x, y) => x + (y || 0), 0) / a.length / 8;
  out.aaEarly = avg(seq.slice(0, 3));
  out.aaLate = avg(seq.slice(10, 20));
  // style: average distance to a passive opponent
  const dist = (id) => {
    const i = ROSTER.findIndex((d) => d.id === id);
    let sum = 0, n = 0;
    for (let rep = 0; rep < 3; rep++) {
      const g = mk(i, (i + 4 + rep) % 16, new AIController('hard'), { update: () => ({}) });
      for (let t = 0; t < 60 * 20; t++) { g.tick(); sum += Math.abs(g.f[0].x - g.f[1].x); n++; g.f[1].hp = 1000; }
    }
    return sum / n;
  };
  out.zoner = (dist('nova') + dist('echo') + dist('nivia')) / 3;
  out.rushdown = (dist('ember') + dist('umbra') + dist('viper')) / 3;
  return out;
})()`);
check('CPU: punishes whiffed attacks', cpu.punish >= 3, `${cpu.punish} punishes of 10 whiffs`);
check('CPU: learns to anti-air repeated jump-ins', cpu.aaLate >= 0.4 && cpu.aaLate > cpu.aaEarly + 0.2, `stuffed ${Math.round(cpu.aaEarly * 100)}% of the first jumps, ${Math.round(cpu.aaLate * 100)}% later`);
check('CPU: zoners keep their distance, rushdown stays close', cpu.zoner > cpu.rushdown * 1.25, `${Math.round(cpu.zoner)}px vs ${Math.round(cpu.rushdown)}px`);

// 4. balance
const PER = process.env.BALANCE_PER || '3';
for (const classic of [false, true]) {
  const file = path.join(os.tmpdir(), `adhd-balance-${classic ? 'classic' : 'fast'}-${process.pid}.json`);
  const env = Object.assign({}, process.env, { JSON_OUT: file }, classic ? { CLASSIC: '1' } : {});
  execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', 'balance.js'), PER], { env, stdio: 'ignore' });
  const { rows } = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.unlinkSync(file);
  const out = rows.filter((r) => +r.win < 30 || +r.win > 70);
  const range = `${Math.min(...rows.map((r) => +r.win))}%–${Math.max(...rows.map((r) => +r.win))}%`;
  check(`${classic ? 'Classic' : 'Fast'} balance: every fighter wins 30%–70% of CPU-vs-CPU matches`, out.length === 0, out.length ? out.map((r) => `${r.id} ${r.win}%`).join(', ') : range);
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll headless checks passed');
process.exit(failed ? 1 : 0);
