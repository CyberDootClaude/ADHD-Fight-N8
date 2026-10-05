// CPU opponent. It drives a virtual controller so it plays by the same rules as humans.
// punish = chance to punish a whiffed attack, adapt = how much it learns your habits,
// style = how strongly it sticks to its character's game plan.
const AI_LEVELS = {
  easy: { react: 20, block: 0.2, aggro: 0.45, combo: 0.25, special: 0.25, think: 14, flow: 0, height: 0.5, punish: 0.1, adapt: 0, style: 0.4 },
  normal: { react: 11, block: 0.5, aggro: 0.6, combo: 0.6, special: 0.35, think: 8, flow: 0.08, height: 0.75, punish: 0.45, adapt: 0.5, style: 0.8 },
  hard: { react: 5, block: 0.8, aggro: 0.75, combo: 0.9, special: 0.45, think: 4, flow: 0.18, height: 0.95, punish: 0.85, adapt: 1, style: 1 },
  dummy: null,
};

// Each character's game plan. zone = projectile/trap use, rush = how often it
// dashes in, retreat = how often it backs off up close.
const AI_STYLES = {
  zoner: { zone: 1.6, rush: 0.6, retreat: 0.2 },
  rushdown: { zone: 0.45, rush: 1.45, retreat: 0.03 },
  heavy: { zone: 0.8, rush: 0.85, retreat: 0.02, walk: true },
  allround: { zone: 1, rush: 1, retreat: 0.1 },
};
const AI_STYLE_OF = {
  kaze: 'rushdown', ember: 'rushdown', umbra: 'rushdown', viper: 'rushdown',
  granite: 'heavy', ferrus: 'heavy', magna: 'heavy',
  nivia: 'zoner', nova: 'zoner', echo: 'zoner',
  lumi: 'allround', marina: 'allround', volta: 'allround', thorn: 'allround', sahar: 'allround', chrono: 'allround',
};

// What kind of attack the opponent just started, for habit tracking.
function habitOf(m, opp, prevState, me) {
  if (m.type === 'flow') return 'flow';
  if (m.type === 'throw') return 'throw';
  if (prevState === 'getup') return 'wakeup';
  if (!opp.onGround && Math.abs(opp.x - me.x) < 380) return 'air';
  if (m.low) return 'low';
  if (m.kind === 'projectile' || m.kind === 'beam' || m.kind === 'rain' || m.kind === 'pillar') return 'zone';
  if (m.kind === 'rush' || m.kind === 'teleport') return 'rush';
  return 'mid';
}

// What's coming at `me`: is there a threat, and does it have to be blocked
// low (crouching) or high (standing)?
function threatInfo(me, opp, g, meleeRange, projRange) {
  const r = { threat: false, low: false, overhead: false };
  const dist = Math.abs(opp.x - me.x);
  const m = opp.move;
  if (opp.state === 'attack' && m && m.type !== 'flow' && dist < meleeRange + (m.kind === 'rush' ? 250 : 0)) {
    r.threat = true;
    if (m.low) r.low = true;
    else if (!opp.onGround) r.overhead = true;
  }
  for (const h of g.hazards) {
    if (h.owner === me || !h.hit || h.dead) continue;
    const dx = me.x - h.x;
    const approaching = Math.abs(h.vx) > 1 ? U.sign(h.vx) === U.sign(dx) : true;
    const near = h.delay > 0 ? Math.abs(dx) < 200 : approaching && Math.abs(dx) < projRange + Math.max(h.w, h.h) / 2 && h.y > -300;
    if (!near) continue;
    r.threat = true;
    if (h.ground || h.groundOnly) r.low = true;
  }
  return r;
}

class AIController {
  constructor(level) {
    this.cfg = AI_LEVELS[level] || null;
    this.raw = {};
    this.plan = [];
    this.wait = 0;
    this.threatSeen = 0;
    this.threatHandled = false;
    this.habit = { air: 0, low: 0, zone: 0, rush: 0, flow: 0, throw: 0, wakeup: 0, mid: 0 };
    this.oppSerial = -1;
    this.oppPrev = 'idle';
    this.punished = -1;
    this.antiAirFor = -1;
  }

  // Has the opponent been leaning on this habit lately? (0..1, scaled by level)
  leans(k) {
    const c = this.cfg;
    return c.adapt * U.clamp((this.habit[k] - 1.2) / 2, 0, 1);
  }

