// A match: two fighters, hazards, particles, camera, rounds.
const VIEW_W = 1280;
const VIEW_H = 720;
const GROUND_Y = 612;

class Match {
  constructor(opts) {
    this.opts = opts;
    this.stageDef = STAGES[opts.stage];
    this.stage = { width: 2200, left: 90, right: 2110 };
    this.inputs = opts.inputs;
    this.ai = opts.ai;
    this.practice = opts.practice || null;
    this.training = !!this.practice;
    this.classic = !!opts.classic;
    this.noKO = this.training;
    this.history = [];
    this.info = {};
    this.adv = null;
    this.winsNeeded = opts.winsNeeded || 2;
    this.f = [
      new Fighter(opts.defs[0], 0, this.inputs[0], this),
      new Fighter(opts.defs[1], 1, this.inputs[1], this),
    ];
    this.hazards = [];
    this.particles = [];
    this.ghosts = [];
    this.timers = [];
    this.cam = { x: this.stage.width / 2, y: 0, zoom: 1 };
    this.frame = 0;
    this.round = 1;
    this.over = false;
    this.winner = null;
    this.startRound();
  }

  opp(f) {
    return f === this.f[0] ? this.f[1] : this.f[0];
  }

  // ------------------------------------------------------------ api for fighters/moves
  addHazard(o) {
    const h = new Hazard(o);
    h.srcName = o.srcName || (o.owner && o.owner.move ? moveName(o.owner.move) : 'Projectile');
    this.hazards.push(h);
    return h;
  }
  later(frames, fn) {
    this.timers.push({ t: frames, fn });
  }
  particle(o) {
    const p = Object.assign({ vx: 0, vy: 0, life: 20, size: 4, color: '#fff', drag: 0.94, grav: 0, type: 'dot' }, o);
    p.max = p.life;
    this.particles.push(p);
    if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900);
  }
  dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.particle({ x: x + U.rand(-20, 20), y: y - 4, vx: U.rand(-3, 3), vy: U.rand(-2, -0.3), life: U.randi(14, 24), size: U.rand(5, 10), color: 'rgba(220,220,220,0.5)', type: 'dust', drag: 0.9 });
    }
  }
  text(text, x, y, color = '#fff', scale = 1) {
    this.particle({ x, y, vx: 0, vy: -1.2, life: 50, size: 0, color, type: 'text', text, scale, drag: 0.97 });
  }
  superFlash(f) {
    this.superFreeze = 42;
    this.superUser = f;
    this.superName = f.def.super.name;
    SFX.play('super');
    fxBurst(this, f.x, f.y - 80, f.def.color, 30, 12);
  }
  onKO(f, att) {
    if (this.phase !== 'fight') return;
    this.phase = 'ko';
    this.phaseT = 0;
    this.slowmo = 60;
    this.koWinner = att === f ? this.opp(f) : att;
    this.inputLocked = true;
    this.announce('K.O.', '#ff1744', 90);
    SFX.play('ko');
    this.shake = 20;
  }
  announce(text, color = '#fff', dur = 60, sub = '') {
    this.ann = { text, color, t: 0, dur, sub };
    SFX.play('announce');
  }

  // ------------------------------------------------------------ rounds
  startRound() {
    const mid = this.stage.width / 2;
    this.f[0].reset(mid - 260);
    this.f[1].reset(mid + 260);
    this.hazards = [];
    this.timers = [];
    this.ghosts = [];
    this.phase = 'intro';
    this.phaseT = 0;
    this.clock = this.classic ? CLASSIC.clock : 60;
    this.clockT = 0;
    this.inputLocked = true;
    this.superFreeze = 0;
    this.slowmo = 0;
    this.shake = 0;
    this.flash = 0;
    this.cam.x = mid;
    this.cam.zoom = 1;
    if (this.practice) {
      this.phase = 'fight';
      this.inputLocked = false;
      this.resetPositions(true);
      this.announce('PRACTICE', '#69f0ae', 60);
    } else this.announce(`ROUND ${this.round}`, '#ffffff', 70);
  }

  roundLogic() {
    this.phaseT++;
    if (this.phase === 'intro') {
      if (this.phaseT === 72) this.announce('FIGHT!', '#ffd600', 40);
      if (this.phaseT >= 90) {
        this.phase = 'fight';
        this.inputLocked = false;
      }
    } else if (this.phase === 'fight') {
      if (this.practice) {
        this.practiceTick();
        return;
      }
      if (++this.clockT >= 60) {
        this.clockT = 0;
        this.clock--;
        if (this.clock <= 0) {
          this.clock = 0;
          this.phase = 'ko';
          this.phaseT = 0;
          this.inputLocked = true;
          const [a, b] = this.f;
          const ra = a.hp / a.maxHp;
          const rb = b.hp / b.maxHp;
          this.koWinner = ra > rb ? a : rb > ra ? b : null;
          this.announce('TIME!', '#ffd600', 90);
        }
      }
    } else if (this.phase === 'ko') {
      const w = this.koWinner;
      if (this.phaseT === 100 && w) {
        if (w.state !== 'ko' && w.onGround) {
          w.state = 'victory';
          w.move = null;
        }
        this.announce(`${w.def.name} WINS`, w.def.color, 80, w.hp >= w.maxHp ? 'PERFECT!' : '');
      }
      if (this.phaseT === 100 && !w) this.announce('DRAW', '#ffffff', 80);
      if (this.phaseT >= 190) {
        if (w) {
          w.wins++;
          const loser = this.opp(w);
          loser.meter = Math.min(100, loser.meter + LOSER_METER_BONUS);
        }
        if (w && w.wins >= this.winsNeeded) {
          this.over = true;
          this.winner = w;
        } else {
          this.round++;
          if (this.round > this.winsNeeded * 2 + 1) {
            this.over = true;
            this.winner = this.f[0].wins >= this.f[1].wins ? this.f[0] : this.f[1];
          } else this.startRound();
        }
      }
    }
  }

  // ------------------------------------------------------------ practice mode
  resetPositions(quiet) {
    const p = this.practice;
    const st = this.stage;
    const mid = st.width / 2;
    const [a, b] = this.f;
    let ax = mid - 160;
    let bx = mid + 160;
    if (PRACTICE_POSITIONS[p.position] === 'LEFT CORNER') {
      bx = st.left;
      ax = st.left + 220;
    } else if (PRACTICE_POSITIONS[p.position] === 'RIGHT CORNER') {
      bx = st.right;
      ax = st.right - 220;
    }
    const meters = [a.meter, b.meter];
    a.reset(ax);
    b.reset(bx);
    a.meter = meters[0];
    b.meter = meters[1];
    a.facing = U.sign(bx - ax);
    b.facing = -a.facing;
    this.hazards = [];
    this.timers = [];
    this.ghosts = [];
    this.adv = null;
    this.cam.x = (ax + bx) / 2;
    this.inputs.forEach((i) => i.clearBuffer());
    if (!quiet) this.text('RESET', mid, -260, '#69f0ae', 1);
  }

  // Records what P1's attacks did, for the attack-data panel.
  noteHit(att, def, res, name, melee) {
    if (!this.practice || att !== this.f[0]) return;
    const i = this.info;
    i.move = name;
    i.result = { hit: 'HIT', block: 'BLOCKED', armor: 'ARMORED', flowed: 'FLOWED' }[res] || 'PARRIED';
    i.damage = res === 'hit' || res === 'block' || res === 'armor' ? def.lastDmg || 0 : 0;
    if (res === 'hit') {
      i.combo = def.combo;
      i.comboDmg = def.comboDmg;
      if (def.combo > (i.maxCombo || 0) || (def.combo === i.maxCombo && def.comboDmg > i.maxDmg)) {
        i.maxCombo = def.combo;
        i.maxDmg = def.comboDmg;
      }
    }
    // frame advantage is measured for melee contact only
    i.adv = null;
    this.adv = melee && (res === 'hit' || res === 'block') ? { att, def, t: 0, a: null, d: null, res } : null;
  }

  practiceTick() {
    const p = this.practice;
    const [pl, dummy] = this.f;
    for (const f of this.f) {
      const resting = f.state !== 'hit' && f.state !== 'down' && f.state !== 'stunned' && f.combo === 0;
      f.idleT = resting ? (f.idleT || 0) + 1 : 0;
      if (p.health === 0 && f.idleT > 40) {
        f.hp = f.maxHp;
        f.guard = 100;
      }
    }
    if (p.meter === 0) pl.meter = 100;
    if (DUMMY_REVERSALS[p.reversal] === 'FLOW') dummy.meter = 100;
    if (p.cooldowns === 0) for (const f of this.f) for (const k in f.cd) f.cd[k] = 0;
    if (this.inputs[0].edge.reset) this.resetPositions();

    // frame advantage: who can act first after the last contact
    const tr = this.adv;
    if (tr) {
      tr.t++;
      const free = (f) => DUMMY_FREE.has(f.state);
      if (tr.a === null && free(tr.att)) tr.a = tr.t;
      if (tr.d === null && free(tr.def)) tr.d = tr.t;
      if (tr.a !== null && tr.d !== null) {
        this.info.adv = tr.d - tr.a;
        this.info.advOn = tr.res;
        this.adv = null;
      } else if (tr.t > 240) this.adv = null;
    }
    this.recordInput();
  }

  recordInput() {
    const f = this.f[0];
    const h = this.inputs[0].held;
    const fw = f.facing > 0 ? h.right : h.left;
    const bk = f.facing > 0 ? h.left : h.right;
    const up = h.up || h.jump;
    const dn = h.down;
    const dir = up ? (fw ? '↗' : bk ? '↖' : '↑') : dn ? (fw ? '↘' : bk ? '↙' : '↓') : fw ? '→' : bk ? '←' : '';
    const btns = [['L', 'L'], ['H', 'H'], ['S', 'SP'], ['FL', 'FLOW'], ['D', 'DASH'], ['SU', 'SUPER']].filter(([k]) => h[k]).map(([, l]) => l);
    const key = `${dir}|${btns.join(' ')}`;
    const top = this.history[0];
    if (top && top.key === key) {
      top.n = Math.min(999, top.n + 1);
      return;
    }
    this.history.unshift({ key, dir, btns, n: 1 });
    if (this.history.length > 14) this.history.pop();
  }

  // ------------------------------------------------------------ main tick
  tick() {
    this.frame++;
    for (let i = 0; i < 2; i++) {
      const raw = this.ai[i] ? this.ai[i].update(this.f[i], this.f[1 - i], this) : rawForPlayer(i, this.opts.mergeKeys && i === 0);
      this.inputs[i].locked = this.inputLocked;
      this.inputs[i].update(raw);
    }
    if (this.flash > 0) this.flash--;
    if (this.shake > 0) this.shake *= 0.85;
    if (this.shake < 0.5) this.shake = 0;

    if (this.superFreeze > 0) {
      this.superFreeze--;
      const u = this.superUser;
      u.animT++;
      u.updatePose();
      if (this.superFreeze % 3 === 0) this.particle({ x: u.x + U.rand(-60, 60), y: u.y - U.rand(0, 160), vx: 0, vy: -3, life: 18, size: 6, color: u.def.color });
      this.updateParticles();
      this.updateCamera();
      return;
    }
    if (this.slowmo > 0) {
      this.slowmo--;
      if (this.slowmo % 3 !== 0) {
        this.updateParticles();
        this.updateCamera();
        this.roundLogic();
        return;
      }
    }

    for (const f of this.f) f.update();
    this.separate();
    for (const h of this.hazards) h.update(this);
    this.collide();
    this.hazards = this.hazards.filter((h) => !h.dead);

    for (const tm of this.timers) if (--tm.t <= 0) tm.fn();
    this.timers = this.timers.filter((tm) => tm.t > 0);

    for (const f of this.f) {
      if (f.dispHp > f.hp) {
        if (f.state !== 'hit') f.dispHp = Math.max(f.hp, f.dispHp - 6);
      } else f.dispHp = f.hp;
    }
    this.updateParticles();
    this.updateCamera();
    this.roundLogic();
    if (this.ann) this.ann.t++;
  }

  updateParticles() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.grav;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.life--;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const g of this.ghosts) g.life--;
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
  }

  separate() {
    const [a, b] = this.f;
    if (a.state === 'ko' || b.state === 'ko' || a.state === 'down' || b.state === 'down') return;
    if ((a.move && a.move.passThrough && a.state === 'attack') || (b.move && b.move.passThrough && b.state === 'attack')) return;
    if (a.hidden || b.hidden) return;
    const ha = a.hurtbox();
    const hb = b.hurtbox();
    if (!(ha.y < hb.y + hb.h && hb.y < ha.y + ha.h)) return;
    const dx = b.x - a.x;
    const minD = ((ha.w + hb.w) / 2) * 0.85;
    if (Math.abs(dx) >= minD) return;
    const s = U.sign(dx) || (a.facing > 0 ? 1 : -1);
    const push = (minD - Math.abs(dx)) / 2;
    a.x -= s * push;
    b.x += s * push;
    const st = this.stage;
    for (const [f, o] of [[a, b], [b, a]]) {
      if (f.x < st.left) {
        o.x += st.left - f.x;
        f.x = st.left;
      } else if (f.x > st.right) {
        o.x -= f.x - st.right;
        f.x = st.right;
      }
    }
  }

  meleeHit(a, b) {
    const mv = a.move;
    const res = b.takeHit(mv.hit, a, a.x, a.facing, null);
    if (res === 'none') return;
    this.noteHit(a, b, res, moveName(mv), true);
    if (res === 'block' || res === 'countered' || res === 'flowed') a.moveBlocked = true;
    else a.moveHit = true;
    a.lastHitMf = a.mf;
  }

  collide() {
    const [a, b] = this.f;
    const ha = a.hitbox();
    const hb = b.hitbox();
    const hitA = ha && U.overlap(ha, b.hurtbox());
    const hitB = hb && U.overlap(hb, a.hurtbox());
    if (hitA) this.meleeHit(a, b);
    if (hitB && b.move && b.move.hit) this.meleeHit(b, a);

    for (const h of this.hazards) {
      if (h.dead || h.delay > 0) continue;
      for (const t of this.f) {
        if (t === h.owner || t.state === 'ko') continue;
        if (h.trap && !h.triggered) {
          if (h.arm > 0) {
            h.arm--;
            continue;
          }
          if (U.overlap(h.box(), t.hurtbox())) h.trigger(this);
          else continue;
        }
        if (!h.isActive()) continue;
        if (h.groundOnly && !t.onGround) continue;
        const last = h.hitLog.get(t);
        if (last !== undefined && (!h.rehit || h.age - last < h.rehit)) continue;
        if (!U.overlap(h.box(), t.hurtbox())) continue;
        const res = h.owner === t ? 'none' : t.takeHit(h.hit, h.owner, h.sourceX(), h.knockDir(t), h);
        if (res === 'none') continue;
        this.noteHit(h.owner, t, res, h.srcName, false);
        h.hitLog.set(t, h.age);
        if (res !== 'countered' && !h.pierce) {
          h.dead = true;
          fxBurst(this, h.x, h.y, h.color, 10, 6);
        }
        if (res === 'hit' && h.follow && h.owner.move) h.owner.moveHit = true;
      }
    }

    // projectile clashes and walls
    const hz = this.hazards;
    for (let i = 0; i < hz.length; i++) {
      const p = hz[i];
      if (p.dead || p.delay > 0) continue;
      for (let j = i + 1; j < hz.length; j++) {
        const q = hz[j];
        if (q.dead || q.delay > 0 || p.owner === q.owner) continue;
        if (!U.overlap(p.box(), q.box())) continue;
        if (p.wall || q.wall) {
          const wall = p.wall ? p : q;
          const proj = p.wall ? q : p;
          if (proj.wall || proj.trap || !proj.clash || proj.follow || proj.ground && proj.big) continue;
          if (proj.big) wall.wallHp = 0;
          proj.dead = true;
          wall.wallHp--;
          fxBurst(this, proj.x, proj.y, '#e0f7fa', 12, 6);
          SFX.play('block');
          if (wall.wallHp <= 0) {
            wall.dead = true;
            fxBurst(this, wall.x, wall.y, '#e0f7fa', 24, 9);
          }
          continue;
        }
        if (!p.clash || !q.clash || p.trap || q.trap) continue;
        if (p.clashOnly && q.clashOnly) continue;
        const pBig = p.big || p.clashOnly;
        const qBig = q.big || q.clashOnly;
        if (pBig && !qBig) q.dead = true;
        else if (qBig && !pBig) p.dead = true;
        else if (!pBig && !qBig) {
          p.dead = true;
          q.dead = true;
        } else continue;
        fxBurst(this, (p.x + q.x) / 2, (p.y + q.y) / 2, '#ffffff', 14, 8);
        SFX.play('block');
      }
    }
  }

  updateCamera() {
    const [a, b] = this.f;
    const mid = (a.x + b.x) / 2;
    const dist = Math.abs(a.x - b.x);
    const tz = U.clamp(1150 / (dist + 520), 0.6, 1.05);
    const c = this.cam;
    c.zoom = U.lerp(c.zoom, tz, 0.08);
    const half = VIEW_W / 2 / c.zoom;
    c.x = U.clamp(U.lerp(c.x, mid, 0.25), half, this.stage.width - half);
    const top = Math.min(a.y, b.y);
    const ty = top < -260 ? (top + 260) * 0.7 : 0;
    c.y = U.lerp(c.y, ty, 0.1);
  }

  // ------------------------------------------------------------ drawing
  draw(ctx) {
    const c = this.cam;
    const t = this.frame;
    const sx = this.shake ? U.rand(-this.shake, this.shake) : 0;
    const sy = this.shake ? U.rand(-this.shake, this.shake) : 0;
    const gy = GROUND_Y - c.y * c.zoom;
    this.stageDef.draw(ctx, c, gy, t, VIEW_W, VIEW_H);

    ctx.save();
    ctx.translate(VIEW_W / 2 + sx, GROUND_Y + sy);
    ctx.scale(c.zoom, c.zoom);
    ctx.translate(-c.x, -c.y);

    // floor
    const sd = this.stageDef;
    ctx.fillStyle = sd.floor;
    ctx.fillRect(-400, 0, this.stage.width + 800, 900);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 6; i++) ctx.fillRect(-400, 18 + i * i * 14, this.stage.width + 800, 3 + i);
    ctx.fillStyle = sd.floorLine;
    ctx.fillRect(-400, 0, this.stage.width + 800, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 3;
    for (let x = 0; x <= this.stage.width; x += 110) {
      ctx.beginPath();
      ctx.moveTo(x, 5);
      ctx.lineTo(x + (x - c.x) * 0.5, 300);
      ctx.stroke();
    }

    if (this.superFreeze > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(c.x - 3000, c.y - 3000, 6000, 6000);
    }

    // ground-level hazards below fighters
    for (const h of this.hazards) if (h.trap || h.wall || h.delay > 0) drawHazard(ctx, h, t);
    for (const gh of this.ghosts) {
      ctx.globalAlpha = (gh.life / gh.max) * 0.35;
      drawFigure(ctx, gh.def, gh.pose, gh.x, gh.y, gh.facing, 1, { tint: gh.color });
    }
    ctx.globalAlpha = 1;
    // draw the attacker on top
    const order = this.f[0].state === 'attack' ? [this.f[1], this.f[0]] : [this.f[0], this.f[1]];
    for (const f of order) drawFighter(ctx, f, t);
    for (const h of this.hazards) if (!(h.trap || h.wall || h.delay > 0)) drawHazard(ctx, h, t);
    for (const p of this.particles) drawParticle(ctx, p);

    if (Game.debug || (this.practice && this.practice.hitboxes)) {
      for (const f of this.f) {
        const hb = f.hurtbox();
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 2;
        ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
        const ab = f.hitbox();
        if (ab) {
          ctx.strokeStyle = '#ff1744';
          ctx.strokeRect(ab.x, ab.y, ab.w, ab.h);
        }
      }
      for (const h of this.hazards) {
        const b = h.box();
        ctx.strokeStyle = '#ffea00';
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      }
    }
    ctx.restore();

    if (this.flash > 0) {
      ctx.fillStyle = U.rgba(this.flashColor || '#ffffff', this.flash / 12);
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    drawHUD(ctx, this);
  }
}

