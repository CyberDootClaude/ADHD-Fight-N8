// Poses, shared normal attacks and special-move builders.
//
// Pose angles are in degrees measured from "straight down", positive = rotate
// toward the direction the fighter faces. Arms: [shoulder, elbow], legs: [hip, knee].

const P = (lean, fa, ba, fl, bl, extra) => Object.assign({ lean, head: 0, fa, ba, fl, bl, rot: 0, oy: 0 }, extra || {});

const POSES = {
  idle: P(6, [35, 95], [20, 110], [18, -8], [-14, -6]),
  crouch: P(18, [45, 95], [30, 105], [75, -115], [-5, -120]),
  jump: P(0, [150, 20], [120, 30], [70, -100], [10, -60]),
  fall: P(5, [110, 30], [80, 40], [30, -40], [-10, -20]),
  dash: P(35, [-40, 20], [-60, 20], [60, -60], [-50, -30]),
  backdash: P(-15, [60, 60], [30, 80], [30, -30], [-40, -40]),
  block: P(-4, [70, 125], [55, 135], [20, -10], [-20, -8]),
  cblock: P(10, [70, 125], [55, 135], [75, -115], [-5, -120]),
  hit: P(-25, [-30, -20], [-50, -10], [20, -10], [-15, -5], { head: -15 }),
  tumble: P(-20, [-60, -10], [-80, 0], [40, -40], [-10, -30], { head: -20 }),
  lying: P(0, [10, 0], [-10, 0], [5, 0], [-5, 0], { rot: -90, oy: 62 }),
  stunned: P(-10, [-20, 10], [-35, 20], [15, -12], [-15, -8], { head: 20 }),
  victory: P(0, [170, 0], [20, 110], [15, -5], [-15, -5]),
  frozen: P(6, [35, 95], [20, 110], [18, -8], [-14, -6]),

  punchW: P(0, [20, 120], [40, 100], [22, -8], [-18, -6]),
  punch: P(12, [90, 0], [20, 110], [30, -10], [-25, -5]),
  punch2W: P(4, [40, 100], [10, 120], [22, -8], [-18, -6]),
  punch2: P(15, [30, 100], [92, 0], [35, -10], [-30, -5]),
  kickW: P(0, [40, 90], [20, 100], [60, -100], [-10, -5]),
  kick: P(-15, [40, 90], [-20, 60], [95, 0], [-10, -5]),
  heavyW: P(-10, [20, 100], [10, 90], [50, -120], [-8, -5]),
  heavy: P(-25, [60, 100], [-40, 40], [100, 5], [-5, -5]),
  upperW: P(20, [0, 60], [20, 100], [50, -80], [-10, -60]),
  upper: P(-10, [170, 5], [30, 100], [20, -5], [-20, -5]),
  sweepW: P(20, [45, 95], [30, 105], [75, -115], [-5, -120]),
  sweep: P(30, [60, 40], [20, 60], [95, 0], [-5, -125]),
  clowW: P(18, [30, 110], [30, 105], [75, -115], [-5, -120]),
  clow: P(22, [85, 0], [30, 105], [75, -115], [-5, -120]),
  airKickW: P(0, [60, 80], [30, 90], [60, -110], [20, -100]),
  airKick: P(-5, [60, 80], [30, 90], [55, 0], [20, -100]),
  airHeavyW: P(-10, [150, 0], [140, 0], [10, -30], [0, -40]),
  airHeavy: P(25, [70, 0], [80, 0], [30, -40], [-10, -30]),

  castW: P(-8, [10, 130], [0, 140], [25, -10], [-25, -8]),
  cast: P(12, [92, 0], [85, 0], [35, -12], [-30, -5]),
  upW: P(10, [20, 90], [10, 90], [55, -90], [-10, -80]),
  up: P(-5, [175, 0], [165, 0], [10, -20], [-10, -30]),
  downW: P(-5, [160, 0], [150, 0], [20, -10], [-20, -8]),
  down: P(25, [40, 0], [35, 0], [55, -90], [-15, -100]),
  rushW: P(20, [0, 90], [-30, 60], [50, -80], [-30, -40]),
  rush: P(30, [95, 0], [-60, 20], [50, -50], [-60, -20]),
  slide: P(-20, [60, 30], [30, 40], [90, 0], [-10, -130]),
  kickRush: P(-20, [50, 80], [-40, 40], [95, 0], [-20, -40]),
  counter: P(-8, [110, 60], [80, 80], [20, -10], [-25, -8]),
  superW: P(-15, [160, 10], [150, 10], [30, -10], [-30, -8]),
  flow: P(-6, [95, 70], [55, 95], [38, -30], [-35, -22]),
};