  // Watch the opponent every frame: learn habits, punish whiffs, catch jump-ins.
  watch(me, opp, g) {
    const c = this.cfg;
    const m = opp.move;
    if (opp.state === 'attack' && m && opp.moveSerial !== this.oppSerial) {
      this.oppSerial = opp.moveSerial;
      for (const k in this.habit) this.habit[k] *= 0.85;
      this.habit[habitOf(m, opp, this.oppPrev, me)] += 1;
    }
    if (opp.state !== 'attack') this.oppPrev = opp.state;
    if (opp.onGround) this.oppGround = true;
    else if (this.oppGround) {
      this.oppGround = false;
      this.jumpN = (this.jumpN || 0) + 1;
    }

    const free = ['idle', 'walk', 'crouch', 'run'].includes(me.state);
    if (!free || !me.onGround) return;
    const dist = Math.abs(opp.x - me.x);
    const sp = me.def.specials;

    // whiff punish: the opponent's attack missed and they're stuck in recovery
    if (opp.state === 'attack' && m && !opp.moveHit && opp.moveSerial !== this.punished) {
      const end = m.startup + m.active;
      const left = m.total - opp.mf;
      const blockedLong = opp.moveBlocked && m.type !== 'light' && left >= 14;
      if (opp.mf > end + Math.floor(c.react / 2) && left >= 8 && (!opp.moveBlocked || blockedLong) && opp.onGround) {
        this.punished = opp.moveSerial;
        if (!U.chance(c.punish)) return;
        if (dist < 150) {
          this.plan = [];
          if (left >= 14 && U.chance(0.5)) {
            this.tap({ H: true }, 4);
            if (U.chance(c.combo)) this.tap({ fwd: true, S: true }, 4);
          } else {
            this.tap({ L: true }, 4);
            this.tap({ L: true }, 4);
            this.tap({ L: true }, 5);
            if (U.chance(c.combo)) this.tap({ H: true }, 5);
          }
          g.cpuPunish = (g.cpuPunish || 0) + 1;
        } else if (dist < 450 && left >= 10 && me.cd.F <= 0 && (sp.F.kind === 'rush' || sp.F.kind === 'teleport')) {
          this.plan = [];
          this.tap({ fwd: true, S: true }, 6);
          g.cpuPunish = (g.cpuPunish || 0) + 1;
        } else if (dist < 320 && left >= 10 && !g.classic) {
          // dash in and jab
          this.plan = [];
          this.tap({ fwd: true, D: true }, Math.max(1, Math.round((dist - 120) / 25)));
          this.tap({ L: true }, 4);
          this.tap({ L: true }, 4);
          this.tap({ L: true }, 5);
          g.cpuPunish = (g.cpuPunish || 0) + 1;
        } else if (dist < 700 && left >= 14 && me.cd.N <= 0 && sp.N.kind === 'projectile') {
          this.plan = [];
          this.tap({ S: true }, 6);
          g.cpuPunish = (g.cpuPunish || 0) + 1;
        }
        return;
      }
    }

    // the opponent is in Flow stance: don't swing into it, wait for the recovery
    if (opp.state === 'attack' && m && m.type === 'flow' && opp.mf <= m.startup + m.active && U.chance(c.punish * 0.15)) {
      if (this.plan.length && this.plan.some((st) => st.k.L || st.k.H || st.k.S)) {
        this.plan = [];
        if (g.classic && dist < CLASSIC.throwRange) this.tap({ fwd: true, H: true }, 4);
        else this.push({ back: true }, 6);
      }
      return;
    }

    // jump-in habit: anti-air on reaction as they come in
    if (!opp.onGround && opp.state !== 'hit' && opp.y < -40 && this.antiAirFor !== this.jumpN && U.sign(opp.vx) === U.sign(me.x - opp.x)) {
      // swing so the anti-air is out when they arrive, not before
      const rising = sp.U.kind === 'rising' && me.cd.U <= 0;
      const su = rising ? sp.U.startup : me.N.UH.startup;
      const arrive = dist - Math.abs(opp.vx) * (su + 1);
      if (arrive < (rising ? 90 : 110)) {
        this.antiAirFor = this.jumpN;
        if (U.chance(this.leans('air') * 0.9)) {
          g.cpuAA = (g.cpuAA || 0) + 1;
          this.plan = [];
          if (rising && U.chance(0.6)) this.tap({ up: true, S: true }, 4);
          else this.tap({ up: true, H: true }, 4);
        }
      }
    }

    // projectile habit: get past their zoning instead of trading
    if (this.habit.zone > 1.5) {
      const h = g.hazards.find((q) => q.owner === opp && q.hit && !q.dead && Math.abs(q.vx) > 1 && U.sign(q.vx) === U.sign(me.x - q.x) && Math.abs(q.x - me.x) < 330);
      if (h && h !== this.dodged && U.chance(this.leans('zone') * 0.8)) {
        this.dodged = h;
        this.plan = [];
        if (me.meter >= FLOW_COST + 25 && U.chance(0.25)) this.tap({ FL: true });
        else if (!h.ground && !h.groundOnly && U.chance(0.4)) this.tap({ down: true }, 4); // duck under / block low
        else this.tap({ fwd: true, up: true }, 8);
      }
    }
  }

