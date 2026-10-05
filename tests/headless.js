// Fast engine tests that run in plain Node:
//  1. every fighter can play full matches in both game styles without errors
//  2. practice mode survives every dummy setting and never knocks anyone out
//  3. balance: no fighter's win rate drifts far from 50% (both styles)
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

// 3. balance
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
