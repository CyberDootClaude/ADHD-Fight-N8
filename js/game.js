// Scenes (title, settings, select, stage, fight, results) and the main loop.
const FONT = "Impact, 'Arial Black', sans-serif";

function txt(ctx, s, x, y, size, color = '#fff', align = 'center', stroke = 5, weight = 900, font = FONT) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  if (stroke) {
    ctx.lineWidth = stroke;
    ctx.strokeStyle = '#000';
    ctx.lineJoin = 'round';
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

const SPEEDS = [
  { name: 'FAST', v: 1.0 },
  { name: 'TURBO', v: 1.2 },
  { name: 'HYPER', v: 1.4 },
];
const LEVELS = ['easy', 'normal', 'hard'];
const PRACTICE_ROWS = [
  ['DUMMY ACTION', 'dummy', DUMMY_ACTIONS],
  ['DUMMY GUARD', 'guard', DUMMY_GUARDS],
  ['COUNTERATTACK', 'reversal', DUMMY_REVERSALS],
  ['HEALTH', 'health', ['AUTO REFILL', 'NO REFILL']],
  ['SUPER METER', 'meter', ['ALWAYS FULL', 'NORMAL']],
  ['SPECIAL COOLDOWNS', 'cooldowns', ['OFF', 'NORMAL']],
  ['START POSITION', 'position', PRACTICE_POSITIONS],
  ['HITBOXES', 'hitboxes', ['OFF', 'ON']],
  ['INPUT HISTORY', 'inputs', ['OFF', 'ON']],
  ['ATTACK DATA', 'data', ['OFF', 'ON']],
];
const ROUNDS = [1, 2, 3];

const Game = {
  scene: 'title',
  t: 0,
  debug: /debug/.test(location.search),
  settings: { speed: 0, level: 1, rounds: 1, sound: true },
  practice: { dummy: 0, guard: 0, reversal: 0, health: 0, meter: 0, cooldowns: 1, position: 0, hitboxes: 0, inputs: 1, data: 1 },
  menuIn: new PlayerInput(),
  inputs: [new PlayerInput(), new PlayerInput()],
  holds: [{}, {}, {}],
  cursor: 0,
  mode: 'cpu',

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    try {
      Object.assign(this.settings, JSON.parse(localStorage.getItem('adhd-fight-settings') || '{}'));
      Object.assign(this.practice, JSON.parse(localStorage.getItem('adhd-fight-practice') || '{}'));
    } catch (e) { /* ignore */ }
    for (const [, key, opts] of PRACTICE_ROWS) {
      const v = this.practice[key];
      if (!Number.isInteger(v) || v < 0 || v >= opts.length) this.practice[key] = 0;
    }
    SFX.enabled = this.settings.sound;
    Keys.init();
    Touch.init();
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') this.debug = !this.debug;
    });
    this.canvas.addEventListener('pointerdown', () => SFX.init());
    this.titleStage = U.randi(0, STAGES.length - 1);
  },

  saveSettings() {
    try {
      localStorage.setItem('adhd-fight-settings', JSON.stringify(this.settings));
      localStorage.setItem('adhd-fight-practice', JSON.stringify(this.practice));
    } catch (e) { /* ignore */ }
  },

  speed() {
    return this.scene === 'fight' ? SPEEDS[this.settings.speed].v : 1;
  },

  nav(inp, hold) {
    const r = {};
    for (const d of ['up', 'down', 'left', 'right']) {
      if (inp.held[d]) {
        hold[d] = (hold[d] || 0) + 1;
        r[d] = hold[d] === 1 || (hold[d] > 18 && hold[d] % 5 === 0);
      } else hold[d] = 0;
    }
    r.ok = inp.edge.L || inp.edge.start || inp.edge.jump;
    // keyboard: Heavy = back, Special = random. Gamepad: B = back, Y = random.
    r.back = inp.edge.esc || inp.edge.padBack || (inp.edge.H && !inp.held.padAlt);
    r.rand = inp.edge.padAlt || (inp.edge.S && !inp.held.padBack);
    return r;
  },

  go(scene) {
    this.scene = scene;
    this.cursor = 0;
    this.sceneT = 0;
  },

  // ------------------------------------------------------------ update
  update() {
    this.t++;
    this.sceneT = (this.sceneT || 0) + 1;
    const raw = rawForPlayer(0, true, true);
    // Arrow keys, Enter and Escape always work in menus, whatever the key bindings are.
    const inMenu = this.scene !== 'fight' || this.paused;
    if (inMenu) {
      if (Keys.isDown('ArrowUp')) raw.up = true;
      if (Keys.isDown('ArrowDown')) raw.down = true;
      if (Keys.isDown('ArrowLeft')) raw.left = true;
      if (Keys.isDown('ArrowRight')) raw.right = true;
      if (Keys.isDown('Enter')) raw.start = true;
    }
    if (Keys.isDown('Escape')) raw.esc = true;
    this.menuIn.update(raw);
    const n = this.nav(this.menuIn, this.holds[2]);
    if (Keys.capture) return; // waiting for a key on the Controls screen
    switch (this.scene) {
      case 'title': return this.updateTitle(n);
      case 'settings': return this.updateSettings(n);
      case 'controls': return this.updateControls(n, () => {
        this.go('settings');
        this.cursor = 4;
      });
      case 'howto':
        if (n.ok || n.back) {
          SFX.play('back');
          this.go('title');
          this.cursor = 5;
        }
        return;
      case 'select': return this.updateSelect(n);
      case 'stage': return this.updateStage(n);
      case 'fight': return this.updateFight(n);
      case 'results': return this.updateResults(n);
    }
  },

  menuMove(n, count) {
    if (n.up) {
      this.cursor = (this.cursor + count - 1) % count;
      SFX.play('select');
    }
    if (n.down) {
      this.cursor = (this.cursor + 1) % count;
      SFX.play('select');
    }
  },

  TITLE_ITEMS: ['VS CPU', '2 PLAYERS', 'PRACTICE', 'CPU vs CPU', 'SETTINGS', 'HOW TO PLAY'],

  updateTitle(n) {
    this.menuMove(n, this.TITLE_ITEMS.length);
    if (!n.ok) return;
    SFX.init();
    SFX.play('confirm');
    const c = this.cursor;
    if (c <= 3) {
      this.mode = ['cpu', 'vs', 'training', 'watch'][c];
      this.startSelect();
    } else if (c === 4) this.go('settings');
    else this.go('howto');
  },

  SETTINGS_ITEMS: ['GAME SPEED', 'CPU LEVEL', 'ROUNDS TO WIN', 'SOUND', 'CONTROLS', 'BACK'],

  updateSettings(n) {
    this.menuMove(n, this.SETTINGS_ITEMS.length);
    const s = this.settings;
    const d = n.left ? -1 : n.right ? 1 : n.ok && this.cursor < 4 ? 1 : 0;
    if (d) {
      SFX.play('select');
      if (this.cursor === 0) s.speed = (s.speed + d + SPEEDS.length) % SPEEDS.length;
      if (this.cursor === 1) s.level = (s.level + d + LEVELS.length) % LEVELS.length;
      if (this.cursor === 2) s.rounds = (s.rounds + d + ROUNDS.length) % ROUNDS.length;
      if (this.cursor === 3) {
        s.sound = !s.sound;
        SFX.enabled = s.sound;
      }
      this.saveSettings();
    }
    if (n.ok && this.cursor === 4) {
      SFX.play('confirm');
      this.openControls();
      this.go('controls');
      return;
    }
    if (n.back || (n.ok && this.cursor === 5)) {
      SFX.play('back');
      this.go('title');
      this.cursor = 4;
    }
  },

  // ------------------------------------------------------------ character select
  startSelect() {
    this.go('select');
    this.sel = { cur: [0, 1], locked: [false, false], phase: 0, done: 0 };
    if (this.lastPicks) this.sel.cur = this.lastPicks.slice();
  },

  updateSelect(n) {
    const s = this.sel;
    const cols = 8;
    const moveCur = (p, nv) => {
      const c = s.cur[p];
      let x = c % cols;
      let y = Math.floor(c / cols);
      if (nv.left) x = (x + cols - 1) % cols;
      if (nv.right) x = (x + 1) % cols;
      if (nv.up || nv.down) y = 1 - y;
      const nc = y * cols + x;
      if (nc !== c) {
        s.cur[p] = nc;
        SFX.play('select');
      }
    };
    const lock = (p, random) => {
      if (random) s.cur[p] = U.randi(0, ROSTER.length - 1);
      s.locked[p] = true;
      SFX.play('confirm');
    };
    if (s.done > 0) {
      if (++s.done > 40) {
        this.lastPicks = s.cur.slice();
        this.go('stage');
        this.stageIdx = U.randi(0, STAGES.length - 1);
      }
      return;
    }
    if (this.mode === 'vs') {
      for (let p = 0; p < 2; p++) {
        this.inputs[p].update(rawForPlayer(p, false));
        const nv = this.nav(this.inputs[p], this.holds[p]);
        if (!s.locked[p]) {
          moveCur(p, nv);
          if (nv.ok || nv.rand) lock(p, nv.rand);
          else if (nv.back && p === 0) {
            SFX.play('back');
            return this.go('title');
          }
        } else if (nv.back) {
          s.locked[p] = false;
          SFX.play('back');
        }
      }
      if (s.locked[0] && s.locked[1]) s.done = 1;
      return;
    }
    const p = s.phase;
    moveCur(p, n);
    if (n.ok || n.rand) {
      lock(p, n.rand);
      if (p === 0) {
        s.phase = 1;
        if (s.cur[1] === s.cur[0]) s.cur[1] = (s.cur[0] + 1) % ROSTER.length;
      } else s.done = 1;
    } else if (n.back) {
      SFX.play('back');
      if (p === 1) {
        s.phase = 0;
        s.locked[0] = false;
      } else this.go('title');
    }
  },

  updateStage(n) {
    if (n.left) {
      this.stageIdx = (this.stageIdx + STAGES.length - 1) % STAGES.length;
      SFX.play('select');
    }
    if (n.right) {
      this.stageIdx = (this.stageIdx + 1) % STAGES.length;
      SFX.play('select');
    }
    if (n.ok) {
      SFX.play('confirm');
      this.startMatch();
    }
    if (n.back) {
      SFX.play('back');
      this.startSelect();
    }
  },

  startMatch() {
    const lvl = LEVELS[this.settings.level];
    const ai = [null, null];
    if (this.mode === 'cpu') ai[1] = new AIController(lvl);
    if (this.mode === 'training') ai[1] = makePracticeAI(this.practice);
    if (this.mode === 'watch') {
      ai[0] = new AIController(lvl);
      ai[1] = new AIController(lvl);
    }
    this.inputs = [new PlayerInput(), new PlayerInput()];
    this.match = new Match({
      defs: [ROSTER[this.lastPicks[0]], ROSTER[this.lastPicks[1]]],
      stage: this.stageIdx,
      inputs: this.inputs,
      ai,
      practice: this.mode === 'training' ? this.practice : null,
      winsNeeded: ROUNDS[this.settings.rounds],
      mergeKeys: this.mode !== 'vs',
    });
    this.paused = false;
    this.pauseView = null;
    this.go('fight');
  },

  // ------------------------------------------------------------ fight
  pauseItems() {
    return this.mode === 'training'
      ? ['RESUME', 'PRACTICE SETTINGS', 'RESET POSITION', 'MOVE LIST', 'CONTROLS', 'CHARACTER SELECT', 'MAIN MENU']
      : ['RESUME', 'MOVE LIST', 'CONTROLS', 'RESTART', 'CHARACTER SELECT', 'MAIN MENU'];
  },

  updateFight(n) {
    const m = this.match;
    if (this.paused) {
      if (this.pauseView === 'moves') {
        if (n.ok || n.back) {
          this.pauseView = null;
          SFX.play('back');
        }
        return;
      }
      if (this.pauseView === 'practice') return this.updatePracticeMenu(n);
      if (this.pauseView === 'controls') {
        return this.updateControls(n, () => {
          this.pauseView = null;
          this.cursor = this.pauseItems().indexOf('CONTROLS');
        });
      }
      const items = this.pauseItems();
      this.menuMove(n, items.length);
      // Enter/Start confirm the highlighted item; Esc (or the Back button) resumes.
      if (n.back) {
        this.paused = false;
        return;
      }
      if (n.ok) {
        SFX.play('confirm');
        switch (items[this.cursor]) {
          case 'RESUME': this.paused = false; break;
          case 'PRACTICE SETTINGS':
            this.pauseView = 'practice';
            this.pcursor = 0;
            break;
          case 'RESET POSITION':
            m.resetPositions();
            this.paused = false;
            break;
          case 'MOVE LIST': this.pauseView = 'moves'; break;
          case 'CONTROLS':
            this.openControls();
            this.pauseView = 'controls';
            break;
          case 'RESTART': this.startMatch(); break;
          case 'CHARACTER SELECT': this.startSelect(); break;
          case 'MAIN MENU': this.go('title'); break;
        }
      }
      return;
    }
    if (this.menuIn.edge.start || this.menuIn.edge.esc) {
      this.paused = true;
      this.pauseView = null;
      this.cursor = 0;
      this.sceneT = 0;
      SFX.play('select');
      return;
    }
    m.tick();
    if (m.over) {
      this.go('results');
      this.resultsWinner = m.winner;
    }
  },

  // ------------------------------------------------------------ practice settings
  updatePracticeMenu(n) {
    const rows = PRACTICE_ROWS.length + 2; // + RESET POSITION + BACK
    const c = this.pcursor || 0;
    if (n.up) this.pcursor = (c + rows - 1) % rows;
    if (n.down) this.pcursor = (c + 1) % rows;
    if (n.up || n.down) SFX.play('select');
    const cur = this.pcursor || 0;
    const m = this.match;
    const p = this.practice;
    if (cur < PRACTICE_ROWS.length) {
      const [, key, opts] = PRACTICE_ROWS[cur];
      const d = n.left ? -1 : n.right || n.ok ? 1 : 0;
      if (d) {
        p[key] = (p[key] + d + opts.length) % opts.length;
        SFX.play('select');
        this.saveSettings();
        if (key === 'dummy') m.ai[1] = makePracticeAI(p);
        if (key === 'dummy' || key === 'guard' || key === 'reversal') {
          if (m.ai[1] instanceof DummyController) m.ai[1].p = p;
        }
        if (key === 'position') m.resetPositions();
      }
    } else if (n.ok) {
      SFX.play('confirm');
      if (cur === PRACTICE_ROWS.length) {
        m.resetPositions();
        this.paused = false;
      }
      this.pauseView = null;
      this.cursor = 1;
      return;
    }
    if (n.back) {
      SFX.play('back');
      this.pauseView = null;
      this.cursor = 1;
    }
  },

  drawPracticeMenu(ctx) {
    txt(ctx, 'PRACTICE SETTINGS', VIEW_W / 2, 70, 52, '#69f0ae');
    const p = this.practice;
    const cur = this.pcursor || 0;
    const rows = PRACTICE_ROWS.map(([label, key, opts]) => [label, opts[p[key]]]).concat([['RESET POSITION', null], ['BACK', null]]);
    rows.forEach(([label, val], i) => {
      const y = 128 + i * 42;
      const sel = i === cur;
      if (sel) {
        ctx.fillStyle = 'rgba(105,240,174,0.18)';
        ctx.fillRect(250, y - 29, 780, 38);
        ctx.fillStyle = '#69f0ae';
        ctx.fillRect(250, y - 29, 5, 38);
      }
      const col = sel ? '#69f0ae' : '#ffffff';
      if (val == null) {
        txt(ctx, label, VIEW_W / 2, y, sel ? 26 : 24, col, 'center', 4);
      } else {
        txt(ctx, label, 280, y, sel ? 24 : 22, col, 'left', 4);
        txt(ctx, sel ? `◀  ${val}  ▶` : val, 1000, y, sel ? 24 : 22, sel ? '#ffd600' : '#e0e0e0', 'right', 4);
      }
    });
    const tips = {
      dummy: 'What the dummy does. CPU levels make it fight back (it still can\'t knock you out).',
      guard: 'ALL blocks everything. AFTER FIRST HIT blocks once your combo drops, to test if it was real.',
      reversal: 'Attack the dummy does the moment it can act after blocking, getting hit or getting up.',
      health: 'Refill health for both fighters shortly after each combo ends.',
      meter: 'Keep your super meter full so you can practice supers.',
      cooldowns: 'Turn special-move cooldowns off to practice specials back to back.',
      position: 'Where both fighters start when you reset.',
      hitboxes: 'Show hurtboxes (green), attack hitboxes (red) and projectiles (yellow).',
      inputs: 'Show your recent inputs on the left side of the screen.',
      data: 'Show damage, combo count and frame advantage for your last attack.',
    };
    const k = PRACTICE_ROWS[cur] ? PRACTICE_ROWS[cur][1] : null;
    txt(ctx, k ? tips[k] : `Tip: press ${Keybinds.text(0, 'reset')} during practice to reset positions instantly.`, VIEW_W / 2, 682, 17, '#b3e5fc', 'center', 3, 700, 'sans-serif');
    txt(ctx, '↑↓ choose   •   ←→ change   •   Esc: back', VIEW_W / 2, 710, 14, '#9e9e9e', 'center', 0, 700, 'sans-serif');
  },

  // ------------------------------------------------------------ key remapping
  openControls() {
    this.ctl = { row: 0, col: 0, msg: '', msgT: 0 };
  },

  updateControls(n, exit) {
    const c = this.ctl;
    const rows = REMAPPABLE.length + 2; // + RESET TO DEFAULTS + BACK
    if (c.msgT > 0) c.msgT--;
    if (n.up) c.row = (c.row + rows - 1) % rows;
    if (n.down) c.row = (c.row + 1) % rows;
    if (n.left || n.right) c.col = 1 - c.col;
    if (n.up || n.down || n.left || n.right) SFX.play('select');
    if (n.back) {
      SFX.play('back');
      exit();
      return;
    }
    if (!n.ok) return;
    if (c.row === REMAPPABLE.length) {
      Keybinds.resetDefaults();
      c.msg = 'All controls reset to defaults.';
      c.msgT = 180;
      SFX.play('confirm');
      return;
    }
    if (c.row === REMAPPABLE.length + 1) {
      SFX.play('back');
      exit();
      return;
    }
    const [action, label] = REMAPPABLE[c.row];
    const player = c.col;
    SFX.play('confirm');
    c.waiting = true;
    Keys.capture = (code) => {
      Keys.capture = null;
      c.waiting = false;
      c.msgT = 200;
      if (code === 'Escape') {
        c.msg = 'Cancelled.';
        return;
      }
      if (RESERVED_KEYS.has(code)) {
        c.msg = `${Keybinds.label(code)} is reserved and can't be bound.`;
        SFX.play('back');
        return;
      }
      const taken = Keybinds.bind(player, action, code);
      const name = (b) => (REMAPPABLE.find(([a]) => a === b) || [b, b.toUpperCase()])[1];
      c.msg = `P${player + 1} ${label} = ${Keybinds.label(code)}` + (taken.length ? `  (removed from ${taken.map(([pp, b]) => `P${pp + 1} ${name(b)}`).join(', ')})` : '');
      SFX.play('confirm');
    };
  },

  drawControls(ctx) {
    const c = this.ctl;
    txt(ctx, 'CONTROLS', VIEW_W / 2, 64, 52, '#ffd600');
    const colX = [640, 960];
    txt(ctx, 'PLAYER 1', colX[0], 108, 24, '#2979ff', 'center', 4);
    txt(ctx, 'PLAYER 2', colX[1], 108, 24, '#ff1744', 'center', 4);
    const rows = REMAPPABLE.map(([a, l]) => [a, l]).concat([[null, 'RESET TO DEFAULTS'], [null, 'BACK']]);
    rows.forEach(([action, label], i) => {
      const y = 146 + i * 36;
      const sel = i === c.row;
      if (!action) {
        if (sel) {
          ctx.fillStyle = 'rgba(255,214,0,0.18)';
          ctx.fillRect(460, y - 26, 360, 34);
        }
        txt(ctx, label, VIEW_W / 2, y, 22, sel ? '#ffd600' : '#fff', 'center', 4);
        return;
      }
      txt(ctx, label, 200, y, 20, sel ? '#ffd600' : '#cfd8dc', 'left', 4);
      for (let p = 0; p < 2; p++) {
        const on = sel && c.col === p;
        if (on) {
          ctx.fillStyle = c.waiting ? 'rgba(255,82,82,0.35)' : 'rgba(255,214,0,0.25)';
          ctx.fillRect(colX[p] - 140, y - 25, 280, 32);
          ctx.strokeStyle = c.waiting ? '#ff5252' : '#ffd600';
          ctx.lineWidth = 2;
          ctx.strokeRect(colX[p] - 140, y - 25, 280, 32);
        }
        const t = on && c.waiting ? 'PRESS A KEY…' : Keybinds.text(p, action);
        txt(ctx, t, colX[p], y, 20, t === '—' ? '#ff5252' : on ? '#ffffff' : '#e0e0e0', 'center', 3, 700, 'sans-serif');
      }
    });
    if (c.msgT > 0) txt(ctx, c.msg, VIEW_W / 2, 668, 18, '#b9f6ca', 'center', 3, 700, 'sans-serif');
    const hint = c.waiting ? 'Press the new key, or Esc to cancel' : '↑↓ choose   •   ←→ switch player   •   F / Enter: change key   •   Esc: back';
    txt(ctx, hint, VIEW_W / 2, 702, 16, '#aaa', 'center', 3, 700, 'sans-serif');
  },

  RESULT_ITEMS: ['REMATCH', 'CHARACTER SELECT', 'MAIN MENU'],

  updateResults(n) {
    if (this.sceneT < 30) return;
    this.menuMove(n, this.RESULT_ITEMS.length);
    if (n.ok) {
      SFX.play('confirm');
      if (this.cursor === 0) this.startMatch();
      else if (this.cursor === 1) this.startSelect();
      else this.go('title');
    }
  },

  // ------------------------------------------------------------ draw
  draw() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    switch (this.scene) {
      case 'title': this.drawTitle(ctx); break;
      case 'settings': this.drawSettings(ctx); break;
      case 'controls':
        this.drawBackdrop(ctx, this.titleStage, 0.75);
        this.drawControls(ctx);
        break;
      case 'howto': this.drawHowTo(ctx); break;
      case 'select': this.drawSelect(ctx); break;
      case 'stage': this.drawStage(ctx); break;
      case 'fight':
        this.match.draw(ctx);
        if (this.paused) this.drawPause(ctx);
        break;
      case 'results': this.drawResults(ctx); break;
    }
  },

  drawBackdrop(ctx, stageIdx, dim = 0.35) {
    const t = this.t;
    const cam = { x: 1100 + Math.sin(t * 0.003) * 400, y: 0, zoom: 1 };
    STAGES[stageIdx].draw(ctx, cam, GROUND_Y, t, VIEW_W, VIEW_H);
    ctx.fillStyle = STAGES[stageIdx].floor;
    ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
    ctx.fillStyle = STAGES[stageIdx].floorLine;
    ctx.fillRect(0, GROUND_Y, VIEW_W, 5);
    if (dim) {
      ctx.fillStyle = `rgba(0,0,0,${dim})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  },

  drawMenu(ctx, items, x, y, values) {
    items.forEach((it, i) => {
      const sel = i === this.cursor;
      const yy = y + i * 54;
      if (sel) {
        ctx.fillStyle = 'rgba(255,214,0,0.2)';
        ctx.fillRect(x - 260, yy - 38, 520, 50);
        ctx.fillStyle = '#ffd600';
        ctx.fillRect(x - 260, yy - 38, 6, 50);
      }
      const label = values && values[i] != null ? `${it}:  ◀ ${values[i]} ▶` : it;
      txt(ctx, label, x, yy, sel ? 38 : 32, sel ? '#ffd600' : '#ffffff', 'center', 5);
    });
  },

  drawTitle(ctx) {
    const t = this.t;
    this.drawBackdrop(ctx, this.titleStage, 0.25);
    // showcase fighters
    for (let k = 0; k < 6; k++) {
      const def = ROSTER[(k + Math.floor(t / 300) * 6) % ROSTER.length];
      const x = 110 + k * 212;
      const p = JSON.parse(JSON.stringify(POSES.idle));
      const b = Math.sin(t * 0.1 + k);
      p.lean += b * 2;
      p.fa[0] += b * 6;
      drawFigure(ctx, def, p, x, GROUND_Y, k < 3 ? 1 : -1, 1.05, { t: t + k * 10 });
    }
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // logo
    const wob = Math.sin(t * 0.05) * 3;
    ctx.save();
    ctx.translate(VIEW_W / 2, 140 + wob);
    ctx.rotate(-0.03);
    txt(ctx, 'ADHD FIGHT N8', 6, 6, 110, 'rgba(0,0,0,0.5)', 'center', 0);
    const gr = ctx.createLinearGradient(0, -90, 0, 20);
    gr.addColorStop(0, '#fff176');
    gr.addColorStop(0.5, '#ff9100');
    gr.addColorStop(1, '#d50000');
    ctx.font = `900 110px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#000';
    ctx.strokeText('ADHD FIGHT N8', 0, 0);
    ctx.fillStyle = gr;
    ctx.fillText('ADHD FIGHT N8', 0, 0);
    txt(ctx, `ELEMENTAL ARENA BRAWLER  •  ${ROSTER.length} FIGHTERS  •  NO WAITING AROUND`, 0, 46, 22, '#80d8ff', 'center', 4, 700, 'sans-serif');
    ctx.restore();
    this.drawMenu(ctx, this.TITLE_ITEMS, VIEW_W / 2, 290);
    txt(ctx, '↑↓ choose   •   F / Enter / Ⓧ confirm   •   ` toggles hitboxes', VIEW_W / 2, VIEW_H - 24, 18, '#ddd', 'center', 3, 700, 'sans-serif');
  },

  drawSettings(ctx) {
    this.drawBackdrop(ctx, this.titleStage, 0.6);
    txt(ctx, 'SETTINGS', VIEW_W / 2, 110, 72, '#ffd600');
    const s = this.settings;
    this.drawMenu(ctx, this.SETTINGS_ITEMS, VIEW_W / 2, 230, [
      SPEEDS[s.speed].name, LEVELS[s.level].toUpperCase(), ROUNDS[s.rounds], s.sound ? 'ON' : 'OFF', null, null,
    ]);
    const tips = [
      'FAST is already quick. TURBO and HYPER speed the whole game up even more.',
      'How smart and aggressive the CPU plays.',
      'Rounds needed to win a match.',
      'Sound effects on or off.',
      'Change the keyboard keys for Player 1 and Player 2.',
      '',
    ];
    txt(ctx, tips[this.cursor], VIEW_W / 2, 560, 22, '#b3e5fc', 'center', 3, 700, 'sans-serif');
  },

  drawHowTo(ctx) {
    this.drawBackdrop(ctx, this.titleStage, 0.75);
    txt(ctx, 'HOW TO PLAY', VIEW_W / 2, 80, 64, '#ffd600');
    const k = (p, ...acts) => acts.map((a) => Keybinds.text(p, a)).join(' ');
    const rows = [
      ['', 'PLAYER 1', 'PLAYER 2', 'GAMEPAD'],
      ['Up / Left / Down / Right', k(0, 'up', 'left', 'down', 'right'), k(1, 'up', 'left', 'down', 'right'), 'D-pad / Stick'],
      ['Light attack', k(0, 'L'), k(1, 'L'), 'X / □'],
      ['Heavy attack', k(0, 'H'), k(1, 'H'), 'Y / △'],
      ['Special', k(0, 'S'), k(1, 'S'), 'B / ○'],
      ['Flow stance', k(0, 'FL'), k(1, 'FL'), 'RB / R1'],
      ['Dash', k(0, 'D'), k(1, 'D'), 'LB / L1'],
      ['Super (full meter)', k(0, 'SU'), k(1, 'SU'), 'LT / RT'],
      ['Pause', `Esc / ${k(0, 'start')}`, `BKSP / ${k(1, 'start')}`, 'Start'],
    ];
    const cx = [150, 470, 720, 990];
    rows.forEach((r, i) => {
      const y = 140 + i * 34;
      r.forEach((c, j) => txt(ctx, c, cx[j], y, i === 0 ? 22 : 20, i === 0 ? '#80d8ff' : j === 0 ? '#ffd600' : '#fff', j === 0 ? 'left' : 'center', 3, 700, 'sans-serif'));
    });
    const tips = [
      'SPECIALS: Special alone, or with → / ↑ / ↓ held — every fighter has 4 unique ones plus a Super.',
      'Heavy + ↑ = launcher (then jump to chase), Heavy + ↓ = sweep, Heavy in the air = spike.',
      'Light attacks chain: tap Light 3 times. Cancel any hit into Heavy, Special, Super, Jump or Dash.',
      'Double-tap a direction (or press Dash) to dash. Hold Dash to keep running. Dash works in the air too.',
      'BLOCK by holding AWAY (back). LOWS (sweeps, slides, ground waves) need DOWN-BACK. Jump-in attacks need a standing block.',
      'FLOW: press Flow for Flow Stance (1/4 meter). Anything that hits you in it is evaded, and your next hit is a Flow Counter.',
      'A whiffed Flow has a punishable recovery. Holding back is free and safe; Flow is the high-risk, high-reward option.',
      'Blocking too much shatters your guard! Build meter by fighting, then unleash your SUPER when the bar flashes.',
    ];
    tips.forEach((l, i) => txt(ctx, l, VIEW_W / 2, 468 + i * 29, 16, i >= 4 && i <= 6 ? '#b3e5fc' : '#fff', 'center', 3, 700, 'sans-serif'));
    txt(ctx, 'Change keys in Settings → Controls   •   Press any button to go back', VIEW_W / 2, VIEW_H - 18, 18, '#aaa', 'center', 3, 700, 'sans-serif');
  },

  drawSelect(ctx) {
    const t = this.t;
    const s = this.sel;
    const gr = ctx.createLinearGradient(0, 0, VIEW_W, VIEW_H);
    gr.addColorStop(0, '#0d0221');
    gr.addColorStop(1, '#2b0f54');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = -10; i < 30; i++) {
      const x = i * 80 + ((t * 1.5) % 80);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 40, 0);
      ctx.lineTo(x - 260, VIEW_H);
      ctx.lineTo(x - 300, VIEW_H);
      ctx.fill();
    }
    const heading = this.mode === 'vs' ? 'CHOOSE YOUR FIGHTERS' : s.phase === 0 ? 'CHOOSE YOUR FIGHTER' : this.mode === 'training' ? 'CHOOSE PRACTICE DUMMY' : 'CHOOSE YOUR OPPONENT';
    txt(ctx, heading, VIEW_W / 2, 50, 40, '#ffd600');

    const labels = this.mode === 'vs' ? ['P1', 'P2'] : this.mode === 'watch' ? ['CPU 1', 'CPU 2'] : this.mode === 'training' ? ['P1', 'DUMMY'] : ['P1', 'CPU'];
    const pcol = ['#2979ff', '#ff1744'];
    for (let p = 0; p < 2; p++) {
      const show = this.mode === 'vs' || p <= s.phase || s.locked[p];
      if (!show) continue;
      const def = ROSTER[s.cur[p]];
      const fx = p === 0 ? 190 : VIEW_W - 190;
      // pedestal glow
      glow(ctx, fx, 440, 170, def.color, 0.35);
      const pose = JSON.parse(JSON.stringify(s.locked[p] ? POSES.victory : POSES.idle));
      const b = Math.sin(t * 0.1);
      pose.lean += b * 2;
      pose.fa[0] += s.locked[p] ? Math.sin(t * 0.2) * 8 : b * 5;
      drawFigure(ctx, def, pose, fx, 450, p === 0 ? 1 : -1, 2.0 / def.size * (0.85 + def.size * 0.15), { t });
      txt(ctx, labels[p], fx, 480, 26, pcol[p], 'center', 4);
      // info panel
      const ix = p === 0 ? 350 : 660;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(ix, 88, 270, 380);
      ctx.fillStyle = def.color;
      ctx.fillRect(ix, 88, 270, 4);
      txt(ctx, def.name, ix + 14, 132, 40, def.color, 'left', 5);
      txt(ctx, def.title, ix + 14, 156, 17, '#fff', 'left', 3, 700, 'sans-serif');
      txt(ctx, `ELEMENT: ${def.element.toUpperCase()}`, ix + 14, 180, 15, '#bbb', 'left', 3, 700, 'sans-serif');
      const st = def.stats;
      const bars = [
        ['POWER', (st.power - 0.85) / 0.4],
        ['SPEED', (st.walk - 6) / 3.5],
        ['HEALTH', (st.hp - 800) / 450],
        ['AIR', (st.airJumps + st.airDash * 0.8 + (st.jump - 15) / 4) / 4.6],
      ];
      bars.forEach(([name, v], i) => {
        const by = 200 + i * 20;
        txt(ctx, name, ix + 14, by + 11, 13, '#ddd', 'left', 0, 700, 'sans-serif');
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(ix + 80, by, 170, 12);
        ctx.fillStyle = def.color;
        ctx.fillRect(ix + 80, by, 170 * U.clamp(v, 0.08, 1), 12);
      });
      const sp = def.specials;
      const moves = [['•', sp.N.name], ['→', sp.F.name], ['↑', sp.U.name], ['↓', sp.D.name], ['★', def.super.name]];
      moves.forEach(([k, nm], i) => {
        const my = 306 + i * 24;
        txt(ctx, k, ix + 24, my, 18, i === 4 ? '#ffd600' : def.color, 'center', 3, 900, 'sans-serif');
        txt(ctx, nm, ix + 44, my, 17, i === 4 ? '#ffd600' : '#fff', 'left', 3, 700, 'sans-serif');
      });
      this.wrap(ctx, def.blurb, ix + 14, 428, 245, 13, '#b3e5fc');
    }
    txt(ctx, 'VS', VIEW_W / 2, 290, 56, '#ffffff', 'center', 6);

    // roster grid
    const cols = 8;
    const cw = 118;
    const ch = 100;
    const gap = 8;
    const x0 = (VIEW_W - (cols * cw + (cols - 1) * gap)) / 2;
    const y0 = 500;
    ROSTER.forEach((def, i) => {
      const cx = x0 + (i % cols) * (cw + gap);
      const cy = y0 + Math.floor(i / cols) * (ch + gap);
      ctx.save();
      ctx.fillStyle = U.shade(def.color, -0.7);
      ctx.fillRect(cx, cy, cw, ch);
      ctx.beginPath();
      ctx.rect(cx, cy, cw, ch);
      ctx.clip();
      glow(ctx, cx + cw / 2, cy + ch * 0.4, 60, def.color, 0.35);
      drawFigure(ctx, def, POSES.idle, cx + cw / 2, cy + ch + 72, 1, 1.05 / def.size, { t });
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(cx, cy + ch - 22, cw, 22);
      txt(ctx, def.name, cx + cw / 2, cy + ch - 5, 17, '#fff', 'center', 0);
      ctx.restore();
      ctx.strokeStyle = U.rgba(def.color, 0.6);
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cw, ch);
    });
    for (let p = 0; p < 2; p++) {
      const show = this.mode === 'vs' || p <= s.phase;
      if (!show) continue;
      const i = s.cur[p];
      const cx = x0 + (i % cols) * (cw + gap);
      const cy = y0 + Math.floor(i / cols) * (ch + gap);
      const pulse = s.locked[p] ? 5 : 3 + Math.sin(t * 0.3) * 1.5;
      ctx.strokeStyle = pcol[p];
      ctx.lineWidth = pulse;
      ctx.strokeRect(cx - 2 + p * 4, cy - 2 + p * 4, cw + 4 - p * 8, ch + 4 - p * 8);
      ctx.fillStyle = pcol[p];
      ctx.fillRect(cx + (p ? cw - 34 : 0), cy, 34, 18);
      txt(ctx, p ? '2' : '1', cx + (p ? cw - 17 : 17), cy + 15, 16, '#fff', 'center', 0);
    }
    txt(ctx, 'Move: arrows/WASD   •   Select: F / Enter   •   Random: H   •   Back: G / Esc', VIEW_W / 2, 488, 15, '#aaa', 'center', 3, 700, 'sans-serif');
  },

  wrap(ctx, text, x, y, maxW, size, color) {
    ctx.font = `700 ${size}px sans-serif`;
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        txt(ctx, line, x, yy, size, color, 'left', 0, 700, 'sans-serif');
        line = w;
        yy += size + 3;
      } else line = test;
    }
    if (line) txt(ctx, line, x, yy, size, color, 'left', 0, 700, 'sans-serif');
  },

  drawStage(ctx) {
    this.drawBackdrop(ctx, this.stageIdx, 0.1);
    const t = this.t;
    const defs = this.lastPicks.map((i) => ROSTER[i]);
    drawFigure(ctx, defs[0], POSES.idle, 380, GROUND_Y, 1, 1.3, { t });
    drawFigure(ctx, defs[1], POSES.idle, 900, GROUND_Y, -1, 1.3, { t });
    txt(ctx, 'CHOOSE STAGE', VIEW_W / 2, 90, 44, '#ffd600');
    const bob = Math.sin(t * 0.15) * 6;
    txt(ctx, `◀   ${STAGES[this.stageIdx].name.toUpperCase()}   ▶`, VIEW_W / 2 + 0 * bob, 180, 58, '#ffffff', 'center', 7);
    txt(ctx, `${defs[0].name}  vs  ${defs[1].name}`, VIEW_W / 2, 240, 30, '#ffffff', 'center', 5);
    txt(ctx, 'F / Enter to FIGHT', VIEW_W / 2, 300 + bob, 26, '#ffd600', 'center', 4);
  },

  drawPause(ctx) {
    ctx.fillStyle = this.pauseView ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (this.pauseView === 'moves') return this.drawMoveList(ctx);
    if (this.pauseView === 'practice') return this.drawPracticeMenu(ctx);
    if (this.pauseView === 'controls') return this.drawControls(ctx);
    const items = this.pauseItems();
    txt(ctx, this.mode === 'training' ? 'PRACTICE' : 'PAUSED', VIEW_W / 2, 120, 72, '#ffd600');
    this.drawMenu(ctx, items, VIEW_W / 2, items.length > 6 ? 210 : 240);
  },

  drawMoveList(ctx) {
    const m = this.match;
    txt(ctx, 'MOVE LIST', VIEW_W / 2, 70, 56, '#ffd600');
    m.f.forEach((f, p) => {
      const d = f.def;
      const x = p === 0 ? 120 : 690;
      txt(ctx, d.name, x, 130, 40, d.color, 'left');
      const sp = d.specials;
      const rows = [
        ['Special', sp.N.name], ['→ + Special', sp.F.name], ['↑ + Special', sp.U.name], ['↓ + Special', sp.D.name],
        ['Super (full bar)', d.super.name], ['Light ×3', 'Punch, punch, kick chain'], ['↑ + Heavy', 'Launcher'],
        ['↓ + Heavy', 'Sweep (low, knockdown)'], ['Air Heavy', 'Spike (overhead)'], ['↓ + Light', 'Low jab (low)'],
        ['Flow', 'Evade stance (1/4 meter)'], ['Hold back', 'Block (↓+back for lows)'],
      ];
      rows.forEach(([k, v], i) => {
        txt(ctx, k, x, 176 + i * 33, 19, '#80d8ff', 'left', 3, 700, 'sans-serif');
        txt(ctx, v, x + 190, 176 + i * 33, 19, i === 4 ? '#ffd600' : '#fff', 'left', 3, 700, 'sans-serif');
      });
      this.wrap(ctx, d.blurb, x, 580, 460, 17, '#b3e5fc');
    });
    txt(ctx, 'Press any button', VIEW_W / 2, VIEW_H - 30, 20, '#aaa', 'center', 3, 700, 'sans-serif');
  },

  drawResults(ctx) {
    const m = this.match;
    const w = this.resultsWinner;
    const t = this.t;
    this.drawBackdrop(ctx, m.opts.stage, 0.35);
    glow(ctx, VIEW_W / 2, GROUND_Y - 150, 300, w.def.color, 0.4);
    const pose = JSON.parse(JSON.stringify(POSES.victory));
    pose.fa[0] += Math.sin(t * 0.2) * 8;
    drawFigure(ctx, w.def, pose, VIEW_W / 2, GROUND_Y, 1, 2.1 / w.def.size * (0.85 + w.def.size * 0.15), { t });
    const who = this.mode === 'vs' ? `PLAYER ${w.side + 1}` : this.mode === 'watch' ? `CPU ${w.side + 1}` : w.side === 0 ? 'YOU WIN!' : 'CPU WINS';
    txt(ctx, `${w.def.name} WINS!`, VIEW_W / 2, 100, 84, w.def.color, 'center', 8);
    txt(ctx, who, VIEW_W / 2, 150, 34, '#fff', 'center', 5);
    txt(ctx, `${m.f[0].wins} - ${m.f[1].wins}`, VIEW_W / 2, 196, 32, '#ffd600', 'center', 5);
    if (this.sceneT >= 30) {
      this.RESULT_ITEMS.forEach((it, i) => {
        const sel = i === this.cursor;
        txt(ctx, it, 200, 520 + i * 48, sel ? 34 : 28, sel ? '#ffd600' : '#fff', 'center', 5);
      });
    }
  },
};

// ------------------------------------------------------------------ boot
function fitCanvas() {
  const c = document.getElementById('game');
  const s = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  c.style.width = `${Math.floor(VIEW_W * s)}px`;
  c.style.height = `${Math.floor(VIEW_H * s)}px`;
}

window.addEventListener('load', () => {
  Game.init();
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    acc += dt;
    const step = 1000 / 60 / Game.speed();
    let n = 0;
    while (acc >= step && n < 6) {
      Game.update();
      Keys.endTick();
      acc -= step;
      n++;
    }
    if (n === 6) acc = 0;
    Game.draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
});
