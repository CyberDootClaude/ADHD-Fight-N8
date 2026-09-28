// A single fighter: state machine, physics, hit handling.

const COUNTER_RECOVER = mk({
  id: 'CR', type: 'special', startup: 1, active: 1, recovery: 14,
  pose: { wind: POSES.punch, strike: POSES.punch },
});

const NEUTRAL_GROUND = new Set(['idle', 'walk', 'crouch', 'run']);
const CAN_BLOCK = new Set(['idle', 'walk', 'crouch', 'block', 'run', 'land']);

class Fighter {
  constructor(def, side, input, g) {
    this.def = def;
    this.side = side;
    this.input = input;
    this.g = g;
    this.meter = 0;
    this.wins = 0;
    this.moveSerial = 0;
    this.pose = JSON.parse(JSON.stringify(POSES.idle));
    this.reset(side === 0 ? g.stage.width / 2 - 260 : g.stage.width / 2 + 260);
  }

  reset(x) {
    const st = this.def.stats;
    this.x = x;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = this.side === 0 ? 1 : -1;
    this.onGround = true;
    this.maxHp = st.hp;
    this.hp = st.hp;
    this.dispHp = st.hp;
    this.guard = 100;
    this.guardRegenDelay = 0;
    this.state = 'idle';
    this.timer = 0;
    this.move = null;
    this.mf = 0;
    this.moveHit = false;
    this.moveBlocked = false;
    this.lastHitMf = -99;
    this.airJumps = st.airJumps;
    this.airDashes = st.airDash;
    this.hitstop = 0;
    this.inv = 0;
    this.combo = 0;
    this.comboDmg = 0;
    this.comboShow = 0;
    this.adrenalineShown = false;
    this.armorUsed = false;
    this.knockdown = false;
    this.bounced = false;
    this.hidden = false;
    this.slamDive = false;
    this.flash = 0;
    this.animT = 0;
    this.walkPh = 0;
    this.cd = { N: 0, F: 0, U: 0, D: 0 };
    this.status = { burn: 0, burnPow: 0, poison: 0, poisonPow: 0, slow: 0, freeze: 0, freezePersist: false, heal: 0, healPer: 0, armor: 0, speed: 0, power: 0, flow: 0 };
  }

  spd() {
    return (this.status.slow > 0 ? 0.6 : 1) * (this.status.speed > 0 ? 1.3 : 1);
  }
  pow() {
    return this.def.stats.power * (this.status.power > 0 ? 1.2 : 1) * (this.adrenaline() ? ADRENALINE_POWER : 1);
  }
  // Comeback mechanic: below 30% health you hit a little harder and build meter faster.
  adrenaline() {
    return this.hp > 0 && this.hp < this.maxHp * ADRENALINE_HP;
  }
  gainMeter(n) {
    this.meter = Math.min(100, this.meter + n * (this.adrenaline() ? ADRENALINE_METER : 1));
  }
  opp() {
    return this.g.opp(this);
  }

  hurtbox() {
    const s = this.def.size;
    const w = 52 * s;
    let h = 150 * s;
    const m = this.move;
    if (['crouch', 'jumpsquat', 'land', 'getup'].includes(this.state)) h = 95 * s;
    else if (this.state === 'block' && this.crouchBlock) h = 95 * s;
    else if (this.state === 'attack' && m && m.low) h = m.pose.strike === POSES.slide ? 70 * s : 95 * s;
    else if ((this.state === 'down' || this.state === 'ko') && this.onGround) h = 40 * s;
    return { x: this.x - w / 2, y: this.y - h, w, h };
  }

  hitbox() {
    const m = this.move;
    if (this.state !== 'attack' || !m || !m.box) return null;
    if (m.boxWhen) {
      if (!m.boxWhen(this)) return null;
    } else if (this.mf <= m.startup || this.mf > m.startup + m.active) return null;
    if (m.multi) {
      if (this.mf - this.lastHitMf < m.multi) return null;
    } else if (this.moveHit || this.moveBlocked) return null;
    const s = this.def.size;
    const b = m.box;
    const cx = this.x + this.facing * b.x * s;
    const cy = this.y + b.y * s;
    const w = b.w * s;
    const h = b.h * s;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }

  isInvuln() {
    if (this.inv > 0 || this.state === 'down') return true;
    const m = this.move;
    return !!(this.state === 'attack' && m && m.invuln && this.mf >= m.invuln[0] && this.mf <= m.invuln[1]);
  }

  isArmored() {
    if (this.status.armor > 0) return true;
    const m = this.move;
    if (this.state !== 'attack' || !m) return false;
    if (this.armorUsed) return false; // armor on a move absorbs one hit
    if (m.armor && this.mf >= m.armor[0] && this.mf <= m.armor[1]) return true;
    return !!(this.def.heavyArmor && m.type === 'heavy' && this.mf <= m.startup + m.active);
  }