function mk(o) {
  const m = Object.assign({ type: 'special', startup: 8, active: 3, recovery: 12, cooldown: 0, airOk: true }, o);
  m.total = m.startup + m.active + m.recovery;
  return m;
}

// ---------------------------------------------------------------- normals
const NORMALS = {
  L1: mk({
    id: 'L1', type: 'light', startup: 3, active: 3, recovery: 7, lunge: 2, chain: 'L2',
    box: { x: 50, y: -112, w: 60, h: 28 },
    hit: { dmg: 28, stun: 15, kb: [3, 0], hitstop: 5 },
    pose: { wind: POSES.punchW, strike: POSES.punch },
  }),
  L2: mk({
    id: 'L2', type: 'light', startup: 4, active: 3, recovery: 8, lunge: 3, chain: 'L3',
    box: { x: 52, y: -108, w: 64, h: 30 },
    hit: { dmg: 32, stun: 16, kb: [3.5, 0], hitstop: 5 },
    pose: { wind: POSES.punch2W, strike: POSES.punch2 },
  }),
  L3: mk({
    id: 'L3', type: 'light', startup: 5, active: 4, recovery: 13, lunge: 4,
    box: { x: 62, y: -78, w: 78, h: 32 },
    hit: { dmg: 45, stun: 22, kb: [9, -6], hitstop: 7 },
    pose: { wind: POSES.kickW, strike: POSES.kick },
  }),
  CL: mk({
    id: 'CL', type: 'light', startup: 4, active: 3, recovery: 8, low: true, chain: 'DH',
    box: { x: 55, y: -50, w: 64, h: 26 },
    hit: { dmg: 24, stun: 14, kb: [3, 0], hitstop: 5 },
    pose: { wind: POSES.clowW, strike: POSES.clow },
  }),
  H: mk({
    id: 'H', type: 'heavy', startup: 8, active: 4, recovery: 16, lunge: 5,
    box: { x: 66, y: -100, w: 90, h: 44 },
    hit: { dmg: 75, stun: 24, kb: [13, -5], hitstop: 9 },
    pose: { wind: POSES.heavyW, strike: POSES.heavy },
  }),
  UH: mk({
    id: 'UH', type: 'heavy', startup: 6, active: 5, recovery: 17, lunge: 2,
    box: { x: 36, y: -160, w: 62, h: 100 },
    hit: { dmg: 60, stun: 32, kb: [2, -17], hitstop: 8, launch: true },
    pose: { wind: POSES.upperW, strike: POSES.upper },
  }),
  DH: mk({
    id: 'DH', type: 'heavy', startup: 7, active: 4, recovery: 17, low: true, lunge: 3,
    box: { x: 64, y: -26, w: 96, h: 30 },
    hit: { dmg: 55, stun: 30, kb: [6, -7], hitstop: 8, knockdown: true },
    pose: { wind: POSES.sweepW, strike: POSES.sweep },
  }),
  AL: mk({
    id: 'AL', type: 'light', startup: 3, active: 6, recovery: 8, air: true,
    box: { x: 42, y: -62, w: 60, h: 44 },
    hit: { dmg: 30, stun: 17, kb: [4, -3], hitstop: 5 },
    pose: { wind: POSES.airKickW, strike: POSES.airKick },
  }),
  AH: mk({
    id: 'AH', type: 'heavy', startup: 7, active: 5, recovery: 14, air: true,
    box: { x: 34, y: -46, w: 76, h: 56 },
    hit: { dmg: 65, stun: 24, kb: [5, 13], hitstop: 9, spike: true, knockdown: true },
    pose: { wind: POSES.airHeavyW, strike: POSES.airHeavy },
  }),
};

// Global balance knobs.
const COMBO_SOFT_CAP = 0.33;   // fraction of max health after which combo damage is halved
const ADRENALINE_HP = 0.3;     // below this fraction of health...
const ADRENALINE_POWER = 1.12; // ...damage is multiplied by this
const ADRENALINE_METER = 1.5;  // ...and meter gain by this
const LOSER_METER_BONUS = 30;  // meter given to the loser of a round

