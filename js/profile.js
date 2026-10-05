// Progression: every match earns Fight Points (FP). Spend them on costume
// colors, stages and player titles; some titles and the Void Throne stage are
// earned by playing instead. Stats (wins per fighter, best combo...) live here
// too. Everything is saved in localStorage.

const PROFILE_KEY = 'adhd-fight-profile';

// ---------------------------------------------------------------- costumes
function hexToHsl(hex) {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToHex(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
const hueShift = (hex, deg) => {
  if (typeof hex !== 'string' || hex[0] !== '#' || hex.length < 4) return hex;
  const full = hex.length === 4 ? '#' + [...hex.slice(1)].map((c) => c + c).join('') : hex;
  const [h, s, l] = hexToHsl(full);
  return hslToHex((h + deg + 360) % 360, s, l);
};
const shiftLook = (look, deg) => Object.assign({}, look, {
  primary: hueShift(look.primary, deg), secondary: hueShift(look.secondary, deg),
  pants: hueShift(look.pants, deg), accColor: hueShift(look.accColor, deg),
});

const COSTUMES = [
  { name: 'DEFAULT', cost: 0, make: (look) => look },
  { name: 'ALT COLORS', cost: 300, make: (look) => shiftLook(look, 150) },
  { name: 'SHADOW', cost: 600, make: (look) => Object.assign({}, look, { primary: '#1d1b26', secondary: '#ffd54f', pants: '#111016', accColor: '#ffd54f' }) },
];
// used when both players pick the same fighter and colors, so they can tell each other apart
const MIRROR_COSTUME = { name: 'MIRROR', make: (look) => shiftLook(look, 200) };

// ---------------------------------------------------------------- titles
const PLAYER_TITLES = [
  { id: 'newcomer', name: 'NEWCOMER', how: 'Where everyone starts', earn: () => true },
  { id: 'first', name: 'FIRST BLOOD', how: 'Win a match', earn: (p) => p.wins >= 1 },
  { id: 'brawler', name: 'BRAWLER', how: 'Win 25 matches', earn: (p) => p.wins >= 25 },
  { id: 'combo', name: 'COMBO FIEND', how: 'Land a 10-hit combo', earn: (p) => p.bestCombo >= 10 },
  { id: 'perfect', name: 'UNTOUCHABLE', how: 'Win a round without taking damage', earn: (p) => p.perfects >= 1 },
  { id: 'streak', name: 'ON FIRE', how: 'Beat the CPU 5 times in a row', earn: (p) => p.bestStreak >= 5 },
  { id: 'classic', name: 'OLD SCHOOL', how: 'Win a match in Classic style', earn: (p) => p.classicWins >= 1 },
  { id: 'hyper', name: 'HYPERACTIVE', how: 'Win a match on Hyper speed', earn: (p) => p.hyperWins >= 1 },
  { id: 'void', name: 'VOID BREAKER', how: 'Beat Arcade mode', earn: (p) => p.arcadeClears >= 1 },
  { id: 'master', name: 'GRAND MASTER', how: 'Beat Arcade with 8 different fighters', earn: (p) => Object.keys(p.arcadeBy).length >= 8 },
  { id: 'storm', name: 'STORM CALLER', cost: 500 },
  { id: 'lord', name: 'ELEMENT LORD', cost: 1500 },
  { id: 'legend', name: 'LIVING LEGEND', cost: 4000 },
];

const STAGE_UNLOCKS = [
  { name: 'Desert Ruins', cost: 800 },
  { name: 'Void Throne', cost: 2000, how: 'Beat Arcade mode, or buy it', earn: (p) => p.arcadeClears >= 1 },
];
const stageIndex = (name) => STAGES.findIndex((s) => s.name === name);

// ---------------------------------------------------------------- profile data
const Profile = {
  data: null,

  blank() {
    return {
      fp: 0, earned: 0, matches: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0,
      bestCombo: 0, bestComboDmg: 0, perfects: 0, classicWins: 0, hyperWins: 0, frames: 0,
      arcadeClears: 0, arcadeBy: {}, chars: {}, owned: {}, costume: {}, title: 'newcomer',
    };
  },
  load() {
    let d = null;
    try {
      d = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    } catch (e) { /* ignore */ }
    this.data = Object.assign(this.blank(), d || {});
    return this.data;
  },
  get() {
    return this.data || this.load();
  },
  save() {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(this.data));
    } catch (e) { /* ignore */ }
  },
  char(id) {
    const c = this.get().chars;
    return c[id] || (c[id] = { m: 0, w: 0, combo: 0, dmg: 0 });
  },

  owns(key) {
    return !!this.get().owned[key];
  },
  hasCostume(id, k) {
    return k === 0 || this.owns(`costume:${id}:${k}`);
  },
  costumeOf(id) {
    const k = this.get().costume[id] || 0;
    return this.hasCostume(id, k) ? k : 0;
  },
  nextCostume(id, k) {
    for (let i = 1; i <= COSTUMES.length; i++) {
      const n = (k + i) % COSTUMES.length;
      if (this.hasCostume(id, n)) return n;
    }
    return 0;
  },
  hasTitle(id) {
    const t = PLAYER_TITLES.find((x) => x.id === id);
    if (!t) return false;
    return t.earn ? t.earn(this.get()) : this.owns(`title:${id}`);
  },
  titleName() {
    const t = PLAYER_TITLES.find((x) => x.id === this.get().title);
    return t && this.hasTitle(t.id) ? t.name : 'NEWCOMER';
  },
  stageOpen(i) {
    const st = STAGES[i];
    if (!st || !st.unlock) return true;
    const u = STAGE_UNLOCKS.find((x) => x.name === st.name);
    return this.owns(`stage:${st.name}`) || !!(u && u.earn && u.earn(this.get()));
  },
  openStages() {
    return STAGES.map((s, i) => i).filter((i) => this.stageOpen(i));
  },

  // A fighter definition wearing a costume (k = index into COSTUMES, or MIRROR_COSTUME).
  dress(def, k) {
    const c = typeof k === 'object' ? k : COSTUMES[k || 0];
    if (!c || c === COSTUMES[0]) return def;
    return Object.assign({}, def, { look: c.make(def.look), costume: c.name });
  },

  // Everything the player has earned so far, to find what a match just unlocked.
  earnedSet() {
    const s = new Set();
    for (const t of PLAYER_TITLES) if (t.earn && this.hasTitle(t.id)) s.add(`TITLE: ${t.name}`);
    for (const u of STAGE_UNLOCKS) if (u.earn && u.earn(this.get())) s.add(`STAGE: ${u.name.toUpperCase()}`);
    return s;
  },

  // Called when a match ends. Returns { fp, unlocked: [...] } for the results screen.
  recordMatch(m, mode, settings, arcadeStage) {
    if (mode === 'watch' || mode === 'training' || !m.winner) return null;
    const p = this.get();
    const before = this.earnedSet();
    const humans = mode === 'vs' ? [0, 1] : [0];
    let fp = 0;
    for (const side of humans) {
      const f = m.f[side];
      const won = m.winner === f;
      const c = this.char(f.def.id);
      c.m++;
      if (won) c.w++;
      if ((f.bestCombo || 0) > c.combo || ((f.bestCombo || 0) === c.combo && (f.bestComboDmg || 0) > c.dmg)) {
        c.combo = f.bestCombo || 0;
        c.dmg = f.bestComboDmg || 0;
      }
      if ((f.bestCombo || 0) > p.bestCombo) {
        p.bestCombo = f.bestCombo;
        p.bestComboDmg = f.bestComboDmg || 0;
      }
      p.perfects += m.perfectRounds[side];
    }
    p.matches++;
    p.frames += m.frame;
    if (mode === 'vs') {
      fp = 60;
    } else {
      const won = m.winner === m.f[0];
      const tier = mode === 'arcade' ? Math.min(3, Math.floor((arcadeStage || 0) / 2)) : settings.level;
      fp = won ? 80 + 20 * tier + 25 * m.perfectRounds[0] : 25;
      if (won) {
        p.wins++;
        p.streak++;
        p.bestStreak = Math.max(p.bestStreak, p.streak);
        if (m.classic) p.classicWins++;
        if (settings.speed === 2) p.hyperWins++;
      } else {
        p.losses++;
        p.streak = 0;
      }
    }
    if ((m.f[0].bestCombo || 0) >= 8) fp += 15;
    return this.award(fp, before);
  },

  recordArcadeClear(a) {
    const p = this.get();
    const before = this.earnedSet();
    p.arcadeClears++;
    p.arcadeBy[a.me.id] = Math.max(p.arcadeBy[a.me.id] || 0, a.score);
    return this.award(300 + Math.floor(a.score / 100), before);
  },

  award(fp, before) {
    const p = this.get();
    p.fp += fp;
    p.earned += fp;
    const after = this.earnedSet();
    const unlocked = [...after].filter((x) => !before.has(x));
    this.save();
    return { fp, unlocked };
  },

  buy(key, cost) {
    const p = this.get();
    if (p.owned[key] || p.fp < cost) return false;
    p.fp -= cost;
    p.owned[key] = true;
    this.save();
    return true;
  },
};