  faceOpp() {
    const o = this.opp();
    const d = o.x - this.x;
    if (Math.abs(d) > 6) this.facing = U.sign(d);
  }

  afterimage(color) {
    this.g.ghosts.push({ x: this.x, y: this.y, facing: this.facing, pose: JSON.parse(JSON.stringify(this.pose)), def: this.def, life: 12, max: 12, color });
  }

  // ------------------------------------------------------------ update
  update() {
    this.animT++;
    if (this.flash > 0) this.flash--;
    if (this.comboShow > 0) this.comboShow--;
    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }
    const s = this.status;
    if (s.freeze > 0) {
      s.freeze--;
      if (s.freeze === 0) {
        s.freezePersist = false;
        fxBurst(this.g, this.x, this.y - 80, '#e0f7fa', 18, 7);
      }
      return;
    }
    this.tickStatus();
    for (const k in this.cd) if (this.cd[k] > 0) this.cd[k]--;
    if (this.inv > 0) this.inv--;
    if (this.guardRegenDelay > 0) this.guardRegenDelay--;
    else this.guard = Math.min(100, this.guard + 0.35);

    const inp = this.input;
    const st = this.def.stats;
    switch (this.state) {
      case 'idle':
      case 'walk':
      case 'crouch':
      case 'run':
        this.groundNeutral();
        break;
      case 'jumpsquat':
        this.timer--;
        if (this.tryAttack()) break;
        if (this.timer <= 0) this.doJump();
        break;
      case 'air':
        this.airNeutral();
        break;
      case 'dash': {
        const t = ++this.timer;
        const dur = this.backDash ? 12 : 13;
        const sp = st.dash * this.spd() * (this.backDash ? 0.85 : 1);
        this.vx = this.dashDir * sp * (t < 8 ? 1 : Math.max(0, 1 - (t - 8) / 6));
        if (t % 3 === 0) this.afterimage(this.def.color);
        if (t >= 4 && !this.backDash) {
          if (inp.pressed('up') || inp.pressed('jump')) {
            inp.consume('up');
            inp.consume('jump');
            this.doJump(true);
            break;
          }
          if (this.tryAttack()) break;
        }
        if (t >= dur) {
          if (!this.backDash && inp.held.D && inp.dirX() === this.dashDir) {
            this.state = 'run';
            this.runDir = this.dashDir;
          } else this.state = 'idle';
        }
        break;
      }
      case 'airdash': {
        const t = ++this.timer;
        this.vx = this.dashDir * st.dash * 0.95 * this.spd();
        this.vy = 0;
        if (t % 3 === 0) this.afterimage(this.def.color);
        if (t >= 4 && this.tryAttack()) break;
        if (t >= 11) {
          this.state = 'air';
          this.vx *= 0.6;
        }
        break;
      }
      case 'attack':
        this.runMove();
        break;
      case 'hit':
        this.timer--;
        if (this.onGround) this.vx *= 0.82;
        if (this.timer <= 0) {
          this.combo = 0;
          if (this.onGround) this.state = 'idle';
          else {
            this.state = 'air';
            this.airJumps = Math.min(this.airJumps, 1);
            fxBurst(this.g, this.x, this.y - 70, '#ffffff', 8, 5);
          }
        }
        break;
      case 'down':
        this.timer--;
        this.vx *= 0.85;
        if (this.timer <= 0) {
          this.state = 'getup';
          this.timer = 14;
          this.inv = 22;
        }
        break;
      case 'getup':
      case 'land':
        this.timer--;
        this.vx *= 0.7;
        if (this.timer <= 0) this.state = 'idle';
        break;
      case 'block':
        this.timer--;
        this.vx *= 0.85;
        if (inp.pressed('FL')) {
          inp.consume('FL');
          if (this.startFlow()) break;
        }
        if (this.timer <= 0) this.state = 'idle';
        break;
      case 'stunned':
        this.timer--;
        this.vx *= 0.8;
        if (this.timer % 10 === 0) this.g.particle({ x: this.x + U.rand(-30, 30), y: this.y - 165 * this.def.size, vx: U.rand(-1, 1), vy: -1, life: 20, size: 5, color: '#ffeb3b', type: 'star' });
        if (this.timer <= 0) {
          this.state = 'idle';
          this.guard = 100;
        }
        break;
      case 'ko':
      case 'victory':
      case 'intro':
        this.vx *= this.onGround ? 0.85 : 1;
        break;
    }
    this.physics();
    this.updatePose();
  }

  groundNeutral() {
    const inp = this.input;
    const st = this.def.stats;
    const dx = inp.dirX();
    const sp = this.spd();
    this.faceOpp();
    if (this.tryAttack()) return;
    if (inp.pressed('up') || inp.pressed('jump')) {
      inp.consume('up');
      inp.consume('jump');
      this.state = 'jumpsquat';
      this.timer = 3;
      return;
    }
    if (inp.pressed('D')) {
      inp.consume('D');
      this.startDash(dx || this.facing);
      return;
    }
    if (inp.dbl.left) return this.startDash(-1);
    if (inp.dbl.right) return this.startDash(1);
    if (inp.held.down) {
      this.state = 'crouch';
      this.vx *= 0.6;
      return;
    }
    if (this.state === 'run' && inp.held.D && dx === this.runDir) {
      this.vx = dx * st.run * sp;
      if (this.animT % 5 === 0) this.g.dust(this.x - dx * 20, 0, 1);
      return;
    }
    if (dx) {
      this.state = 'walk';
      const target = dx * st.walk * sp * (dx === this.facing ? 1 : 0.85);
      this.vx += (target - this.vx) * 0.5;
    } else {
      this.state = 'idle';
      this.vx *= 0.6;
    }
  }

  airNeutral() {
    const inp = this.input;
    const st = this.def.stats;
    const dx = inp.dirX();
    this.faceOpp();
    if (this.tryAttack()) return;
    if ((inp.pressed('up') || inp.pressed('jump')) && this.airJumps > 0) {
      inp.consume('up');
      inp.consume('jump');
      this.airJumps--;
      this.vy = -st.jump * 0.92;
      this.vx = dx * st.airSpeed * this.spd();
      SFX.play('jump');
      this.g.particle({ x: this.x, y: this.y, vx: 0, vy: 0, life: 14, size: 30, color: '#ffffff', type: 'ring' });
      return;
    }
    if (inp.pressed('D') && this.airDashes > 0) {
      inp.consume('D');
      this.airDashes--;
      this.state = 'airdash';
      this.timer = 0;
      this.dashDir = dx || this.facing;
      SFX.play('dash');
      return;
    }
    if (dx) this.vx += (dx * st.airSpeed * this.spd() - this.vx) * 0.18;
    if (inp.held.down && this.vy > -3) this.vy = Math.max(this.vy, st.fastFall);
  }

  startDash(dir) {
    this.state = 'dash';
    this.timer = 0;
    this.dashDir = dir;
    this.backDash = dir !== this.facing;
    if (this.backDash) this.inv = Math.max(this.inv, 8);
    SFX.play('dash');
    this.g.dust(this.x, 0, 4);
  }

  doJump(keepMomentum) {
    const inp = this.input;
    const st = this.def.stats;
    const dx = inp.dirX();
    this.vy = -st.jump;
    const air = st.airSpeed * this.spd();
    if (keepMomentum || this.state === 'run') this.vx = dx ? dx * Math.max(air, Math.abs(this.vx) * 0.85) : this.vx * 0.6;
    else this.vx = dx * air;
    this.onGround = false;
    this.y = -1;
    this.state = 'air';
    SFX.play('jump');
    this.g.dust(this.x, 0, 4);
  }

  tryAttack() {
    const inp = this.input;
    const air = !this.onGround;
    if (inp.pressed('SU') && this.meter >= 100 && this.def.super) {
      inp.consume('SU');
      this.startSuper();
      return true;
    }
    if (inp.pressed('FL')) {
      inp.consume('FL');
      if (this.startFlow()) return true;
    }
    if (inp.pressed('S')) {
      const dx = inp.dirX();
      const v = inp.held.up ? 'U' : inp.held.down ? 'D' : dx !== 0 ? 'F' : 'N';
      const m = this.def.specials[v];
      if (m && this.cd[v] <= 0 && (!air || m.airOk)) {
        inp.consume('S');
        if (v === 'F') this.facing = dx;
        this.cd[v] = m.cooldown;
        this.startMove(m);
        return true;
      }
    }
    if (inp.pressed('H')) {
      inp.consume('H');
      this.startMove(air ? NORMALS.AH : inp.held.up ? NORMALS.UH : inp.held.down ? NORMALS.DH : NORMALS.H);
      return true;
    }
    if (inp.pressed('L')) {
      inp.consume('L');
      this.startMove(air ? NORMALS.AL : inp.held.down ? NORMALS.CL : NORMALS.L1);
      return true;
    }
    return false;
  }

  // Returns false (and flashes a warning) when there isn't enough meter.
  startFlow() {
    if (this.meter < FLOW_COST) {
      this.g.text('NEED METER', this.x, this.y - 190, '#80d8ff', 0.8);
      return false;
    }
    this.meter -= FLOW_COST;
    this.startMove(FLOW_MOVE);
    this.vx *= 0.3;
    SFX.play('whoosh');
    this.g.particle({ x: this.x, y: this.y - 75 * this.def.size, vx: 0, vy: 0, life: 14, size: 70, color: '#80d8ff', type: 'ring' });
    return true;
  }

  startSuper() {
    this.meter -= 100;
    this.startMove(this.def.super);
    this.g.superFlash(this);
  }

  startMove(m) {
    this.move = m;
    this.mf = 0;
    this.state = 'attack';
    this.moveHit = false;
    this.moveBlocked = false;
    this.lastHitMf = -99;
    this.moveSerial++;
    this.armorUsed = false;
    this.slamDive = false;
    this.hidden = false;
    if (m.lunge && this.onGround) this.vx += this.facing * m.lunge;
  }

  runMove() {
    const m = this.move;
    const inp = this.input;
    this.mf++;
    if (m.onFrame) m.onFrame(this, this.g, this.mf, m);
    if (this.state !== 'attack' || this.move !== m) return;
    if (this.mf === m.startup + 1 && (m.type === 'light' || m.type === 'heavy')) SFX.play('whoosh');

    if (this.mf > m.startup) {
      // light chains work even on whiff for fluid pressure
      if (m.type === 'light' && m.chain && this.onGround && inp.pressed('L') && !inp.held.down) {
        inp.consume('L');
        this.startMove(NORMALS[m.chain]);
        return;
      }
      if (this.moveHit || this.moveBlocked) {
        if ((m.type === 'light' || m.type === 'heavy') && this.tryCancel(m)) return;
        if (m.type === 'special' && inp.pressed('SU') && this.meter >= 100 && this.def.super) {
          inp.consume('SU');
          this.startSuper();
          return;
        }
      }
    }
    if (this.mf >= m.total) {
      this.move = null;
      this.hidden = false;
      this.slamDive = false;
      this.state = this.onGround ? 'idle' : 'air';
    }
  }

  tryCancel(m) {
    const inp = this.input;
    if (this.moveHit && (inp.pressed('up') || inp.pressed('jump'))) {
      if (this.onGround) {
        inp.consume('up');
        inp.consume('jump');
        this.move = null;
        this.doJump(true);
        return true;
      }
      if (this.airJumps > 0) {
        this.move = null;
        this.state = 'air';
        this.airNeutral();
        return true;
      }
    }
    if (inp.pressed('D')) {
      inp.consume('D');
      this.move = null;
      if (this.onGround) this.startDash(inp.dirX() || this.facing);
      else if (this.airDashes > 0) {
        this.airDashes--;
        this.state = 'airdash';
        this.timer = 0;
        this.dashDir = inp.dirX() || this.facing;
        SFX.play('dash');
      } else this.state = 'air';
      return true;
    }
    if (inp.pressed('S') || inp.pressed('SU')) return this.tryAttack();
    if (m.type === 'light' && inp.pressed('H')) return this.tryAttack();
    if (m.air && m.type === 'light' && inp.pressed('L')) return this.tryAttack();
    return false;
  }

  // ------------------------------------------------------------ physics
  physics() {
    const st = this.def.stats;
    const m = this.move;
    const g = this.g;
    let grav = st.gravity;
    const inActive = this.state === 'attack' && m && this.mf > m.startup && this.mf <= m.startup + m.active;
    if (this.state === 'airdash') grav = 0;
    if (this.state === 'attack' && m) {
      if (m.noGravActive && inActive) grav = 0;
      else if (m.airStall && !this.onGround && this.mf <= m.startup + m.active) {
        grav *= 0.25;
        this.vy *= 0.8;
      }
    }
    if (this.state === 'hit' && this.combo > 7) grav *= 1 + (this.combo - 7) * 0.06;
    if (!this.onGround) this.vy = Math.min(this.vy + grav, 30);

    if (this.onGround && this.state === 'attack' && !(m && m.noGravActive && inActive)) this.vx *= 0.84;

    this.x += this.vx;
    this.y += this.vy;
    if (this.y >= 0) {
      this.y = 0;
      const landingVy = this.vy;
      this.vy = 0;
      if (!this.onGround) {
        this.onGround = true;
        this.land(landingVy);
      }
    } else this.onGround = false;

    if (this.x < g.stage.left) {
      this.x = g.stage.left;
      if (this.vx < 0) this.vx = this.state === 'hit' ? -this.vx * 0.2 : 0;
    } else if (this.x > g.stage.right) {
      this.x = g.stage.right;
      if (this.vx > 0) this.vx = this.state === 'hit' ? -this.vx * 0.2 : 0;
    }
  }

  land(vy) {
    const st = this.def.stats;
    this.airJumps = st.airJumps;
    this.airDashes = st.airDash;
    if (vy > 8) this.g.dust(this.x, 0, 5);
    switch (this.state) {
      case 'air':
      case 'airdash':
        this.state = 'land';
        this.timer = 2;
        this.faceOpp();
        break;
      case 'attack':
        if (this.move.onLand && this.move.onLand(this, this.g, this.move)) break;
        if (this.move.air) {
          this.move = null;
          this.state = 'land';
          this.timer = 4;
        }
        break;
      case 'hit':
      case 'ko':
        if (this.knockdown || this.state === 'ko') {
          if (vy > 7 && !this.bounced) {
            this.bounced = true;
            this.vy = -vy * 0.45;
            this.y = -1;
            this.onGround = false;
            this.g.shake = Math.max(this.g.shake, 6);
            this.g.dust(this.x, 0, 8);
            SFX.play('hitL');
            return;
          }
          if (this.state === 'hit') {
            this.state = 'down';
            this.timer = 34;
          }
          this.vx *= 0.5;
        }
        break;
    }
  }

  // ------------------------------------------------------------ getting hit
  takeHit(hit, att, srcX, dir, hz) {
    const g = this.g;
    if (this.state === 'ko' || this.isInvuln()) return 'none';
    const m = this.move;
    if (this.state === 'attack' && m && m.counter && this.mf > m.startup && this.mf <= m.startup + m.active) {
      this.doCounter(att, hz);
      return 'countered';
    }
    if (this.state === 'attack' && m && m.flow && this.mf > m.startup && this.mf <= m.startup + m.active && !hit.super) {
      this.doFlow(att, hz);
      return 'flowed';
    }
    const s = this.status;
    const srcSide = U.sign(srcX - this.x) || -this.facing;
    const cx = this.x + srcSide * 22;
    const cy = this.y - 95 * this.def.size;

    // blocking: hold away from the attack while grounded and not busy.
    // Lows must be blocked crouching (down-back), overheads (attacks from
    // the air) standing (back); mids can be blocked either way.
    const holdingBack = CAN_BLOCK.has(this.state) && this.onGround && this.input.dirX() === -srcSide && !hit.unblockable && s.freeze <= 0;
    const low = hz ? !!(hz.ground || hz.groundOnly) : !!(att.move && att.move.low);
    const overhead = !hz && !att.onGround;
    const crouching = !!this.input.held.down;
    const wrongHeight = holdingBack && ((low && !crouching) || (overhead && crouching));
    if (holdingBack && !wrongHeight) {
      const dmg = hit.dmg * att.pow();
      const chip = hit.special ? Math.round(dmg * 0.12) : 0;
      this.hp = Math.max(1, this.hp - chip);
      this.lastDmg = chip;
      this.guard -= dmg * 0.45 + (hit.super ? 25 : 0);
      this.guardRegenDelay = 70;
      this.state = 'block';
      this.crouchBlock = this.input.held.down;
      this.timer = Math.round(hit.block ?? hit.stun * 0.7);
      const push = -srcSide * (Math.abs(hit.kb[0]) * 0.8 + 2);
      this.vx = push;
      if (!hz && (this.x <= g.stage.left + 5 || this.x >= g.stage.right - 5)) att.vx -= push * 0.8;
      const hs = Math.round((hit.hitstop ?? 7) * 0.7);
      this.hitstop = hs;
      if (!hz) att.hitstop = hs;
      att.meter = Math.min(100, att.meter + dmg * 0.08);
      this.meter = Math.min(100, this.meter + dmg * 0.12);
      SFX.play('block');
      for (let i = 0; i < 6; i++) g.particle({ x: cx, y: cy + U.rand(-20, 20), vx: srcSide * -U.rand(1, 5), vy: U.rand(-3, 3), life: 12, size: 4, color: '#8fd3ff', type: 'spark' });
      g.particle({ x: cx, y: cy, vx: 0, vy: 0, life: 10, size: 26, color: '#8fd3ff', type: 'ring' });
      if (this.guard <= 0) {
        this.guard = 0;
        this.state = 'stunned';
        this.timer = 80;
        g.text('GUARD BREAK!', this.x, this.y - 200, '#ffeb3b', 1.2);
        SFX.play('boom');
        g.shake = 14;
      }
      return 'block';
    }

    let dmg = hit.dmg * att.pow();
    if (this.isArmored() && !hit.super) {
      if (s.armor > 0) s.armor = Math.max(0, s.armor - 70);
      else this.armorUsed = true;
      dmg = Math.round(dmg * 0.7);
      this.hp = Math.max(this.hp - dmg, 1);
      this.lastDmg = dmg;
      this.flash = 8;
      const hs = Math.round((hit.hitstop ?? 7) * 0.8);
      this.hitstop = hs;
      if (!hz) att.hitstop = hs;
      SFX.play('block');
      g.particle({ x: cx, y: cy, vx: 0, vy: 0, life: 12, size: 40, color: '#ffffff', type: 'ring' });
      g.text('ARMOR', this.x, this.y - 190, '#cfd8dc', 0.8);
      return 'armor';
    }

    const continuing = this.state === 'hit' || this.state === 'stunned' || s.freeze > 0;
    this.combo = continuing ? this.combo + 1 : 1;
    if (!continuing) this.comboDmg = 0;
    // damage scaling: each hit in a combo does less, and once a combo has
    // done about a third of this fighter's health the rest is halved
    let scale = Math.max(0.25, 1 - 0.1 * (this.combo - 1));
    if (continuing && this.comboDmg > this.maxHp * COMBO_SOFT_CAP) scale *= 0.5;
    // counter hit: hit during an attack's startup, during a whiffed Flow's
    // recovery, or by a fighter whose Flow just succeeded
    const flowPunish = this.state === 'attack' && m && m.flow && this.mf > m.startup + m.active;
    const flowCounter = att.status.flow > 0;
    if (flowCounter) att.status.flow = 0;
    const counterHit = (this.state === 'attack' && m && this.mf <= m.startup) || flowPunish || flowCounter;
    dmg *= scale * (counterHit ? 1.2 : 1);
    if (s.freeze > 0 && !s.freezePersist) {
      s.freeze = 0;
      dmg += 20;
      fxBurst(g, this.x, this.y - 80, '#e0f7fa', 20, 9);
    }
    dmg = Math.max(1, Math.round(dmg));
    this.hp -= dmg;
    this.lastDmg = dmg;
    this.comboDmg += dmg;
    this.comboShow = 90;
    if (!hit.super) att.gainMeter(dmg * 0.35);
    this.gainMeter(dmg * 0.35);
    if (this.adrenaline() && !this.adrenalineShown && this.hp > 0) {
      this.adrenalineShown = true;
      g.text('ADRENALINE!', this.x, this.y - 240, '#ff5252', 1.1);
    }

    let stun = hit.stun * Math.max(0.45, 1 - 0.05 * (this.combo - 1)) + (counterHit ? 8 : 0);
    if (hit.effect && hit.effect.type === 'shock') stun += 10;
    this.state = 'hit';
    this.timer = Math.round(stun);
    this.move = null;
    this.hidden = false;
    this.slamDive = false;
    this.knockdown = !!hit.knockdown;
    this.bounced = false;

    const w = Math.sqrt(this.def.stats.weight);
    const kx = (hit.kb[0] * dir) / w;
    const ky = hit.kb[1] / w;
    this.vx = kx;
    if (ky < 0) {
      this.vy = ky;
      this.onGround = false;
      this.y = Math.min(this.y, -1);
    } else if (!this.onGround) {
      this.vy = hit.spike ? ky : Math.min(this.vy, -3.5);
    } else this.vy = 0;
    if (!hz && this.onGround && (this.x <= g.stage.left + 5 || this.x >= g.stage.right - 5)) att.vx -= kx * 0.6;

    const hs = (hit.hitstop ?? 7) + (counterHit ? 4 : 0);
    this.hitstop = hs;
    if (!hz) att.hitstop = hit.hitstop ?? 7;
    this.flash = 5;

    if (hit.effect) this.applyEffect(hit.effect);
    if (wrongHeight) g.text(low ? 'LOW!' : 'OVERHEAD!', this.x, this.y - 230, '#ffab40', 1);
    if (flowCounter) g.text('FLOW COUNTER!', this.x, this.y - 200, '#80d8ff', 1.1);
    else if (flowPunish) g.text('PUNISH!', this.x, this.y - 200, '#ff5252', 1);
    else if (counterHit) g.text('COUNTER!', this.x, this.y - 200, '#ff5252', 1);

    const big = dmg >= 55 || hit.super;
    SFX.play(big ? 'hitH' : 'hitL');
    const col = att.def.color;
    for (let i = 0; i < (big ? 14 : 8); i++) {
      g.particle({ x: cx, y: cy + U.rand(-15, 15), vx: dir * U.rand(2, 10) + U.rand(-2, 2), vy: U.rand(-6, 4), life: U.randi(10, 20), size: U.rand(3, 6), color: i % 2 ? '#ffffff' : col, type: 'spark' });
    }
    g.particle({ x: cx, y: cy, vx: 0, vy: 0, life: 10, size: big ? 60 : 36, color: '#ffffff', type: 'ring' });
    g.shake = Math.max(g.shake, big ? 9 : 4);

    if (this.hp <= 0 && g.noKO) this.hp = 1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'ko';
      this.knockdown = true;
      this.vy = Math.min(this.vy, -10);
      this.vx = dir * 9;
      this.onGround = false;
      this.y = Math.min(this.y, -1);
      s.freeze = 0;
      g.onKO(this, att);
    }
    return 'hit';
  }

  applyEffect(e) {
    const s = this.status;
    switch (e.type) {
      case 'burn':
        s.burn = Math.max(s.burn, e.dur);
        s.burnPow = e.pow;
        break;
      case 'poison':
        s.poison = Math.max(s.poison, e.dur);
        s.poisonPow = e.pow;
        break;
      case 'slow':
        s.slow = Math.max(s.slow, e.dur);
        break;
      case 'freeze':
        s.freeze = e.dur;
        s.freezePersist = !!e.persist;
        break;
      case 'shock':
        for (let i = 0; i < 8; i++) this.g.particle({ x: this.x + U.rand(-30, 30), y: this.y - U.rand(20, 150), vx: U.rand(-4, 4), vy: U.rand(-4, 4), life: 10, size: 4, color: '#ffee58', type: 'spark' });
        break;
    }
  }

  tickStatus() {
    const s = this.status;
    const g = this.g;
    const alive = this.state !== 'ko';
    if (s.burn > 0) {
      s.burn--;
      if (s.burn % 15 === 0 && alive) this.hp = Math.max(1, this.hp - s.burnPow);
      if (s.burn % 3 === 0) g.particle({ x: this.x + U.rand(-22, 22), y: this.y - U.rand(10, 140), vx: 0, vy: -2.5, life: 18, size: U.rand(4, 8), color: U.pick(['#ff7043', '#ffab00', '#ff3d00']) });
    }
    if (s.poison > 0) {
      s.poison--;
      if (s.poison % 20 === 0 && alive) this.hp = Math.max(1, this.hp - s.poisonPow);
      if (s.poison % 5 === 0) g.particle({ x: this.x + U.rand(-22, 22), y: this.y - U.rand(10, 140), vx: 0, vy: -1.2, life: 24, size: U.rand(3, 6), color: '#c6ff00' });
    }
    if (s.slow > 0) {
      s.slow--;
      if (s.slow % 8 === 0) g.particle({ x: this.x + U.rand(-25, 25), y: this.y - U.rand(0, 40), vx: 0, vy: -0.5, life: 20, size: 3, color: '#b3e5fc' });
    }
    if (s.heal > 0) {
      s.heal--;
      if (alive) this.hp = Math.min(this.maxHp, this.hp + s.healPer);
      if (s.heal % 6 === 0) g.particle({ x: this.x + U.rand(-30, 30), y: this.y - U.rand(0, 140), vx: 0, vy: -2, life: 24, size: 5, color: '#69f0ae', type: 'plus' });
    }
    for (const k of ['armor', 'speed', 'power', 'flow']) if (s[k] > 0) s[k]--;
  }

  // A hit landed during Flow Stance: slip past it and punish.
  doFlow(att, hz) {
    const g = this.g;
    SFX.play('counter');
    g.text('FLOW!', this.x, this.y - 200, '#80d8ff', 1.2);
    g.flash = 5;
    g.flashColor = '#b3e5fc';
    this.meter = Math.min(100, this.meter + FLOW_REFUND);
    this.inv = 16;
    this.status.flow = 90;
    this.afterimage('#80d8ff');
    if (hz) {
      if (!hz.follow && !hz.trap) hz.dead = true;
    } else {
      att.hitstop = Math.max(att.hitstop, 18);
      this.x = U.clamp(this.x - this.facing * 34, g.stage.left, g.stage.right);
    }
    g.particle({ x: this.x, y: this.y - 75 * this.def.size, vx: 0, vy: 0, life: 16, size: 90, color: '#80d8ff', type: 'ring' });
    fxBurst(g, this.x, this.y - 80, '#b3e5fc', 16, 8);
    this.move = null;
    this.state = this.onGround ? 'idle' : 'air';
  }

  doCounter(att, hz) {
    const g = this.g;
    const c = this.move.counter;
    SFX.play('counter');
    g.text('PARRY!', this.x, this.y - 200, this.def.color, 1.1);
    g.flash = 6;
    g.flashColor = this.def.color;
    this.inv = 24;
    if (hz) {
      if (c.reflect && !hz.follow && Math.abs(hz.vx) > 1) {
        hz.owner = this;
        hz.vx = -hz.vx * 1.3;
        hz.facing = -hz.facing;
        hz.hitLog.clear();
        hz.life = Math.max(hz.life, 60);
        hz.boomerang = 0;
        hz.homing = 0;
      } else if (!hz.follow && !hz.trap && Math.abs(hz.vx) > 1) hz.dead = true;
      this.startMove(COUNTER_RECOVER);
      return;
    }
    if (Math.abs(att.x - this.x) < 420) {
      const side = U.sign(att.x - this.x) || this.facing;
      if (!c.reflect) {
        fxBurst(g, this.x, this.y - 70, this.def.color, 14, 7);
        this.x = U.clamp(att.x + side * 80, g.stage.left, g.stage.right);
        this.facing = -side;
        fxBurst(g, this.x, this.y - 70, this.def.color, 14, 7);
      } else this.facing = side;
      this.startMove(COUNTER_RECOVER);
      att.takeHit(HIT(Object.assign({ special: true }, c.strike)), this, this.x, U.sign(att.x - this.x) || this.facing, null);
      return;
    }
    this.startMove(COUNTER_RECOVER);
  }

  // ------------------------------------------------------------ animation
  targetPose() {
    const t = this.animT;
    const m = this.move;
    const cp = (p) => ({ lean: p.lean, head: p.head, fa: [p.fa[0], p.fa[1]], ba: [p.ba[0], p.ba[1]], fl: [p.fl[0], p.fl[1]], bl: [p.bl[0], p.bl[1]], rot: p.rot, oy: p.oy });
    switch (this.state) {
      case 'idle':
      case 'intro': {
        const p = cp(POSES.idle);
        const b = Math.sin(t * 0.12);
        p.lean += b * 2;
        p.fa[0] += b * 5;
        p.ba[0] -= b * 4;
        return p;
      }
      case 'walk': {
        this.walkPh += Math.abs(this.vx) * 0.07;
        const ph = this.walkPh;
        const p = cp(POSES.idle);
        p.lean = 10;
        p.fl = [5 + 32 * Math.sin(ph), -12 - 35 * Math.max(0, Math.cos(ph))];
        p.bl = [5 - 32 * Math.sin(ph), -12 - 35 * Math.max(0, -Math.cos(ph))];
        if (U.sign(this.vx) !== this.facing) {
          p.fl[0] = 5 - 32 * Math.sin(ph);
          p.bl[0] = 5 + 32 * Math.sin(ph);
          p.lean = 0;
        }
        return p;
      }
      case 'run': {
        this.walkPh += Math.abs(this.vx) * 0.05;
        const ph = this.walkPh;
        const p = cp(POSES.dash);
        p.fl = [20 + 50 * Math.sin(ph), -30 - 60 * Math.max(0, Math.cos(ph))];
        p.bl = [20 - 50 * Math.sin(ph), -30 - 60 * Math.max(0, -Math.cos(ph))];
        p.fa = [-10 - 40 * Math.sin(ph), 90];
        p.ba = [-10 + 40 * Math.sin(ph), 90];
        return p;
      }
      case 'dash':
        return cp(this.backDash ? POSES.backdash : POSES.dash);
      case 'airdash':
        return cp(POSES.dash);
      case 'crouch':
      case 'jumpsquat':
      case 'land':
      case 'getup':
        return cp(POSES.crouch);
      case 'air':
        return cp(this.vy < 0 ? POSES.jump : POSES.fall);
      case 'block':
        return cp(this.crouchBlock ? POSES.cblock : POSES.block);
      case 'hit':
        if (this.onGround) return cp(POSES.hit);
        {
          const p = cp(POSES.tumble);
          p.rot = U.clamp(-15 - this.vy * 2.5, -80, 30);
          return p;
        }
      case 'down':
        return cp(POSES.lying);
      case 'ko':
        if (this.onGround) return cp(POSES.lying);
        {
          const p = cp(POSES.tumble);
          p.rot = U.clamp(-30 - this.vy * 3, -90, 20);
          return p;
        }
      case 'stunned': {
        const p = cp(POSES.stunned);
        p.lean += Math.sin(t * 0.15) * 10;
        return p;
      }
      case 'victory': {
        const p = cp(POSES.victory);
        p.fa[0] += Math.sin(t * 0.2) * 8;
        return p;
      }
      case 'attack': {
        if (!m || !m.pose) return cp(POSES.idle);
        if (this.mf <= m.startup) return cp(m.pose.wind);
        if (this.mf > m.startup + m.active + m.recovery * 0.6) return cp(this.onGround ? POSES.idle : POSES.fall);
        const p = cp(m.pose.strike);
        if (m.kind === 'rising') p.rot = 0;
        return p;
      }
    }
    return cp(POSES.idle);
  }

  updatePose() {
    const tp = this.targetPose();
    const k = this.state === 'attack' ? 0.6 : this.state === 'hit' ? 0.5 : 0.3;
    const p = this.pose;
    const L = U.lerp;
    p.lean = L(p.lean, tp.lean, k);
    p.head = L(p.head, tp.head, k);
    p.rot = L(p.rot, tp.rot, k);
    p.oy = L(p.oy, tp.oy, k);
    for (const key of ['fa', 'ba', 'fl', 'bl']) {
      p[key][0] = L(p[key][0], tp[key][0], k);
      p[key][1] = L(p[key][1], tp[key][1], k);
    }
  }
}
