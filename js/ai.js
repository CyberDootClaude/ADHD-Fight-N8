// CPU opponent. It drives a virtual controller so it plays by the same rules as humans.
const AI_LEVELS = {
  easy: { react: 20, block: 0.2, aggro: 0.45, combo: 0.25, special: 0.25, think: 14 },
  normal: { react: 11, block: 0.5, aggro: 0.6, combo: 0.6, special: 0.35, think: 8 },
  hard: { react: 5, block: 0.8, aggro: 0.75, combo: 0.9, special: 0.45, think: 4 },
  dummy: null,
};

class AIController {
  constructor(level) {
    this.cfg = AI_LEVELS[level] || null;
    this.raw = {};
    this.plan = [];
    this.wait = 0;
    this.threatSeen = 0;
    this.threatHandled = false;
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
    if (me.state === 'hit' || me.state === 'down' || me.state === 'ko' || me.state === 'stunned' || me.status.freeze > 0) {
      this.plan = [];
      this.wait = U.randi(0, c.react);
      return this.raw;
    }
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
      for (const b of ['up', 'down', 'L', 'H', 'S', 'D', 'SU']) if (k[b]) this.raw[b] = true;
      if (--step.f <= 0) this.plan.shift();
    }
    return this.raw;
  }

  defend(me, opp, g) {
    const c = this.cfg;
    const dist = Math.abs(opp.x - me.x);
    let threat = false;
    if (opp.state === 'attack' && opp.move && dist < 280 + (opp.move.kind === 'rush' ? 250 : 0)) threat = true;
    for (const h of g.hazards) {
      if (h.owner === me || !h.hit || h.dead) continue;
      const dx = me.x - h.x;
      const approaching = Math.abs(h.vx) > 1 ? U.sign(h.vx) === U.sign(dx) : true;
      if (approaching && Math.abs(dx) < 300 && (h.delay > 0 || h.y > -260)) threat = true;
    }
    if (!threat) {
      this.threatSeen = 0;
      this.threatHandled = false;
      return;
    }
    this.threatSeen++;
    if (this.threatHandled || this.threatSeen < c.react || !me.onGround) return;
    this.threatHandled = true;
    const busy = me.state === 'attack';
    if (busy || !U.chance(c.block)) return;
    this.plan = [];
    if (U.chance(0.15) && me.def.specials.D.kind === 'counter' && me.cd.D <= 0 && opp.state === 'attack') {
      this.tap({ down: true, S: true });
      return;
    }
    this.push({ back: true, down: U.chance(0.4) }, 16);
  }

  decide(me, opp, g) {
    const c = this.cfg;
    const dx = opp.x - me.x;
    const dist = Math.abs(dx);
    const sp = me.def.specials;
    const air = !me.onGround;
    this.wait = U.randi(0, c.think);

    if (air) {
      if (dist < 150 && Math.abs(opp.y - me.y) < 150) {
        this.tap(U.chance(0.6) ? { L: true } : { H: true }, 6);
        if (U.chance(c.combo)) this.tap({ L: true }, 6);
      } else if (dist > 300 && me.airDashes > 0 && U.chance(0.2)) this.tap({ fwd: true, D: true }, 4);
      else this.push({ fwd: true }, 6);
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
      if (r < c.special && me.cd.N <= 0 && (sp.N.range === 'far' || sp.N.kind === 'projectile')) this.tap({ S: true }, 8);
      else if (r < c.special + 0.1 && me.cd.U <= 0 && sp.U.kind === 'pillar') this.tap({ up: true, S: true }, 8);
      else if (r < c.special + 0.15 && me.cd.D <= 0 && (sp.D.kind === 'trap' || sp.D.kind === 'wall')) this.tap({ down: true, S: true }, 8);
      else if (r < 0.75) {
        this.tap({ fwd: true, D: true }, 1);
        this.push({ fwd: true, D: true }, U.randi(8, 20));
      } else {
        this.tap({ fwd: true, up: true }, 10);
        this.tap({ fwd: true, H: true }, 8);
      }
      return;
    }

    if (dist > 170) {
      const r = Math.random();
      if (r < c.aggro * 0.45) {
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
      } else if (r < 0.85 && me.cd.N <= 0) {
        this.tap({ S: true }, 8);
      } else this.push({ fwd: true }, U.randi(6, 14));
      return;
    }

    // close range
    const r = Math.random();
    if (r < 0.12 * (1 - c.aggro)) {
      this.push({ back: true }, U.randi(10, 20));
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