  // Plan step: { k: {fwd, back, up, down, L, H, S, D, SU}, f: frames }
  push(k, f = 2) {
    this.plan.push({ k, f });
  }
  tap(k, gap = 1) {
    this.push(k, 2);
    this.push({ fwd: k.fwd, back: k.back, down: k.down }, gap);
  }

  update(me, opp, g) {
    this.raw = {};
    const c = this.cfg;
    if (!c || !me || g.inputLocked) return this.raw;
    if (me.state === 'thrown') {
      // try to break the throw by pressing Heavy
      this.plan = [];
      if (!this.techDecided) {
        this.techDecided = true;
        this.techTry = U.chance(Math.min(0.95, c.block * 0.7 + this.leans('throw') * 0.35));
      }
      if (this.techTry && me.timer < CLASSIC.throwTech - 3) this.raw.H = true;
      return this.raw;
    }
    this.techDecided = false;
    if (me.state === 'hit' || me.state === 'down' || me.state === 'ko' || me.state === 'stunned' || me.status.freeze > 0) {
      this.plan = [];
      this.wait = U.randi(0, c.react);
      return this.raw;
    }
    this.watch(me, opp, g);
    this.defend(me, opp, g);
    if (!this.plan.length) {
      if (this.wait > 0) this.wait--;
      else this.decide(me, opp, g);
    }
    const step = this.plan[0];
    if (step) {
      const k = step.k;
      const f = me.facing;
      if (k.fwd) this.raw[f > 0 ? 'right' : 'left'] = true;
      if (k.back) this.raw[f > 0 ? 'left' : 'right'] = true;
      for (const b of ['up', 'down', 'L', 'H', 'S', 'D', 'SU', 'FL']) if (k[b]) this.raw[b] = true;
      if (k.guard && this.guardLow) this.raw.down = true;
      if (--step.f <= 0) this.plan.shift();
    }
    return this.raw;
  }

  defend(me, opp, g) {
    const c = this.cfg;
    const t = threatInfo(me, opp, g, 280, 300);
    const threat = t.threat;
    // guess the right height; weaker CPUs guess wrong more often
    if (threat && this.threatSeen === 0) {
      // reading habits makes the right guard height more likely
      const read = t.low ? this.leans('low') : t.overhead ? this.leans('air') : 0;
      this.guardRight = U.chance(Math.min(0.99, c.height + read * 0.25));
    }
    const low = t.low || (!t.overhead && this.crouchPref);
    this.guardLow = this.guardRight ? low : !low;
    if (!threat) {
      this.threatSeen = 0;
      this.threatHandled = false;
      return;
    }
    this.threatSeen++;
    if (this.threatHandled || this.threatSeen < c.react || !me.onGround) return;
    this.threatHandled = true;
    const busy = me.state === 'attack';
    const block = Math.min(0.97, c.block + (this.leans('rush') + this.leans('wakeup')) * 0.12);
    if (busy || !U.chance(block)) return;
    this.plan = [];
    if (me.meter >= FLOW_COST && U.chance(c.flow)) {
      this.tap({ FL: true });
      return;
    }
    if (U.chance(0.15) && me.def.specials.D.kind === 'counter' && me.cd.D <= 0 && opp.state === 'attack') {
      this.tap({ down: true, S: true });
      return;
    }
    this.crouchPref = U.chance(0.4 + this.leans('low') * 0.5);
    this.push({ back: true, guard: true }, 16);
  }