// ------------------------------------------------------------------ HUD
function drawBarFrame(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
}

function drawPortrait(ctx, def, x, y, r, flip) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = U.shade(def.color, -0.55);
  ctx.fill();
  ctx.clip();
  const sc = r / 26 / def.size;
  drawFigure(ctx, def, POSES.idle, x - (flip ? -8 : 8), y + 128 * sc * def.size, flip ? -1 : 1, sc, {});
  ctx.restore();
  ctx.strokeStyle = def.color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHUD(ctx, m) {
  const t = m.frame;
  const BW = 470;
  const BH = 26;
  ctx.save();
  m.f.forEach((f, i) => {
    const left = i === 0;
    const x = left ? 110 : VIEW_W - 110 - BW;
    const y = 30;
    drawPortrait(ctx, f.def, left ? 58 : VIEW_W - 58, 50, 38, !left);
    drawBarFrame(ctx, x, y, BW, BH);
    const pct = f.hp / f.maxHp;
    const dpct = f.dispHp / f.maxHp;
    ctx.fillStyle = '#d50000';
    if (left) ctx.fillRect(x + BW * (1 - dpct), y, BW * dpct, BH);
    else ctx.fillRect(x, y, BW * dpct, BH);
    const gr = ctx.createLinearGradient(0, y, 0, y + BH);
    const hc = pct > 0.5 ? ['#b2ff59', '#43a047'] : pct > 0.25 ? ['#ffee58', '#f9a825'] : ['#ff8a65', '#e64a19'];
    gr.addColorStop(0, hc[0]);
    gr.addColorStop(1, hc[1]);
    ctx.fillStyle = gr;
    if (left) ctx.fillRect(x + BW * (1 - pct), y, BW * pct, BH);
    else ctx.fillRect(x, y, BW * pct, BH);
    // guard bar
    const gp = f.guard / 100;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y + BH + 5, BW * 0.6 * (left ? 1 : 1), 6);
    ctx.fillStyle = f.state === 'stunned' ? '#ff1744' : gp < 0.35 ? '#ffab00' : '#40c4ff';
    if (left) ctx.fillRect(x + BW * 0.4 + BW * 0.6 * (1 - gp), y + BH + 5, BW * 0.6 * gp, 6);
    else ctx.fillRect(x, y + BH + 5, BW * 0.6 * gp, 6);
    if (left) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x, y + BH + 5, BW * 0.4 - 4, 6);
    }
    // name
    ctx.font = "900 22px Impact, 'Arial Black', sans-serif";
    ctx.textAlign = left ? 'left' : 'right';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    const nm = f.def.name;
    const nx = left ? x : x + BW;
    ctx.strokeText(nm, nx, y + BH + 34);
    ctx.fillStyle = '#fff';
    ctx.fillText(nm, nx, y + BH + 34);
    if (f.adrenaline()) {
      const ax = left ? nx + ctx.measureText(nm).width + 14 : nx - ctx.measureText(nm).width - 14;
      ctx.font = "900 16px Impact, 'Arial Black', sans-serif";
      ctx.globalAlpha = 0.6 + Math.max(0, Math.sin(t * 0.25)) * 0.4;
      ctx.strokeText('ADRENALINE', ax, y + BH + 33);
      ctx.fillStyle = '#ff1744';
      ctx.fillText('ADRENALINE', ax, y + BH + 33);
      ctx.globalAlpha = 1;
    }
    // round wins
    for (let w = 0; w < m.winsNeeded; w++) {
      const cx = left ? VIEW_W / 2 - 70 - w * 22 : VIEW_W / 2 + 70 + w * 22;
      ctx.beginPath();
      ctx.arc(cx, 76, 8, 0, Math.PI * 2);
      ctx.fillStyle = w < f.wins ? '#ffd600' : 'rgba(0,0,0,0.5)';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // meter
    const MW = 300;
    const my = VIEW_H - 40;
    const mx = left ? 40 : VIEW_W - 40 - MW;
    drawBarFrame(ctx, mx, my, MW, 16);
    const full = f.meter >= 100;
    const mg = ctx.createLinearGradient(mx, 0, mx + MW, 0);
    mg.addColorStop(0, full ? '#fff176' : '#2979ff');
    mg.addColorStop(1, full ? (t % 10 < 5 ? '#ff6d00' : '#ffea00') : '#00e5ff');
    ctx.fillStyle = mg;
    const mp = f.meter / 100;
    if (left) ctx.fillRect(mx, my, MW * mp, 16);
    else ctx.fillRect(mx + MW * (1 - mp), my, MW * mp, 16);
    // quarter-bar ticks: one Flow costs one quarter
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    for (let q = 1; q < 4; q++) ctx.fillRect(mx + (MW * q) / 4 - 1, my, 2, 16);
    ctx.font = "900 16px Impact, 'Arial Black', sans-serif";
    ctx.textAlign = left ? 'left' : 'right';
    ctx.fillStyle = full ? '#ffea00' : '#ffffff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    const lbl = full ? `SUPER READY — ${f.def.super.name.toUpperCase()}` : 'SUPER';
    ctx.strokeText(lbl, left ? mx : mx + MW, my - 8);
    ctx.fillText(lbl, left ? mx : mx + MW, my - 8);
    // special cooldowns
    ['N', 'F', 'U', 'D'].forEach((k, j) => {
      const sm = f.def.specials[k];
      const bx = left ? mx + MW + 16 + j * 30 : mx - 16 - 26 - j * 30;
      const ready = f.cd[k] <= 0;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, my - 6, 26, 26);
      if (!ready && sm.cooldown) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        const p = 1 - f.cd[k] / sm.cooldown;
        ctx.fillRect(bx, my - 6 + 26 * (1 - p), 26, 26 * p);
      } else {
        ctx.fillStyle = f.def.color;
        ctx.fillRect(bx, my - 6, 26, 26);
      }
      ctx.fillStyle = ready ? '#111' : '#ccc';
      ctx.font = '900 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText({ N: '•', F: '→', U: '↑', D: '↓' }[k], bx + 13, my + 12);
    });
    // combo counter (shown on attacker's side)
    const vic = m.opp(f);
    if (vic.comboShow > 0 && vic.combo >= 2) {
      const a = Math.min(1, vic.comboShow / 20);
      ctx.globalAlpha = a;
      const cx = left ? 60 : VIEW_W - 60;
      ctx.textAlign = left ? 'left' : 'right';
      ctx.font = "900 54px Impact, 'Arial Black', sans-serif";
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#000';
      ctx.strokeText(`${vic.combo}`, cx, 230);
      ctx.fillStyle = f.def.color;
      ctx.fillText(`${vic.combo}`, cx, 230);
      ctx.font = "900 24px Impact, 'Arial Black', sans-serif";
      const ox = left ? cx + ctx.measureText(`${vic.combo}`).width * 2.2 + 10 : cx - ctx.measureText(`${vic.combo}`).width * 2.2 - 10;
      ctx.strokeText('HITS', ox, 228);
      ctx.fillStyle = '#fff';
      ctx.fillText('HITS', ox, 228);
      ctx.font = '700 18px sans-serif';
      ctx.strokeText(`${vic.comboDmg} DMG`, cx, 256);
      ctx.fillText(`${vic.comboDmg} DMG`, cx, 256);
      ctx.globalAlpha = 1;
    }
  });

  // timer
  ctx.textAlign = 'center';
  ctx.font = "900 56px Impact, 'Arial Black', sans-serif";
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#000';
  const clk = m.training ? '∞' : String(Math.ceil(m.clock));
  ctx.strokeText(clk, VIEW_W / 2, 66);
  ctx.fillStyle = m.clock <= 10 && !m.training && m.frame % 30 < 15 ? '#ff5252' : '#ffffff';
  ctx.fillText(clk, VIEW_W / 2, 66);

  // super cut-in
  if (m.superFreeze > 0) {
    const u = m.superUser;
    const p = 1 - m.superFreeze / 42;
    const slide = Math.min(1, p * 5);
    ctx.save();
    ctx.translate(VIEW_W / 2, VIEW_H * 0.42);
    ctx.rotate(-0.08);
    ctx.fillStyle = U.rgba(u.def.color, 0.85);
    ctx.fillRect(-VIEW_W, -55, VIEW_W * 2 * slide, 110);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(-VIEW_W, -45, VIEW_W * 2 * slide, 90);
    ctx.font = "900 64px Impact, 'Arial Black', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillStyle = u.def.color;
    ctx.fillText(m.superName.toUpperCase(), (1 - slide) * 400, 22);
    ctx.font = '700 18px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${u.def.name} — SUPER`, (1 - slide) * -300, -26);
    ctx.restore();
  }

  // announcer
  const an = m.ann;
  if (an && an.t < an.dur) {
    const k = an.t < 8 ? an.t / 8 : 1;
    const out = an.t > an.dur - 10 ? (an.dur - an.t) / 10 : 1;
    ctx.save();
    ctx.globalAlpha = out;
    ctx.translate(VIEW_W / 2, VIEW_H * 0.4);
    ctx.scale(2 - k, 2 - k);
    ctx.font = "900 96px Impact, 'Arial Black', sans-serif";
    ctx.textAlign = 'center';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#000';
    ctx.strokeText(an.text, 0, 30);
    ctx.fillStyle = an.color;
    ctx.fillText(an.text, 0, 30);
    if (an.sub) {
      ctx.font = "900 44px Impact, 'Arial Black', sans-serif";
      ctx.strokeText(an.sub, 0, 90);
      ctx.fillStyle = '#ffd600';
      ctx.fillText(an.sub, 0, 90);
    }
    ctx.restore();
  }
  if (m.practice) drawPracticeHUD(ctx, m);
  ctx.restore();
}