// Flow Stance: a separate button that auto-evades (or absorbs) whatever hits
// during its window. Costs meter; whiffing it leaves a punishable recovery.
const FLOW_COST = 25;
const FLOW_REFUND = 15;
const FLOW_MOVE = mk({
  id: 'FLOW', type: 'flow', name: 'Flow Stance', startup: 2, active: 22, recovery: 18, flow: true,
  pose: { wind: POSES.flow, strike: POSES.flow },
});

// ---------------------------------------------------------------- classic style
// "Classic" game style: a slower, grounded, Street Fighter-like ruleset.
// Everything else (characters, specials, supers, Flow, blocking) is shared.
const CLASSIC = {
  walk: 0.55,        // walk speed multiplier (and no running)
  dash: 0.8,         // dash speed multiplier (short dashes only)
  jumpDrift: 5.4,    // fixed horizontal jump speed, no steering in the air
  lightStartup: 1,   // extra startup / recovery frames on light normals
  lightRecovery: 3,
  heavyStartup: 2,   // ...and on heavy normals
  heavyRecovery: 6,
  throwRange: 105,   // max distance between fighters to throw
  throwTech: 10,     // frames the defender has to break a throw with Heavy
  clock: 99,         // round timer in seconds
};

// Per-character damage adjustments that only apply in Classic, found with
// `CLASSIC=1 node tools/balance.js`. Slower normals help armored heavies and
// hurt characters who rely on quick pokes and teleports.
const CLASSIC_POWER = { magna: 0.9, ferrus: 0.95, chrono: 1.1, volta: 1.1, umbra: 1.06 };

function classicStats(def) {
  const st = def.stats;
  const walk = st.walk * CLASSIC.walk;
  return Object.assign({}, st, {
    walk, run: walk, airJumps: 0, airDash: 0, dash: st.dash * CLASSIC.dash, airSpeed: CLASSIC.jumpDrift,
    power: st.power * (CLASSIC_POWER[def.id] || 1),
  });
}

const CLASSIC_NORMALS = {};
for (const k in NORMALS) {
  const m = NORMALS[k];
  const light = m.type === 'light';
  CLASSIC_NORMALS[k] = mk(Object.assign({}, m, {
    startup: m.startup + (light ? CLASSIC.lightStartup : CLASSIC.heavyStartup),
    recovery: m.recovery + (light ? CLASSIC.lightRecovery : CLASSIC.heavyRecovery),
  }));
}

// Throws (Classic only): forward or back + Heavy right next to the opponent.
// They can't be blocked, beat Flow (a throw isn't a hit) and break armor.
const THROW_HIT = { dmg: 100, stun: 30, kb: [10, -9], hitstop: 10, knockdown: true, unblockable: true, throw: true };
const THROW_MOVE = mk({
  id: 'THROW', type: 'throw', name: 'Throw', startup: CLASSIC.throwTech, active: 1, recovery: 18,
  pose: { wind: POSES.punch2W, strike: POSES.heavy },
  onFrame(f, g, mf, m) {
    const o = f.throwTarget;
    if (mf === m.startup + 1 && o && o.state === 'thrown' && o.thrower === f) {
      o.state = 'idle';
      o.thrower = null;
      o.takeHit(THROW_HIT, f, f.x, f.facing, null);
      g.shake = Math.max(g.shake, 8);
    }
  },
});

// ---------------------------------------------------------------- helpers
const HIT = (o) => Object.assign({ dmg: 50, stun: 20, kb: [6, -2], hitstop: 7 }, o);

function fxBurst(g, x, y, color, n = 12, speed = 6) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = U.rand(speed * 0.3, speed);
    g.particle({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: U.randi(14, 26), size: U.rand(3, 7), color, drag: 0.9 });
  }
}