  decide(me, opp, g) {
    const c = this.cfg;
    const dx = opp.x - me.x;
    const dist = Math.abs(dx);
    const sp = me.def.specials;
    const air = !me.onGround;
    this.wait = U.randi(0, c.think);
    // blend the character's game plan in, more strongly on higher levels
    const S = AI_STYLES[AI_STYLE_OF[me.def.id]] || AI_STYLES.allround;
    // Classic's slow walk makes kiting much stronger, so zoners ease off there
    const k = c.style * (g.classic && S.zone > 1.2 ? 0.55 : 1);
    const zone = 1 + (S.zone - 1) * k;
    const rush = 1 + (S.rush - 1) * k;
    const retreat = S.retreat * k;

    if (air) {
      if (dist < 150 && Math.abs(opp.y - me.y) < 150) {
        this.tap(U.chance(0.6) ? { L: true } : { H: true }, 6);
        if (U.chance(c.combo)) this.tap({ L: true }, 6);
      } else if (dist > 300 && me.airDashes > 0 && U.chance(0.2)) this.tap({ fwd: true, D: true }, 4);
      else this.push({ fwd: true }, 6);
      return;
    }

    // they like to attack on wake-up: block it, then punish the recovery
    if ((opp.state === 'getup' || opp.state === 'down') && dist < 300 && U.chance(this.leans('wakeup'))) {
      this.push({ back: true, guard: true }, 22);
      return;
    }
    // heal / buff when it makes sense
    if (sp.D.kind === 'buff' && me.cd.D <= 0 && dist > 350 && (sp.D.buff !== 'heal' || me.hp < me.maxHp * 0.6) && U.chance(0.5)) {
      this.tap({ down: true, S: true }, 4);
      return;
    }
    // super
    if (me.meter >= 100 && U.chance(0.35)) {
      const k = me.def.super.kind;
      const ok = k === 'rush' ? dist < 500 : k === 'aoe' ? dist < 420 || me.def.id === 'chrono' : true;
      if (ok) {
        this.tap({ SU: true }, 10);
        return;
      }
    }
    // anti-air
    if (!opp.onGround && dist < 200 && opp.y < -60 && U.chance(0.55)) {
      if (U.chance(0.5) && me.cd.U <= 0) this.tap({ up: true, S: true }, 4);
      else {
        this.tap({ up: true, H: true }, 4);
        if (U.chance(c.combo)) {
          this.tap({ up: true }, 6);
          this.tap({ L: true }, 6);
          this.tap({ L: true }, 6);
          this.tap({ H: true }, 6);
        }
      }
      return;
    }

    if (dist > 480) {
      const r = Math.random();
      // against a zoner: close the distance instead of trading shots
      if (zone <= 1.2 && U.chance(this.leans('zone') * 0.7)) {
        if (me.cd.F <= 0 && (sp.F.inv || sp.F.kind === 'teleport') && U.chance(0.5)) this.tap({ fwd: true, S: true }, 6);
        else if (U.chance(0.5)) {
          this.tap({ fwd: true, up: true }, 10);
          this.tap({ fwd: true, H: true }, 8);
        } else {
          this.tap({ fwd: true, D: true }, 1);
          this.push({ fwd: true, D: true }, U.randi(10, 20));
        }
        return;
      }
      // zoners hold their ground at range and keep firing
      if (zone > 1.2 && me.cd.N > 0 && U.chance(0.35 * k)) {
        this.push({ back: U.chance(0.4) }, U.randi(8, 16));
        return;
      }
      if (r < Math.min(0.85, c.special * zone) && me.cd.N <= 0 && (sp.N.range === 'far' || sp.N.kind === 'projectile')) this.tap({ S: true }, 8);
      else if (r < c.special + 0.1 && me.cd.U <= 0 && sp.U.kind === 'pillar') this.tap({ up: true, S: true }, 8);
      else if (r < c.special + 0.15 && me.cd.D <= 0 && (sp.D.kind === 'trap' || sp.D.kind === 'wall')) this.tap({ down: true, S: true }, 8);
      else if (r < 0.75 * Math.min(1.25, rush)) {
        this.tap({ fwd: true, D: true }, 1);
        this.push({ fwd: true, D: true }, U.randi(8, 20));
      } else {
        this.tap({ fwd: true, up: true }, 10);
        this.tap({ fwd: true, H: true }, 8);
      }
      return;
    }

    if (dist > 170) {
      // zoners hold mid range: fire when ready, otherwise back off to range
      if (zone > 1.2 && U.chance(0.5 * k)) {
        if (me.cd.N <= 0 && U.chance(0.7)) this.tap({ S: true }, 8);
        else if (me.cd.D <= 0 && (sp.D.kind === 'trap' || sp.D.kind === 'wall') && U.chance(0.3)) this.tap({ down: true, S: true }, 8);
        else if (dist < 380) {
          if (U.chance(0.4)) this.tap({ back: true, D: true }, 8);
          else this.push({ back: true }, U.randi(10, 18));
        } else this.push({ back: U.chance(0.3) }, U.randi(6, 12));
        return;
      }
      // heavies walk you down
      if (S.walk && U.chance(0.25 * k)) {
        this.push({ fwd: true }, U.randi(10, 22));
        return;
      }
      const r = Math.random();
      if (r < c.aggro * 0.45 * rush) {
        this.tap({ fwd: true, D: true }, 5);
        this.tap({ L: true }, 5);
        this.tap({ L: true }, 5);
        this.tap({ L: true }, 6);
        if (U.chance(c.combo)) this.tap({ fwd: true, S: true }, 4);
      } else if (r < c.aggro * 0.7) {
        this.tap({ fwd: true, up: true }, 12);
        this.tap({ L: true }, 6);
        this.tap({ H: true }, 6);
      } else if (r < c.aggro * 0.7 + c.special * 0.6 && me.cd.F <= 0 && sp.F.range !== 'setup') {
        this.tap({ fwd: true, S: true }, 8);
      } else if (r < Math.min(0.95, 0.85 * zone) && me.cd.N <= 0) {
        this.tap({ S: true }, 8);
      } else this.push({ fwd: true }, U.randi(6, 14));
      return;
    }

    // close range
    // heavies are grapplers in Classic: they throw a lot more
    if (g.classic && dist < 110 && U.chance((opp.state === 'block' || opp.state === 'idle' ? 0.25 : 0.1) * (S.walk ? 1 + k : 1))) {
      this.tap({ fwd: true, H: true }, 8);
      return;
    }
    // rushdown mixes up high and low when the opponent is blocking
    if (rush > 1.2 && opp.state === 'block' && U.chance(0.35 * k)) {
      if (U.chance(0.5)) {
        this.tap({ down: true, L: true }, 5);
        this.tap({ down: true, H: true }, 8);
      } else {
        this.tap({ up: true }, 10);
        this.tap({ H: true }, 8);
      }
      return;
    }
    // zoners escape when you get in their face
    if (zone > 1.2 && U.chance(retreat)) {
      if (U.chance(0.4)) this.tap({ back: true, up: true }, 12);
      else if (U.chance(0.5)) this.tap({ back: true, D: true }, 10);
      else {
        this.tap({ L: true }, 5);
        this.tap({ back: true, D: true }, 10);
      }
      return;
    }
    const r = Math.random();
    if (r < 0.12 * (1 - c.aggro)) {
      if (retreat > 0.15 && U.chance(0.5)) this.tap({ back: true, up: true }, 10);
      else this.push({ back: true }, U.randi(10, 20));
    } else if (r < 0.2) {
      this.tap({ back: true, D: true }, 10);
    } else if (r < 0.55) {
      this.tap({ L: true }, 5);
      this.tap({ L: true }, 5);
      this.tap({ L: true }, 6);
      if (U.chance(c.combo)) {
        const v = U.pick(['N', 'F', 'U', 'H']);
        if (v === 'H') this.tap({ H: true }, 6);
        else this.tap({ fwd: v === 'F', up: v === 'U', S: true }, 6);
        if (me.meter >= 100 && U.chance(c.combo * 0.6)) this.tap({ SU: true }, 6);
      }
    } else if (r < 0.7) {
      this.tap({ up: true, H: true }, 8);
      if (U.chance(c.combo)) {
        this.tap({ up: true }, 5);
        this.tap({ L: true }, 6);
        this.tap({ L: true }, 6);
        this.tap({ H: true }, 8);
      }
    } else if (r < 0.82) {
      this.tap({ down: true, L: true }, 5);
      this.tap({ down: true, H: true }, 8);
    } else {
      this.tap({ H: true }, 8);
      if (U.chance(c.combo)) this.tap({ fwd: true, S: true }, 6);
    }
  }
}

