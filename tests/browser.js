// Browser tests: load the real page in headless Chromium and drive it like a player
// (keyboard, mouse, touch, gamepad). Run with `npm test` or `node tests/browser.js`.
const path = require('path');
const { chromium } = require('playwright');

const URL = 'file://' + path.join(__dirname, '..', 'index.html');
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== '' ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};

async function open(browser, ctxOpts = {}, init) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 720 } }, ctxOpts));
  if (init) await ctx.addInitScript(init);
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', (e) => p.errs.push(String(e.stack || e)));
  await p.goto(URL);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForFunction(() => typeof Game !== 'undefined' && Game.scene === 'title', null, { timeout: 10000 });
  await p.waitForTimeout(200);
  p.key = async (k, ms = 70) => { await p.keyboard.down(k); await p.waitForTimeout(ms); await p.keyboard.up(k); await p.waitForTimeout(60); };
  p.ev = (f, a) => p.evaluate(f, a);
  return { ctx, p };
}
const noErrors = (label, p) => check(`${label}: no page errors`, p.errs.length === 0, p.errs.slice(0, 2).join(' | '));

// ---- every fighter, both styles, in the real page ----
async function cpuMatches(b) {
  const { ctx, p } = await open(b);
  const res = await p.ev(() => {
    const out = [];
    for (const style of [0, 1]) for (let i = 0; i < ROSTER.length; i++) {
      Game.settings.style = style; Game.mode = 'cpu'; Game.lastPicks = [i, (i + 3) % ROSTER.length]; Game.stageIdx = i % STAGES.length;
      Game.startMatch();
      const m = Game.match;
      m.ai = [new AIController('hard'), new AIController('hard')];
      let n = 0;
      while (!m.over && n < 60 * 60 * 8) { if (n % 600 === 0) m.f.forEach((f) => (f.meter = 100)); m.tick(); if (n % 300 === 0) Game.draw(); n++; }
      if (!m.over) out.push(`${ROSTER[i].id} (${style ? 'classic' : 'fast'})`);
    }
    return out;
  });
  check('CPU vs CPU: every fighter finishes a match in both styles (with drawing)', res.length === 0, res.join(', '));
  noErrors('CPU vs CPU', p);
  await ctx.close();
}

// ---- practice mode through the real menus ----
async function practice(b) {
  const { ctx, p } = await open(b);
  await p.key('ArrowDown'); await p.key('ArrowDown'); await p.key('Enter');
  check('Practice: title menu opens practice select', (await p.ev(() => Game.scene + '/' + Game.mode)) === 'select/training');
  await p.key('KeyF'); await p.key('KeyF'); await p.waitForTimeout(900);
  await p.key('KeyF'); await p.waitForTimeout(600);
  check('Practice: match starts with the practice dummy', (await p.ev(() => Game.scene + '/' + Game.match.ai[1].constructor.name)) === 'fight/DummyController');
  await p.ev(() => { const m = Game.match; m.f[1].x = m.f[0].x + 110; });
  for (let i = 0; i < 3; i++) await p.key('KeyF', 60);
  await p.key('KeyG', 60);
  await p.waitForTimeout(700);
  const info = await p.ev(() => Game.match.info);
  check('Practice: attack data records the combo', !!info && info.damage > 0 && info.combo >= 2 && typeof info.adv === 'number', JSON.stringify(info));
  await p.waitForTimeout(1500);
  check('Practice: dummy health refills', await p.ev(() => Game.match.f[1].hp === Game.match.f[1].maxHp));
  await p.key('Escape'); await p.key('ArrowDown'); await p.key('Enter');
  await p.key('ArrowDown'); await p.key('ArrowRight');
  check('Practice: settings menu changes DUMMY GUARD to ALL', await p.ev(() => DUMMY_GUARDS[Game.practice.guard]) === 'ALL', await p.ev(() => DUMMY_GUARDS[Game.practice.guard]));
  await p.key('Escape'); await p.key('Escape');
  if (await p.ev(() => Game.paused)) await p.key('Escape');
  check('Practice: menus close back to the fight', !(await p.ev(() => Game.paused)));
  await p.ev(() => { Game.match.f[0].x = 300; });
  await p.key('KeyR'); await p.waitForTimeout(100);
  check('Practice: R resets positions', (await p.ev(() => Math.round(Game.match.f[0].x))) !== 300);
  await p.ev(() => { Game.practice.dummy = 5; Game.match.ai[1] = makePracticeAI(Game.practice); });
  await p.waitForTimeout(2000);
  check('Practice: CPU dummy fights back', await p.ev(() => Game.match.ai[1].constructor.name === 'AIController'));
  noErrors('Practice', p);
  await ctx.close();
}

