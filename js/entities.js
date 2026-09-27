// Hazards: projectiles, beams, pillars, traps, walls, area attacks.
class Hazard {
  constructor(o) {
    Object.assign(this, {
      x: 0, y: 0, w: 40, h: 40, vx: 0, vy: 0, gravity: 0, life: 60, delay: 0, age: 0,
      rehit: 0, pierce: false, homing: 0, boomerang: 0, big: false, clash: true, ground: false,
      follow: null, trap: false, arm: 0, triggered: false, wall: false, wallHp: 3, groundExplode: false,
      vis: 'orb', color: '#fff', color2: null, facing: 1, dead: false,
    }, o);
    this.hitLog = new Map();
    this.maxLife = this.life;
    this.spin = Math.random() * Math.PI * 2;
  }

  update(g) {
    this.age++;
    if (this.delay > 0) {
      this.delay--;
      return;
    }
    const o = this.owner;
    if (this.follow) {
      if (o.state !== 'attack' || o.moveSerial !== this.moveSerial) {
        this.dead = true;
        return;
      }
      this.facing = o.facing;
      this.x = o.x + o.facing * this.follow.dx;
      this.y = o.y + this.follow.dy * o.def.size;
    } else if (!this.trap && !this.wall) {
      if (this.homing) {
        const t = g.opp(o);
        const dy = t.y - 75 - this.y;
        this.vy = U.clamp(this.vy + U.clamp(dy * 0.02, -this.homing, this.homing), -6, 6);
      }
      if (this.boomerang && this.age > this.boomerang) {
        this.vx -= this.facing * 1.1;
        this.vx = U.clamp(this.vx, -18, 18);
        if (U.sign(this.vx) === -this.facing && Math.abs(this.x - o.x) < 40) this.dead = true;
      }
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      if (this.ground) this.y = -this.h / 2;
      else if (this.y + this.h / 2 >= 0 && (this.gravity > 0 || this.groundExplode)) {
        this.dead = true;
        fxBurst(g, this.x, -10, this.color, 14, 7);
        g.dust(this.x, 0, 4);
        if (this.groundExplode) g.shake = Math.max(g.shake, 4);
      }
      if (this.x < -200 || this.x > g.stage.width + 200) this.dead = true;
    }
    this.spin += 0.2;
    this.life--;
    if (this.life <= 0) this.dead = true;
  }

  isActive() {
    return !this.dead && this.delay <= 0 && (!this.trap || this.triggered) && !!this.hit;
  }

  box() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  trigger(g) {
    this.triggered = true;
    const e = this.explode;
    this.w = e.w;
    this.h = e.h;
    this.y = -e.h / 2;
    this.life = e.life;
    this.maxLife = e.life;
    SFX.play(this.vis === 'mine' ? 'zap' : 'boom');
    fxBurst(g, this.x, -30, this.color, 18, 8);
  }

  // Where the attack "comes from" for blocking purposes.
  sourceX() {
    if (this.follow || this.hit.pull) return this.owner.x;
    if (Math.abs(this.vx) > 1) return this.x - U.sign(this.vx) * 1000;
    return this.x;
  }

  // Direction the victim gets knocked.
  knockDir(victim) {
    if (this.hit.pull) return U.sign(this.owner.x - victim.x) || -this.facing;
    if (this.hit.pullCenter) return U.sign(this.x - victim.x) || this.facing;
    if (Math.abs(this.vx) > 1) return U.sign(this.vx);
    return U.sign(victim.x - this.x) || this.facing;
  }
}