// ---------------------------------------------------------------- the Profile screen
Object.assign(Game, {
  PROFILE_TABS: ['STATS', 'UNLOCKS'],

  openProfile() {
    this.prof = { tab: 0, cur: 0, msg: '', msgT: 0 };
    this.go('profile');
  },

  // Every unlockable as a row: titles, stages, then two costumes per fighter.
  unlockRows() {
    const rows = [];
    const p = Profile.get();
    for (const t of PLAYER_TITLES) {
      const owned = Profile.hasTitle(t.id);
      rows.push({
        kind: 'title', label: `TITLE: ${t.name}`, sub: t.earn ? t.how : `${t.cost} FP`, cost: t.earn ? 0 : t.cost, owned,
        earnOnly: !!t.earn, equipped: p.title === t.id, key: `title:${t.id}`, title: t,
      });
    }
    for (const u of STAGE_UNLOCKS) {
      const i = stageIndex(u.name);
      rows.push({
        kind: 'stage', label: `STAGE: ${u.name.toUpperCase()}`, sub: u.how ? `${u.how} (${u.cost} FP)` : `${u.cost} FP`,
        cost: u.cost, owned: Profile.stageOpen(i), key: `stage:${u.name}`, stage: i,
      });
    }
    for (const d of ROSTER) {
      for (let k = 1; k < COSTUMES.length; k++) {
        rows.push({
          kind: 'costume', label: `${d.name}: ${COSTUMES[k].name}`, sub: `${COSTUMES[k].cost} FP`, cost: COSTUMES[k].cost,
          owned: Profile.hasCostume(d.id, k), equipped: Profile.costumeOf(d.id) === k, key: `costume:${d.id}:${k}`, def: d, k,
        });
      }
    }
    return rows;
  },

  updateProfile(n) {
    const pr = this.prof;
    if (pr.msgT > 0) pr.msgT--;
    if (n.back) {
      SFX.play('back');
      this.go('title');
      this.cursor = this.TITLE_ITEMS.indexOf('PROFILE');
      return;
    }
    if (n.left || n.right || this.q.tab != null) {
      pr.tab = this.q.tab != null ? this.q.tab : 1 - pr.tab;
      SFX.play('select');
      return;
    }
    if (pr.tab !== 1) return;
    const rows = this.unlockRows();
    if (this.q.row != null) pr.cur = this.q.row;
    else if (n.up) pr.cur = (pr.cur + rows.length - 1) % rows.length;
    else if (n.down) pr.cur = (pr.cur + 1) % rows.length;
    if (n.up || n.down) SFX.play('select');
    if (!n.ok) return;
    const r = rows[pr.cur];
    const p = Profile.get();
    if (!r.owned) {
      if (r.earnOnly) {
        pr.msg = `Locked: ${r.sub}`;
        SFX.play('back');
      } else if (Profile.buy(r.key, r.cost)) {
        pr.msg = `Unlocked ${r.label}!`;
        SFX.play('heal');
        if (r.kind === 'title') p.title = r.title.id;
        if (r.kind === 'costume') p.costume[r.def.id] = r.k;
        Profile.save();
      } else {
        pr.msg = `Not enough FP: you need ${r.cost - p.fp} more`;
        SFX.play('back');
      }
    } else if (r.kind === 'title') {
      p.title = r.title.id;
      pr.msg = `Title set to ${r.title.name}`;
      SFX.play('confirm');
      Profile.save();
    } else if (r.kind === 'costume') {
      p.costume[r.def.id] = r.equipped ? 0 : r.k;
      pr.msg = r.equipped ? `${r.def.name}: back to default colors` : `${r.def.name} will wear ${COSTUMES[r.k].name}`;
      SFX.play('confirm');
      Profile.save();
    } else {
      pr.msg = 'Already unlocked: pick it on the stage select screen';
    }
    pr.msgT = 150;
  },

  drawProfile(ctx) {
    const pr = this.prof;
    const p = Profile.get();
    this.drawBackdrop(ctx, this.titleStage, 0.8);
    txt(ctx, 'PROFILE', VIEW_W / 2, 64, 56, '#ffd600');
    txt(ctx, `★ ${p.fp} FP`, VIEW_W - 40, 54, 30, '#ffd54f', 'right', 4);
    txt(ctx, Profile.titleName(), VIEW_W - 40, 84, 18, '#80d8ff', 'right', 3, 700, 'sans-serif');
    this.button(ctx, '◀ BACK', 20, 16, 120, 40, () => (this.mouseQ.back = true));
    this.PROFILE_TABS.forEach((name, i) => {
      const x = VIEW_W / 2 - 210 + i * 220;
      const on = pr.tab === i;
      ctx.fillStyle = on ? 'rgba(255,214,0,0.25)' : 'rgba(0,0,0,0.4)';
      ctx.fillRect(x, 90, 200, 40);
      txt(ctx, name, x + 100, 120, 26, on ? '#ffd600' : '#fff', 'center', 3);
      this.hotspot(x, 90, 200, 40, null, () => (this.mouseQ.tab = i));
    });
    if (pr.tab === 0) this.drawStats(ctx, p);
    else this.drawUnlocks(ctx, p);
    if (pr.msgT > 0) txt(ctx, pr.msg, VIEW_W / 2, 700, 20, '#b9f6ca', 'center', 3, 700, 'sans-serif');
    else txt(ctx, '←→ switch tabs   •   ↑↓ choose   •   F / Enter / click: unlock or equip   •   Esc: back', VIEW_W / 2, 700, 16, '#aaa', 'center', 3, 700, 'sans-serif');
  },

  drawStats(ctx, p) {
    const mins = Math.floor(p.frames / 3600);
    const rate = p.wins + p.losses ? Math.round((100 * p.wins) / (p.wins + p.losses)) : 0;
    const summary = [
      ['MATCHES', p.matches], ['VS CPU RECORD', `${p.wins}-${p.losses} (${rate}%)`], ['BEST STREAK', p.bestStreak],
      ['BEST COMBO', p.bestCombo ? `${p.bestCombo} hits · ${p.bestComboDmg}` : '—'], ['PERFECT ROUNDS', p.perfects],
      ['ARCADE CLEARS', p.arcadeClears], ['TIME PLAYED', `${Math.floor(mins / 60)}h ${mins % 60}m`], ['FP EARNED', p.earned],
    ];
    summary.forEach(([k, v], i) => {
      const x = 60 + (i % 4) * 300;
      const y = 172 + Math.floor(i / 4) * 52;
      txt(ctx, k, x, y, 15, '#80d8ff', 'left', 3, 700, 'sans-serif');
      txt(ctx, String(v), x, y + 24, 22, '#fff', 'left', 3, 700, 'sans-serif');
    });
    const cols = [60, 260, 420, 560, 760, 960];
    const heads = ['FIGHTER', 'WINS / MATCHES', 'WIN %', 'BEST COMBO', 'ARCADE BEST', 'COLORS'];
    heads.forEach((h, i) => txt(ctx, h, cols[i], 290, 15, '#ffd600', 'left', 3, 700, 'sans-serif'));
    ROSTER.forEach((d, i) => {
      const c = p.chars[d.id] || { m: 0, w: 0, combo: 0, dmg: 0 };
      const y = 316 + i * 23;
      const vals = [d.name, `${c.w} / ${c.m}`, c.m ? `${Math.round((100 * c.w) / c.m)}%` : '—', c.combo ? `${c.combo} · ${c.dmg}` : '—',
        p.arcadeBy[d.id] ? String(p.arcadeBy[d.id]) : '—', COSTUMES.filter((x, k) => Profile.hasCostume(d.id, k)).length + ' / ' + COSTUMES.length];
      vals.forEach((v, k) => txt(ctx, v, cols[k], y, 17, k === 0 ? d.color : '#fff', 'left', 3, 700, 'sans-serif'));
    });
  },

  drawUnlocks(ctx, p) {
    const pr = this.prof;
    const rows = this.unlockRows();
    pr.cur = Math.min(pr.cur, rows.length - 1);
    const visible = 13;
    const start = U.clamp(pr.cur - 6, 0, Math.max(0, rows.length - visible));
    for (let i = start; i < Math.min(rows.length, start + visible); i++) {
      const r = rows[i];
      const y = 150 + (i - start) * 40;
      const on = i === pr.cur;
      ctx.fillStyle = on ? 'rgba(255,214,0,0.22)' : 'rgba(0,0,0,0.35)';
      ctx.fillRect(40, y, 700, 36);
      txt(ctx, r.label, 54, y + 25, 19, r.owned ? '#fff' : '#bbb', 'left', 3, 700, 'sans-serif');
      const state = r.equipped ? 'EQUIPPED' : r.owned ? (r.kind === 'stage' ? 'UNLOCKED' : 'OWNED') : r.earnOnly ? 'LOCKED' : `${r.cost} FP`;
      const sc = r.equipped ? '#69f0ae' : r.owned ? '#80d8ff' : r.earnOnly ? '#ff8a80' : p.fp >= r.cost ? '#ffd54f' : '#9e9e9e';
      txt(ctx, state, 726, y + 25, 18, sc, 'right', 3, 700, 'sans-serif');
      this.hotspot(40, y, 700, 36, () => {
        if (pr.cur === i) return false;
        pr.cur = i;
        return true;
      }, () => Object.assign(this.mouseQ, { row: i, ok: true }));
    }
    if (start > 0) txt(ctx, '▲', 390, 146, 16, '#fff', 'center', 2);
    if (start + visible < rows.length) txt(ctx, '▼', 390, 682, 16, '#fff', 'center', 2);
    // preview
    const r = rows[pr.cur];
    const px = 1000;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(770, 150, 470, 516);
    if (r.kind === 'costume') {
      const def = Profile.dress(r.def, r.k);
      glow(ctx, px, 460, 170, def.color, 0.3);
      drawFigure(ctx, def, victoryPose(def, this.t), px, 600, 1, 1.7 / def.size * (0.85 + def.size * 0.15), { t: this.t });
      txt(ctx, r.label, px, 200, 26, def.color, 'center', 4);
    } else if (r.kind === 'stage') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(780, 220, 450, 260);
      ctx.clip();
      ctx.translate(780, 220);
      ctx.scale(450 / VIEW_W, 260 / VIEW_H);
      const st = STAGES[r.stage];
      st.draw(ctx, { x: 1100 + Math.sin(this.t * 0.003) * 400, y: 0, zoom: 1 }, GROUND_Y, this.t, VIEW_W, VIEW_H);
      ctx.fillStyle = st.floor;
      ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
      ctx.restore();
      txt(ctx, STAGES[r.stage].name.toUpperCase(), px, 200, 26, '#fff', 'center', 4);
      if (!r.owned) txt(ctx, 'LOCKED', px, 370, 48, 'rgba(255,255,255,0.8)', 'center', 6);
    } else {
      txt(ctx, 'PLAYER TITLE', px, 260, 20, '#80d8ff', 'center', 3, 700, 'sans-serif');
      txt(ctx, r.title.name, px, 330, 40, r.owned ? '#ffd600' : '#9e9e9e', 'center', 5);
      txt(ctx, 'Shown on the title and results screens', px, 380, 16, '#ccc', 'center', 3, 700, 'sans-serif');
    }
    txt(ctx, r.sub, px, 630, 18, '#fff', 'center', 3, 700, 'sans-serif');
    const act = r.owned ? (r.kind === 'stage' ? '' : r.equipped ? (r.kind === 'costume' ? 'Click / Enter: back to default' : '') : 'Click / Enter: equip') : r.earnOnly ? '' : 'Click / Enter: unlock';
    if (act) txt(ctx, act, px, 655, 15, '#aaa', 'center', 3, 700, 'sans-serif');
  },

  // ------------------------------------------------------------ pop-up notices
  toast(text, color = '#ffd600') {
    (this.toasts || (this.toasts = [])).push({ text, color, t: 0 });
  },
  drawToasts(ctx) {
    if (!this.toasts || !this.toasts.length) return;
    const tt = this.toasts[0];
    tt.t++;
    const a = Math.min(1, tt.t / 10, (200 - tt.t) / 20);
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(VIEW_W / 2 - 300, 8, 600, 44);
    ctx.strokeStyle = tt.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(VIEW_W / 2 - 300, 8, 600, 44);
    txt(ctx, tt.text, VIEW_W / 2, 38, 22, tt.color, 'center', 3);
    ctx.globalAlpha = 1;
    if (tt.t > 200) this.toasts.shift();
  },
  onArcadeClear(a) {
    this.arcadeReward = Profile.recordArcadeClear(a);
    this.showReward(this.arcadeReward);
  },
  showReward(r) {
    this.lastReward = r;
    if (!r) return;
    for (const u of r.unlocked) this.toast(`UNLOCKED ${u}`, '#69f0ae');
  },
});
