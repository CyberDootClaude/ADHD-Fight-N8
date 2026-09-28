// Headless balance simulator: plays every matchup, hard CPU vs hard CPU, on
// both sides, and prints win rates and damage stats per character.
//
//   node tools/balance.js [matchesPerPair=6]
//   DETAIL=ferrus,kaze node tools/balance.js   # also show where each one's damage comes from
//   ONLY=nova,sahar node tools/balance.js 40    # only play matchups among these characters
//   CLASSIC=1 node tools/balance.js             # use the Classic (Street Fighter-style) rules
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const PER = +(process.argv[2] || 6); // matches per ordered pair (each side)
const ctx = { console, Math, JSON, Object, Array, Set, Map, Number, String, Date, performance: { now: () => 0 } };
ctx.window = { addEventListener() {}, AudioContext: null };
ctx.document = { getElementById: () => null };
ctx.navigator = {};
ctx.localStorage = { getItem: () => null, setItem() {} };
vm.createContext(ctx);
for (const f of ['util', 'audio', 'input', 'moves', 'entities', 'characters', 'fighter', 'render', 'ai', 'match'])
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), ctx, { filename: f });
vm.runInContext('var Game = { debug: false };', ctx);
const out = vm.runInContext(`(function(PER, ONLY, CLASSIC_ON){
  const N = ROSTER.length, S = {};
  ROSTER.forEach(d => S[d.id] = { w: 0, g: 0, dmg: 0, dmgTaken: 0, hits: 0, bigCombos: 0, maxCombo: 0, maxComboDmg: 0, perfects: 0, rounds: 0, roundsWon: 0, frames: 0, bySrc: {normal:0, special:0, super:0, dot:0} });
  const M = Array.from({length: N}, () => new Array(N).fill(0)); // M[i][j] wins of i vs j
  const mk = (i, j) => {
    const inputs = [new PlayerInput(), new PlayerInput()];
    return new Match({ defs: [ROSTER[i], ROSTER[j]], stage: 0, inputs, ai: [new AIController('hard'), new AIController('hard')], winsNeeded: 2, classic: CLASSIC_ON });
  };
  let closeRounds = 0, totalRounds = 0, hpLeftSum = 0, comebacks = 0;
  const only = ONLY ? ONLY.split(',') : null;
  const use = (i) => !only || only.includes(ROSTER[i].id);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { if (i === j || !use(i) || !use(j)) continue;
    for (let k = 0; k < PER; k++) {
      const m = mk(i, j);
      const ids = [ROSTER[i].id, ROSTER[j].id];
      // instrument hits
      m.f.forEach((f, side) => {
        const th = f.takeHit.bind(f);
        f.takeHit = (hit, att, a, b, hz) => {
          const hp0 = f.hp;
          const r = th(hit, att, a, b, hz);
          const d = hp0 - f.hp;
          if (d > 0 && att && att !== f) {
            const s = S[att.def.id];
            s.dmg += d; S[f.def.id].dmgTaken += d;
            const mv = hz ? (hz.srcName || 'proj') : (att.move ? (att.move.name || att.move.id) : '?');
            s.moves = s.moves || {}; s.moves[mv] = (s.moves[mv] || 0) + d;
            s.tk = s.tk || {}; const tk = hit.super ? 'SUPER' : r; s.tk[tk] = (s.tk[tk]||0)+1;
            if (r === 'hit') s.hits++;
            s.bySrc[hit.super ? 'super' : hit.special ? 'special' : 'normal'] += d;
            if (f.combo > s.maxCombo) s.maxCombo = f.combo;
            if (f.comboDmg > s.maxComboDmg) s.maxComboDmg = f.comboDmg;
          }
          return r;
        };
      });
      let lastRound = 0, frames = 0, wasBehind = [false, false];
      const lowMark = [false, false];
      while (!m.over && frames < 60 * 60 * 8) {
        m.tick(); frames++;
        // comeback: a side that dropped below 30% while the other was above 60% and still won the round
        for (const s of [0,1]) { const f = m.f[s], o = m.f[1-s]; if (f.hp < f.maxHp * 0.3 && o.hp > o.maxHp * 0.6) lowMark[s] = true; }
        if (m.phase === 'ko' && m.phaseT === 1) {
          totalRounds++;
          const w = m.koWinner;
          if (w) {
            const pct = w.hp / w.maxHp; hpLeftSum += pct; if (pct < 0.3) closeRounds++;
            if (w.hp >= w.maxHp) S[w.def.id].perfects++;
            if (lowMark[w.side]) comebacks++;
          }
        }
        if (m.phase === 'intro' && m.phaseT === 1) { lowMark[0] = lowMark[1] = false; }
      }
      // count combos >= 35% of max hp as "big combos" via maxComboDmg tracking already; add dot as residual
      const w = m.winner;
      const rt = m.f[0].wins + m.f[1].wins;
      S[ids[0]].rounds += rt; S[ids[1]].rounds += rt; S[ids[0]].roundsWon += m.f[0].wins; S[ids[1]].roundsWon += m.f[1].wins;
      S[ids[0]].g++; S[ids[1]].g++; S[ids[0]].frames += frames; S[ids[1]].frames += frames;
      if (w) { S[w.def.id].w++; M[w.side === 0 ? i : j][w.side === 0 ? j : i]++; }
    }
  }
  return { S, M, ids: ROSTER.map(d => d.id), closeRounds, totalRounds, avgWinnerHp: hpLeftSum / totalRounds, comebacks };
})(${PER}, ${JSON.stringify(process.env.ONLY || '')}, ${!!process.env.CLASSIC})`, ctx);
const rows = out.ids.filter(id => out.S[id].g).map(id => {
  const s = out.S[id];
  const tot = s.bySrc.normal + s.bySrc.special + s.bySrc.super || 1;
  return { id, win: (100 * s.w / s.g).toFixed(1), rounds: (100 * s.roundsWon / s.rounds).toFixed(1), dmgRatio: (s.dmg / (s.dmgTaken || 1)).toFixed(2), maxCombo: s.maxCombo, maxComboDmg: s.maxComboDmg, perfects: s.perfects, norm: Math.round(100 * s.bySrc.normal / tot), spec: Math.round(100 * s.bySrc.special / tot), sup: Math.round(100 * s.bySrc.super / tot), secs: Math.round(s.frames / s.g / 60) };
}).sort((a, b) => b.win - a.win);
console.table(rows);
if (process.env.DETAIL) for (const id of process.env.DETAIL.split(',')) { const s = out.S[id]; const tot = Object.values(s.moves).reduce((a,b)=>a+b); console.log(id, Object.entries(s.moves).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+':'+Math.round(100*v/tot)+'%').join('  ')); }
const wr = rows.map(r => +r.win);
const mean = wr.reduce((a, b) => a + b) / wr.length;
console.log(`spread: max ${Math.max(...wr)}  min ${Math.min(...wr)}  stdev ${Math.sqrt(wr.reduce((a, b) => a + (b - mean) ** 2, 0) / wr.length).toFixed(1)}`);
console.log(`rounds: ${out.totalRounds}, close finishes (winner <30% hp): ${(100 * out.closeRounds / out.totalRounds).toFixed(1)}%, avg winner hp ${(100 * out.avgWinnerHp).toFixed(1)}%, comebacks: ${(100 * out.comebacks / out.totalRounds).toFixed(1)}%`);
// worst matchups
const ms = [];
for (let i = 0; i < out.ids.length; i++) for (let j = i + 1; j < out.ids.length; j++) { const a = out.M[i][j], b = out.M[j][i]; if (a + b) ms.push([out.ids[i] + ' vs ' + out.ids[j], a, b, Math.abs(a - b)]); }
ms.sort((x, y) => y[3] - x[3]);
console.log('most lopsided matchups:', ms.slice(0, 8).map(m => `${m[0]} ${m[1]}-${m[2]}`).join(' | '));