// ---- remapping keys ----
async function controls(b) {
  const { ctx, p } = await open(b);
  for (let i = 0; i < 4; i++) await p.key('ArrowDown');
  await p.key('Enter');
  for (let i = 0; i < 5; i++) await p.key('ArrowDown');
  await p.key('Enter');
  check('Controls: Settings → Controls opens', await p.ev(() => Game.scene) === 'controls');
  for (let i = 0; i < 4; i++) await p.key('ArrowDown');
  await p.key('Enter'); await p.key('KeyJ');
  check('Controls: P1 LIGHT rebinds to J', await p.ev(() => Keybinds.text(0, 'L')) === 'J', await p.ev(() => Keybinds.text(0, 'L')));
  await p.key('ArrowDown'); await p.key('Enter'); await p.key('Comma');
  const h = await p.ev(() => [Keybinds.text(0, 'H'), Keybinds.text(1, 'L')]);
  check('Controls: taking a key from P2 removes it there', h[0].includes(',') && !h[1].includes(','), h.join(' / '));
  await p.reload(); await p.waitForFunction(() => typeof Game !== 'undefined' && Game.scene === 'title', null, { timeout: 10000 });
  check('Controls: bindings persist after reload', await p.ev(() => Keybinds.text(0, 'L')) === 'J');
  await p.ev(() => { Game.mode = 'training'; Game.lastPicks = [0, 1]; Game.stageIdx = 0; Game.startMatch(); });
  await p.waitForTimeout(200);
  await p.keyboard.down('KeyJ'); await p.waitForTimeout(40);
  const st = await p.ev(() => Game.match.f[0].state);
  await p.keyboard.up('KeyJ');
  check('Controls: the new key attacks in a fight', st === 'attack', st);
  await p.ev(() => { Game.go('controls'); Game.openControls(); Game.ctl.row = REMAPPABLE.length; });
  await p.key('Enter');
  check('Controls: reset to defaults', await p.ev(() => Keybinds.text(0, 'L') === 'F'));
  noErrors('Controls', p);
  await ctx.close();
}