// ------------------------------------------------------------------ practice dummy
// Scripted dummy for Practice mode, modeled on the dummy settings in modern
// fighting games (action, guard, and a counterattack when it can act again).
const DUMMY_ACTIONS = ['STAND', 'CROUCH', 'JUMP', 'WALK FORWARD', 'CPU EASY', 'CPU NORMAL', 'CPU HARD'];
const DUMMY_GUARDS = ['NONE', 'ALL', 'AFTER FIRST HIT', 'RANDOM'];
const DUMMY_REVERSALS = ['NONE', 'LIGHT', 'HEAVY', 'SPECIAL', 'UP SPECIAL', 'FLOW', 'BACK DASH', 'JUMP'];
const DUMMY_BUSY = new Set(['block', 'hit', 'down', 'getup', 'stunned']);
const DUMMY_FREE = new Set(['idle', 'walk', 'crouch', 'run', 'air']);

function makePracticeAI(p) {
  const act = DUMMY_ACTIONS[p.dummy];
  if (act.startsWith('CPU')) return new AIController(act.slice(4).toLowerCase());
  return new DummyController(p);
}

class DummyController {
  constructor(p) {
    this.p = p;
    this.raw = {};
    this.sinceHit = 999;
    this.threat = false;
    this.randomBlock = false;
    this.wasBusy = false;
    this.reversal = 0;
    this.jumpT = 0;
  }