// Special moves are built from a handful of reusable "kinds" configured with parameters.
const SP = {
  projectile(o) {
    const count = o.count || 1;
    const interval = o.interval || 0;
    const startup = o.startup ?? 10;
    return mk({
      kind: 'projectile', name: o.name, startup, active: 1 + interval * (count - 1),
      recovery: o.recovery ?? 14, cooldown: o.cd ?? 30, airOk: o.airOk ?? true, airStall: true,
      superMove: o.superMove, pose: o.pose || { wind: POSES.castW, strike: POSES.cast },
      range: o.ground ? 'ground' : 'far',
      onFrame(f, g, mf, m) {
        for (let i = 0; i < count; i++) {
          if (mf !== m.startup + i * interval) continue;
          const spread = count > 1 && !interval ? (i - (count - 1) / 2) * (o.spread || 3) : 0;
          const s = f.def.size;
          const h = o.h ?? 34;
          g.addHazard({
            owner: f, facing: f.facing,
            x: f.x + f.facing * (o.dx ?? 55) * s,
            y: o.ground ? -h / 2 : f.y + (o.dy ?? -100) * s,
            w: o.w ?? 40, h, vx: f.facing * (o.speed ?? 14), vy: (o.vy || 0) + spread,
            gravity: o.gravity || 0, life: o.life ?? 90, hit: HIT(Object.assign({ special: true, super: !!o.superMove }, o.hit)),
            vis: o.vis || 'orb', color: o.color || f.def.color, color2: o.color2,
            pierce: !!o.pierce, rehit: o.rehit || 0, homing: o.homing || 0, boomerang: o.boomerang || 0,
            big: !!o.big, ground: !!o.ground, tether: !!o.tether, pullToOwner: !!(o.hit && o.hit.pull),
          });
        }
        if (mf === m.startup) SFX.play(o.sfx || 'proj');
      },
    });
  },

  rush(o) {
    const startup = o.startup ?? 7;
    const dur = o.dur ?? 16;
    return mk({
      kind: 'rush', name: o.name, startup, active: dur, recovery: o.recovery ?? 14, cooldown: o.cd ?? 40,
      superMove: o.superMove, box: o.box || { x: 40, y: -85, w: 90, h: 100 }, multi: o.multi || 0,
      hit: HIT(Object.assign({ special: true, super: !!o.superMove }, o.hit)), low: !!o.low,
      armor: o.armor ? [1, startup + dur] : null, invuln: o.inv ? [1, startup + dur] : null,
      passThrough: !!o.inv, noGravActive: true, range: 'mid',
      pose: { wind: o.windPose || POSES.rushW, strike: o.pose || POSES.rush },
      onFrame(f, g, mf, m) {
        if (mf === m.startup + 1) SFX.play('dash');
        if (mf > m.startup && mf <= m.startup + m.active) {
          const stop = o.stopOnHit && f.moveHit;
          f.vx = stop ? f.vx * 0.5 : f.facing * (o.speed ?? 22) * f.spd();
          f.vy = o.vy || 0;
          if (mf % 2 === 0) f.afterimage(o.trail || f.def.color);
          if (mf % 2 === 0) g.particle({ x: f.x - f.facing * 30, y: f.y - 70 * f.def.size + U.rand(-30, 30), vx: -f.facing * 3, vy: 0, life: 14, size: 6, color: o.trail || f.def.color, drag: 0.9 });
        } else if (mf === m.startup + m.active + 1) {
          f.vx *= 0.25;
        }
      },
    });
  },

  rising(o) {
    const startup = o.startup ?? 4;
    return mk({
      kind: 'rising', name: o.name, startup, active: o.dur ?? 16, recovery: o.recovery ?? 14, cooldown: o.cd ?? 40,
      box: o.box || { x: 25, y: -110, w: 95, h: 150 }, multi: o.multi || 0,
      hit: HIT(Object.assign({ special: true }, o.hit)), invuln: [1, startup + 5],
      armor: o.armor ? [1, startup + 8] : null, range: 'anti',
      pose: { wind: POSES.upW, strike: o.pose || POSES.up },
      onFrame(f, g, mf, m) {
        if (mf === m.startup) {
          f.vy = -(o.vy ?? 18);
          f.vx = f.facing * (o.vx ?? 4);
          f.onGround = false;
          SFX.play('whoosh');
          fxBurst(g, f.x, f.y - 10, o.color || f.def.color, 14, 7);
        }
        if (mf > m.startup && mf <= m.startup + m.active && mf % 2 === 0) {
          g.particle({ x: f.x + U.rand(-35, 35), y: f.y - U.rand(20, 140) * f.def.size, vx: 0, vy: 2, life: 16, size: U.rand(4, 9), color: o.color || f.def.color, drag: 0.9 });
        }
      },
    });
  },

  teleport(o) {
    const tp = o.startup ?? 7;
    const strike = !!o.strike;
    return mk({
      kind: 'teleport', name: o.name, startup: tp + (strike ? 3 : 0), active: strike ? 5 : 1,
      recovery: o.recovery ?? (strike ? 14 : 8), cooldown: o.cd ?? 40,
      box: strike ? { x: 50, y: -95, w: 95, h: 90 } : null,
      hit: strike ? HIT(Object.assign({ special: true }, o.strike)) : null,
      invuln: [1, tp + 2], range: o.dest === 'forward' ? 'mid' : 'any',
      pose: { wind: POSES.castW, strike: strike ? POSES.rush : POSES.idle },
      onFrame(f, g, mf) {
        if (mf === 1) {
          fxBurst(g, f.x, f.y - 70, o.color || f.def.color, 16, 8);
          SFX.play('zap');
          f.hidden = true;
        }
        if (mf === tp) {
          const opp = g.opp(f);
          let nx = f.x;
          let ny = f.y;
          if (o.dest === 'behind') {
            const side = U.sign(opp.x - f.x) || f.facing;
            nx = opp.x + side * 95;
          } else if (o.dest === 'above') {
            nx = opp.x - f.facing * 20;
            ny = Math.min(opp.y - 190, -190);
          } else {
            nx = f.x + f.facing * (o.dist ?? 260);
          }
          f.x = U.clamp(nx, g.stage.left, g.stage.right);
          f.y = ny;
          if (ny < 0) { f.onGround = false; f.vy = -2; }
          f.vx = 0;
          f.facing = U.sign(opp.x - f.x) || f.facing;
          f.hidden = false;
          fxBurst(g, f.x, f.y - 70, o.color || f.def.color, 16, 8);
        }
      },
    });
  },

  beam(o) {
    const startup = o.startup ?? 14;
    const dur = o.dur ?? 20;
    return mk({
      kind: 'beam', name: o.name, startup, active: dur, recovery: o.recovery ?? 16, cooldown: o.cd ?? 40,
      superMove: o.superMove, airOk: o.airOk ?? true, airStall: true, range: o.len > 450 ? 'far' : 'mid',
      pose: { wind: o.superMove ? POSES.superW : POSES.castW, strike: POSES.cast },
      onFrame(f, g, mf, m) {
        if (mf === m.startup + 1) {
          const len = o.len ?? 700;
          g.addHazard({
            owner: f, facing: f.facing, follow: { dx: 40 + len / 2, dy: o.dy ?? -100 }, moveSerial: f.moveSerial,
            x: f.x, y: f.y, w: len, h: o.thick ?? 40, life: dur, rehit: o.multi || 0, pierce: true,
            hit: HIT(Object.assign({ special: true, super: !!o.superMove }, o.hit)),
            vis: o.vis || 'beam', color: o.color || f.def.color, color2: o.color2, big: true, clashOnly: true,
          });
          SFX.play(o.sfx || 'beam');
          if (o.superMove) g.shake = Math.max(g.shake, 10);
        }
        if (mf > m.startup) f.vx *= 0.5;
      },
    });
  },

  pillar(o) {
    const startup = o.startup ?? 10;
    return mk({
      kind: 'pillar', name: o.name, startup, active: 1, recovery: o.recovery ?? 16, cooldown: o.cd ?? 45,
      superMove: o.superMove, airOk: o.airOk ?? true, range: 'any',
      pose: { wind: o.superMove ? POSES.superW : POSES.downW, strike: POSES.down },
      onFrame(f, g, mf, m) {
        if (mf !== m.startup) return;
        const opp = g.opp(f);
        const count = o.count || 1;
        const spacing = o.spacing ?? 140;
        const xs = [];
        if (o.at === 'row') {
          for (let i = 0; i < count; i++) xs.push(f.x + f.facing * ((o.start ?? 140) + i * spacing));
        } else {
          const tx = opp.x + opp.vx * 6;
          for (let i = 0; i < count; i++) xs.push(tx + (i - (count - 1) / 2) * spacing);
        }
        xs.forEach((x, i) => {
          const h = o.h ?? 240;
          g.addHazard({
            owner: f, facing: f.facing, x: U.clamp(x, g.stage.left, g.stage.right), y: -h / 2, w: o.w ?? 80, h,
            delay: (o.delay ?? 22) + i * (o.stagger ?? 0), life: o.dur ?? 14, pierce: true, rehit: o.multi || 0,
            hit: HIT(Object.assign({ special: true, super: !!o.superMove, unblockable: false }, o.hit)),
            vis: o.vis || 'pillar', color: o.color || f.def.color, color2: o.color2, telegraph: true, clash: false,
          });
        });
        SFX.play('whoosh');
      },
    });
  },

  aoe(o) {
    const startup = o.startup ?? 10;
    const r = o.r ?? 150;
    return mk({
      kind: 'aoe', name: o.name, startup, active: 1, recovery: o.recovery ?? 18, cooldown: o.cd ?? 60,
      superMove: o.superMove, airOk: o.airOk ?? !o.groundOnly, range: r > 400 ? 'any' : 'close',
      invuln: o.superMove ? [1, startup + 4] : null,
      pose: { wind: o.superMove ? POSES.superW : POSES.downW, strike: o.groundOnly ? POSES.down : POSES.up },
      onFrame(f, g, mf, m) {
        if (mf !== m.startup) return;
        const h = o.h ?? r * 1.2;
        const cx = f.x + f.facing * (o.dist || 0);
        g.addHazard({
          owner: f, facing: f.facing, x: cx, y: o.groundOnly ? -h / 2 : f.y - 70 * f.def.size, w: r * 2, h,
          life: o.dur ?? 10, pierce: true, rehit: o.multi || 0, clash: false,
          hit: HIT(Object.assign({ special: true, super: !!o.superMove, pullCenter: !!o.pull }, o.hit)),
          vis: o.vis || 'ring', color: o.color || f.def.color, color2: o.color2, groundOnly: !!o.groundOnly,
        });
        SFX.play(o.sfx || 'boom');
        g.shake = Math.max(g.shake, o.superMove ? 16 : 6);
      },
    });
  },

  trap(o) {
    return mk({
      kind: 'trap', name: o.name, startup: o.startup ?? 10, active: 1, recovery: o.recovery ?? 12,
      cooldown: o.cd ?? 50, airOk: false, range: 'setup',
      pose: { wind: POSES.downW, strike: POSES.down },
      onFrame(f, g, mf, m) {
        if (mf !== m.startup) return;
        const mine = g.hazards.filter((h) => h.owner === f && h.trap && !h.triggered);
        if (mine.length >= (o.max ?? 2)) mine[0].dead = true;
        const w = o.w ?? 60;
        const h = o.h ?? 30;
        g.addHazard({
          owner: f, facing: f.facing, x: U.clamp(f.x + f.facing * (o.dist ?? 100), g.stage.left, g.stage.right),
          y: -h / 2, w, h, life: o.life ?? 480, trap: true, arm: 18, explode: o.explode || { w: w + 60, h: 160, life: 12 },
          pierce: true, clash: false, hit: HIT(Object.assign({ special: true }, o.hit)),
          vis: o.vis || 'mine', color: o.color || f.def.color, color2: o.color2,
        });
        SFX.play('select');
      },
    });
  },

  wall(o) {
    return mk({
      kind: 'wall', name: o.name, startup: o.startup ?? 10, active: 1, recovery: o.recovery ?? 12,
      cooldown: o.cd ?? 120, airOk: false, range: 'setup',
      pose: { wind: POSES.castW, strike: POSES.cast },
      onFrame(f, g, mf, m) {
        if (mf !== m.startup) return;
        g.hazards.filter((h) => h.owner === f && h.wall).forEach((h) => (h.dead = true));
        const h = o.h ?? 190;
        g.addHazard({
          owner: f, facing: f.facing, x: U.clamp(f.x + f.facing * (o.dist ?? 110), g.stage.left, g.stage.right), y: -h / 2,
          w: o.w ?? 44, h, life: o.life ?? 300, wall: true, wallHp: o.hp ?? 3, clash: false,
          hit: o.hit ? HIT(Object.assign({ special: true }, o.hit)) : null, pierce: true,
          vis: o.vis || 'icewall', color: o.color || f.def.color,
        });
        SFX.play('zap');
      },
    });
  },

  counter(o) {
    return mk({
      kind: 'counter', name: o.name, startup: 2, active: o.window ?? 24, recovery: o.recovery ?? 18,
      cooldown: o.cd ?? 45, counter: o, range: 'defend',
      pose: { wind: POSES.counter, strike: POSES.counter },
    });
  },

  buff(o) {
    return mk({
      kind: 'buff', name: o.name, startup: o.startup ?? 14, active: 1, recovery: o.recovery ?? 12,
      cooldown: o.cd ?? 600, buff: o.type, range: 'self',
      pose: { wind: POSES.castW, strike: POSES.up },
      onFrame(f, g, mf, m) {
        if (mf !== m.startup) return;
        const s = f.status;
        const dur = o.dur ?? 300;
        if (o.type === 'heal') {
          s.heal = dur;
          s.healPer = (o.amount ?? 120) / dur;
          SFX.play('heal');
        } else {
          s[o.type] = dur;
          SFX.play('super');
        }
        g.text(o.label || o.name.toUpperCase(), f.x, f.y - 190, f.def.color);
        fxBurst(g, f.x, f.y - 80, f.def.color, 24, 9);
      },
    });
  },

  slam(o) {
    const startup = o.startup ?? 5;
    return mk({
      kind: 'slam', name: o.name, startup, active: 60, recovery: o.recovery ?? 16, cooldown: o.cd ?? 45,
      box: { x: 20, y: -45, w: 100, h: 90 }, boxWhen: (f) => f.slamDive,
      hit: HIT(Object.assign({ special: true }, o.hit)), range: 'mid', noGravActive: false,
      pose: { wind: POSES.upW, strike: POSES.airHeavy },
      onFrame(f, g, mf, m) {
        if (mf === m.startup) {
          f.slamDive = false;
          if (f.onGround) { f.vy = -(o.hop ?? 15); f.onGround = false; }
          else f.vy = -6;
          f.vx = f.facing * (o.vx ?? 8);
          SFX.play('jump');
        }
        if (mf === m.startup + (o.rise ?? 12)) {
          f.slamDive = true;
          f.vy = o.dive ?? 26;
          SFX.play('whoosh');
        }
        if (f.slamDive && mf % 2 === 0) f.afterimage(f.def.color);
        if (mf >= m.startup + m.active) f.slamDive = false;
      },
      onLand(f, g, m) {
        if (!f.slamDive) return false;
        f.slamDive = false;
        const r = o.shockR ?? 200;
        g.addHazard({
          owner: f, facing: f.facing, x: f.x, y: -40, w: r * 2, h: 80, life: 8, pierce: true, clash: false,
          hit: HIT(Object.assign({ special: true }, o.shock || { dmg: 35, stun: 22, kb: [8, -8] })),
          vis: 'shock', color: o.color || f.def.color, groundOnly: true,
        });
        g.shake = Math.max(g.shake, 10);
        SFX.play('boom');
        f.mf = m.startup + m.active; // jump to recovery
        f.vx = 0;
        return true;
      },
    });
  },

  rain(o) {
    const startup = o.startup ?? 14;
    return mk({
      kind: 'rain', name: o.name, startup, active: 1, recovery: o.recovery ?? 16, cooldown: o.cd ?? 60,
      superMove: o.superMove, range: 'any',
      pose: { wind: POSES.superW, strike: POSES.up },
      onFrame(f, g, mf, m) {
        if (mf !== m.startup) return;
        const opp = g.opp(f);
        const count = o.count ?? 6;
        const spread = o.spread ?? 280;
        for (let i = 0; i < count; i++) {
          g.later(i * (o.interval ?? 6), () => {
            const tx = opp.x + (i === 0 ? 0 : U.rand(-spread, spread));
            const vx = o.slant ? f.facing * o.slant : 0;
            g.addHazard({
              owner: f, facing: f.facing, x: tx - vx * 28, y: -760, w: o.w ?? 60, h: o.h ?? 60,
              vx, vy: o.speed ?? 22, life: 90, hit: HIT(Object.assign({ special: true, super: !!o.superMove }, o.hit)),
              vis: o.vis || 'meteor', color: o.color || f.def.color, color2: o.color2, groundExplode: true, big: true,
              srcName: o.name,
            });
            if (i % 2 === 0) SFX.play(o.sfx || 'whoosh');
          });
        }
      },
    });
  },
};

// Every super costs a full meter bar and pauses the action for a dramatic flash.
function SUPER(kind, o) {
  const m = SP[kind](Object.assign({ superMove: true, cd: 0 }, o));
  m.type = 'super';
  m.superMove = true;
  m.invuln = [1, m.startup + 2];
  return m;
}