// ---- blocking heights, Flow and Classic rules (scripted inputs, deterministic) ----
async function mechanics(b) {
  const { ctx, p } = await open(b);
  const r = await p.ev(() => {
    const ctl = (fn) => ({ t: 0, update() { return fn(this.t++); } });
    const run = (m, n) => { for (let i = 0; i < n; i++) m.tick(); };
    function practiceSetup(p1fn, p2fn, gap) {
      Game.settings.style = 0; Game.mode = 'training'; Game.lastPicks = [1, 3]; Game.stageIdx = 0;
      Game.practice = Object.assign({}, Game.practice, { dummy: 0, guard: 0, reversal: 0, meter: 1, health: 0, position: 0 });
      Game.startMatch();
      const m = Game.match;
      m.f[1].x = m.stage.right; m.f[0].x = m.stage.right - gap;
      m.ai[0] = ctl(p1fn); m.ai[1] = ctl(p2fn);
      m.log = [];
      for (const f of m.f) { const th = f.takeHit.bind(f); f.takeHit = (...a) => { const x = th(...a); if (x !== 'none') m.log.push(`${f.side ? 'P2' : 'P1'}:${x}`); return x; }; }
      return m;
    }
    function classicSetup(p1fn, p2fn, gap, classic = true) {
      Game.mode = 'vs'; Game.lastPicks = [1, 3]; Game.stageIdx = 0; Game.settings.style = classic ? 1 : 0; Game.startMatch();
      const m = Game.match; m.phase = 'fight'; m.inputLocked = false;
      m.f[0].x = 1000; m.f[1].x = 1000 + gap;
      m.ai[0] = ctl(p1fn); m.ai[1] = ctl(p2fn);
      return m;
    }
    const press = (btn, extra = {}, at = 5) => (t) => (t >= at && t < at + 2 ? Object.assign({ [btn]: true }, extra) : {});
    const stand = () => ({ right: true }), crouch = () => ({ right: true, down: true });
    const out = {};
    let m = practiceSetup(press('H', { down: true }), stand, 130); run(m, 60); out.lowVsStand = m.log.join();
    m = practiceSetup(press('H', { down: true }), crouch, 130); run(m, 60); out.lowVsCrouch = m.log.join();
    m = practiceSetup(press('H'), crouch, 130); run(m, 60); out.midVsCrouch = m.log.join();
    for (const [k, def] of [['airVsCrouch', crouch], ['airVsStand', stand]]) {
      out[k] = '';
      for (let at = 10; at < 30 && !out[k]; at++) {
        m = practiceSetup((t) => (t < 3 ? { up: true, right: true } : t >= at && t < at + 2 ? { H: true } : { right: true }), def, 200); run(m, 90);
        out[k] = m.log.join();
      }
    }
    m = practiceSetup(press('H', {}, 5), (t) => (t >= 4 && t < 6 ? { FL: true } : {}), 130); m.f[1].meter = 50; run(m, 60);
    out.flow = m.log.join(); out.flowMeter = m.f[1].meter;
    m = practiceSetup(() => ({}), (t) => (t === 2 ? { FL: true } : {}), 150); m.f[1].meter = 10; run(m, 5);
    out.flowNoMeter = m.f[1].state;
    m = practiceSetup(press('H', { down: true }), () => ({}), 130);
    m.practice.guard = 1; m.ai[1] = makePracticeAI(m.practice); run(m, 60); out.guardAll = m.log.join();
    // classic
    m = classicSetup(press('H', { right: true }, 3), () => ({}), 90); let hp = m.f[1].hp; run(m, 60); out.throwDmg = hp - m.f[1].hp;
    m = classicSetup(press('H', { right: true }, 3), (t) => (t >= 8 && t < 10 ? { H: true } : {}), 90); hp = m.f[1].hp; run(m, 40); out.techDmg = hp - m.f[1].hp;
    m = classicSetup(press('H', { right: true }, 6), (t) => (t >= 2 && t < 4 ? { FL: true } : {}), 90); m.f[1].meter = 100; hp = m.f[1].hp; run(m, 60); out.throwVsFlow = hp - m.f[1].hp;
    m = classicSetup((t) => (t < 2 ? { up: true } : t >= 12 && t < 14 ? { up: true } : t >= 16 && t < 18 ? { D: true, right: true } : {}), () => ({}), 400);
    const states = new Set(); for (let i = 0; i < 70; i++) { m.tick(); states.add(m.f[0].state); } out.classicAirdash = states.has('airdash');
    m = classicSetup(() => ({ right: true }), () => ({}), 600); let x0 = m.f[0].x; run(m, 60); out.classicWalk = m.f[0].x - x0;
    m = classicSetup(() => ({ right: true }), () => ({}), 600, false); x0 = m.f[0].x; run(m, 60); out.fastWalk = m.f[0].x - x0;
    m = classicSetup((t) => ((t >= 2 && t < 4) || (t >= 9 && t < 11) ? { L: true } : {}), () => ({}), 400);
    const ids = new Set(); for (let i = 0; i < 30; i++) { m.tick(); if (m.f[0].move) ids.add(m.f[0].move.id); } out.classicWhiffChain = ids.has('L2');
    out.classicClock = m.clock;
    return out;
  });
  check('Blocking: a low beats a standing block', r.lowVsStand === 'P2:hit', r.lowVsStand);
  check('Blocking: down-back blocks a low', r.lowVsCrouch === 'P2:block', r.lowVsCrouch);
  check('Blocking: down-back blocks a mid', r.midVsCrouch === 'P2:block', r.midVsCrouch);
  check('Blocking: a jump-in beats a crouch block', r.airVsCrouch === 'P2:hit', r.airVsCrouch);
  check('Blocking: standing blocks a jump-in', r.airVsStand === 'P2:block', r.airVsStand);
  check('Flow: evades a heavy and refunds meter', r.flow.startsWith('P2:flowed') && r.flowMeter > 25, `${r.flow}, meter ${Math.round(r.flowMeter)}`);
  check('Flow: does nothing without enough meter', r.flowNoMeter !== 'attack', r.flowNoMeter);
  check('Practice: dummy guard ALL blocks a low', r.guardAll === 'P2:block', r.guardAll);
  check('Classic: forward + Heavy up close throws', r.throwDmg > 0, `${r.throwDmg} dmg`);
  check('Classic: Heavy right after a grab techs the throw', r.techDmg === 0, `${r.techDmg} dmg`);
  check('Classic: throws beat Flow', r.throwVsFlow > 0, `${r.throwVsFlow} dmg`);
  check('Classic: no air-dash', !r.classicAirdash);
  check('Classic: walking is slower than Fast', r.classicWalk > 0 && r.classicWalk < r.fastWalk * 0.75, `${Math.round(r.classicWalk)} vs ${Math.round(r.fastWalk)} px/s`);
  check('Classic: a whiffed jab does not chain', !r.classicWhiffChain);
  check('Classic: 99-second round clock', r.classicClock > 90, r.classicClock);
  noErrors('Mechanics', p);
  await ctx.close();
}