  update(me, opp, g) {
    const r = {};
    this.raw = r;
    if (g.inputLocked) return r;
    const p = this.p;
    const back = me.facing > 0 ? 'left' : 'right';
    const fwd = me.facing > 0 ? 'right' : 'left';

    if (me.state === 'hit' || me.state === 'down') this.sinceHit = 0;
    else this.sinceHit++;

    // counterattack on the first frame the dummy can act again
    const busy = DUMMY_BUSY.has(me.state);
    if (this.wasBusy && !busy && DUMMY_FREE.has(me.state) && p.reversal > 0) this.reversal = 3;
    this.wasBusy = busy;
    if (this.reversal > 0) {
      this.reversal--;
      switch (DUMMY_REVERSALS[p.reversal]) {
        case 'LIGHT': r.L = true; break;
        case 'HEAVY': r.H = true; break;
        case 'SPECIAL': r.S = true; break;
        case 'UP SPECIAL': r.S = true; r.up = true; break;
        case 'FLOW': r.FL = true; break;
        case 'BACK DASH': r.D = true; r[back] = true; break;
        case 'JUMP': r.up = true; break;
      }
      return r;
    }

    // guarding: hold back only while something is coming, so the dummy
    // doesn't walk away the rest of the time
    if (me.state === 'thrown') {
      // with guard on, the dummy breaks throws
      if (DUMMY_GUARDS[p.guard] !== 'NONE' && me.timer < CLASSIC.throwTech - 3) r.H = true;
      return r;
    }
    const t = threatInfo(me, opp, g, 520, 420);
    const threat = t.threat;
    if (threat && !this.threat) this.randomBlock = Math.random() < 0.5;
    this.threat = threat;
    const guard = DUMMY_GUARDS[p.guard];
    const guarding = guard === 'ALL' || (guard === 'AFTER FIRST HIT' && this.sinceHit < 60) || (guard === 'RANDOM' && this.randomBlock);
    const crouching = DUMMY_ACTIONS[p.dummy] === 'CROUCH';
    if (guarding && (threat || me.state === 'block')) {
      // block at the right height: crouch for lows, stand for overheads
      r[back] = true;
      if (t.low || (crouching && !t.overhead)) r.down = true;
      return r;
    }

    switch (DUMMY_ACTIONS[p.dummy]) {
      case 'CROUCH':
        r.down = true;
        break;
      case 'JUMP':
        // tap up repeatedly so it keeps jumping in place
        this.jumpT = (this.jumpT + 1) % 6;
        if (this.jumpT < 2 && me.onGround) r.up = true;
        break;
      case 'WALK FORWARD':
        if (Math.abs(opp.x - me.x) > 110) r[fwd] = true;
        break;
    }
    return r;
  }
}