// ------------------------------------------------------------------ practice HUD
const PRACTICE_POSITIONS = ['CENTER', 'LEFT CORNER', 'RIGHT CORNER'];
const NORMAL_NAMES = {
  L1: 'Light 1', L2: 'Light 2', L3: 'Light 3 (kick)', CL: 'Crouch Light', H: 'Heavy',
  UH: 'Launcher', DH: 'Sweep', AL: 'Air Light', AH: 'Air Heavy', CR: 'Parry Strike',
};
function moveName(m) {
  if (!m) return '';
  return m.name || NORMAL_NAMES[m.id] || '';
}

function drawPracticeHUD(ctx, m) {
  const p = m.practice;
  ctx.save();
  if (p.inputs) {
    const x = 18;
    let y = 300;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x - 8, y - 26, 170, m.history.length * 22 + 14);
    for (const e of m.history) {
      ctx.textAlign = 'right';
      ctx.font = '700 13px sans-serif';
      ctx.fillStyle = '#9e9e9e';
      ctx.fillText(String(e.n), x + 28, y);
      ctx.textAlign = 'left';
      ctx.font = '900 18px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(e.dir || '·', x + 38, y + 1);
      ctx.font = '900 14px sans-serif';
      ctx.fillStyle = '#ffd600';
      ctx.fillText(e.btns.join(' '), x + 64, y);
      y += 22;
    }
  }
  if (p.data) {
    const i = m.info;
    const x = VIEW_W - 290;
    const y = 290;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, 272, 150);
    ctx.fillStyle = '#69f0ae';
    ctx.fillRect(x, y, 272, 3);
    const adv = i.adv;
    const advText = adv == null ? '—' : `${adv > 0 ? '+' : ''}${adv} on ${i.advOn}`;
    const rows = [
      ['LAST ATTACK', i.move ? `${i.move}` : '—', '#fff'],
      ['RESULT', i.result || '—', i.result === 'HIT' ? '#69f0ae' : '#fff'],
      ['DAMAGE', i.damage != null ? String(i.damage) : '—', '#fff'],
      ['COMBO', i.combo ? `${i.combo} hits · ${i.comboDmg}` : '—', '#fff'],
      ['BEST COMBO', i.maxCombo ? `${i.maxCombo} hits · ${i.maxDmg}` : '—', '#ffd600'],
      ['FRAME ADV.', advText, adv == null ? '#fff' : adv > 0 ? '#69f0ae' : adv < 0 ? '#ff5252' : '#fff'],
    ];
    rows.forEach(([k, v, c], j) => {
      const yy = y + 26 + j * 21;
      ctx.textAlign = 'left';
      ctx.font = '700 13px sans-serif';
      ctx.fillStyle = '#80d8ff';
      ctx.fillText(k, x + 12, yy);
      ctx.font = '700 15px sans-serif';
      ctx.fillStyle = c;
      ctx.fillText(v, x + 112, yy);
    });
  }
  ctx.textAlign = 'center';
  ctx.font = '700 15px sans-serif';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  const hint = Touch.active ? '❚❚ BUTTON: PRACTICE MENU (RESET POSITION IS IN THERE)' : `${Keybinds.text(0, 'reset')}: RESET POSITION   •   ESC: PRACTICE MENU`;
  ctx.strokeText(hint, VIEW_W / 2, VIEW_H - 10);
  ctx.fillStyle = '#b9f6ca';
  ctx.fillText(hint, VIEW_W / 2, VIEW_H - 10);
  ctx.restore();
}