// ---- touch (phone in landscape) ----
async function touch(b) {
  const { ctx, p } = await open(b, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const cdp = await ctx.newCDPSession(p);
  const center = (sel) => p.ev((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
  const send = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q.x, y: q.y, id: i })) });
  const tap = async (sel, ms = 80) => { const c = await center(sel); await send('touchStart', [c]); await p.waitForTimeout(ms); await send('touchEnd', []); await p.waitForTimeout(60); };
  await send('touchStart', [{ x: 400, y: 200 }]); await send('touchEnd', []); await p.waitForTimeout(100);
  check('Touch: controls appear after the first tap', await p.ev(() => getComputedStyle(document.getElementById('touch')).display !== 'none'));
  await tap('.down'); await tap('.down'); await tap('.l');
  check('Touch: menu navigation', await p.ev(() => Game.scene + '/' + Game.mode) === 'select/training');
  await tap('.l'); await tap('.l'); await p.waitForTimeout(800); await tap('.l'); await p.waitForTimeout(400);
  check('Touch: start a fight', await p.ev(() => Game.scene) === 'fight');
  const r = await center('.right'), l = await center('.l');
  const x0 = await p.ev(() => Game.match.f[0].x);
  await send('touchStart', [r]); await p.waitForTimeout(300);
  const x1 = await p.ev(() => Game.match.f[0].x);
  await send('touchMove', [r, l]); await p.waitForTimeout(50);
  const st = await p.ev(() => Game.match.f[0].state);
  await send('touchEnd', []); await p.waitForTimeout(400);
  check('Touch: hold → walks, a second finger attacks', x1 - x0 > 20 && st === 'attack', `${Math.round(x1 - x0)}px, ${st}`);
  await tap('.pause');
  check('Touch: ❚❚ pauses', await p.ev(() => Game.paused));
  noErrors('Touch', p);
  await ctx.close();
}

// ---- gamepad (faked navigator.getGamepads) ----
async function gamepad(b) {
  const { ctx, p } = await open(b, {}, () => {
    const mk = () => ({ id: 'Test Pad', connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
    window.__pads = [mk(), mk()];
    navigator.getGamepads = () => window.__pads;
    window.__press = (i, n, on) => { window.__pads[i].buttons[n].pressed = on; window.__pads[i].buttons[n].value = on ? 1 : 0; };
    window.__axis = (i, a, v) => { window.__pads[i].axes[a] = v; };
  });
  const btn = async (i, n, ms = 80) => { await p.ev(([i, n]) => __press(i, n, true), [i, n]); await p.waitForTimeout(ms); await p.ev(([i, n]) => __press(i, n, false), [i, n]); await p.waitForTimeout(60); };
  await btn(0, 13); await btn(0, 2);
  check('Gamepad: menu (d-pad + X) picks 2 PLAYERS', await p.ev(() => Game.scene + '/' + Game.mode) === 'select/vs');
  await btn(0, 2); await btn(1, 15); await btn(1, 2); await p.waitForTimeout(800);
  await btn(0, 2); await p.waitForTimeout(2000);
  check('Gamepad: two pads pick fighters and start', await p.ev(() => Game.scene) === 'fight');
  const x0 = await p.ev(() => Game.match.f[0].x);
  await p.ev(() => __axis(0, 0, 1)); await p.waitForTimeout(300); await p.ev(() => __axis(0, 0, 0));
  check('Gamepad: stick moves P1', (await p.ev(() => Game.match.f[0].x)) - x0 > 20);
  await p.waitForTimeout(600);
  await p.ev(() => __press(0, 2, true)); await p.waitForTimeout(40);
  const st = await p.ev(() => Game.match.f[0].state);
  await p.ev(() => __press(0, 2, false));
  check('Gamepad: X attacks', st === 'attack', st);
  await p.waitForTimeout(800);
  await btn(0, 9);
  check('Gamepad: Start pauses', await p.ev(() => Game.paused));
  await btn(0, 1);
  check('Gamepad: B resumes', !(await p.ev(() => Game.paused)));
  noErrors('Gamepad', p);
  await ctx.close();
}

// ---- mouse ----
async function mouse(b) {
  const { ctx, p } = await open(b, { viewport: { width: 1600, height: 900 } });
  const rect = await p.ev(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.x, y: r.y, s: r.width / 1280 }; });
  const at = (x, y) => ({ x: rect.x + x * rect.s, y: rect.y + y * rect.s });
  const click = async (x, y, button = 'left') => { const q = at(x, y); await p.mouse.move(q.x, q.y, { steps: 3 }); await p.waitForTimeout(40); await p.mouse.click(q.x, q.y, { button }); await p.waitForTimeout(120); };
  // hotspots are registered while drawing, so click the center of the one whose label matches
  await click(640, 290 + 4 * 54 - 12);
  check('Mouse: click SETTINGS on the title', await p.ev(() => Game.scene) === 'settings');
  const arrows = await p.ev(() => Game.hot.filter((h) => h.w < 100 && h.y < 200).map((h) => [Math.round(h.x + h.w / 2), Math.round(h.y + h.h / 2)]));
  await click(arrows[1][0], arrows[1][1]);
  check('Mouse: ▶ changes a setting', await p.ev(() => Game.settings.style) === 1);
  await click(arrows[0][0], arrows[0][1]);
  await click(640, 400, 'right');
  check('Mouse: right-click goes back', await p.ev(() => Game.scene) === 'title');
  await click(640, 290 + 2 * 54 - 12);
  check('Mouse: click PRACTICE', await p.ev(() => Game.scene + '/' + Game.mode) === 'select/training');
  await click(770 + 59, 550);
  check('Mouse: click a character card', await p.ev(() => Game.sel.locked[0]));
  await click(1220, 36); await p.waitForTimeout(900);
  check('Mouse: RANDOM picks the dummy', await p.ev(() => Game.scene) === 'stage');
  await click(640, 300);
  check('Mouse: FIGHT! starts the match', await p.ev(() => Game.scene) === 'fight');
  await p.waitForTimeout(300);
  await click(640, 107);
  check('Mouse: pause button', await p.ev(() => Game.paused));
  await click(640, 210);
  check('Mouse: RESUME', !(await p.ev(() => Game.paused)));
  noErrors('Mouse', p);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const t of [cpuMatches, practice, controls, mechanics, touch, gamepad, mouse]) {
      try { await t(browser); } catch (e) { check(`${t.name}: ran to the end`, false, String(e.stack || e).split('\n').slice(0, 3).join(' ')); }
    }
  } finally { await browser.close(); }
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll browser checks passed');
  process.exit(failed ? 1 : 0);
})();
