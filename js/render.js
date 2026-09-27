// All drawing: fighters, hazards, particles, stages.
const OUT = '#12121c';

function seg(ctx, pts, w, color, outline) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  if (outline) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = w + 4;
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

function circ(ctx, x, y, r, fill, outline) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (outline) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

// Draws a fighter figure with its feet at (x, y).
function drawFigure(ctx, def, pose, x, y, facing, scale = 1, opt = {}) {
  const L = def.look;
  const S = def.size * scale;
  const t = opt.t || 0;
  const tint = opt.tint;
  const ol = !tint;
  const col = (c) => tint || c;
  const dark = (c) => tint || U.shade(c, -0.3);
  const TH = 34, SH = 34, TO = 46, UA = 25, FA = 24, HR = 15, LW = 11;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * S, S);
  if (pose.rot || pose.oy) {
    ctx.translate(0, pose.oy);
    ctx.translate(0, -75);
    ctx.rotate(pose.rot * D2R);
    ctx.translate(0, 75);
  }
  const legPts = (lg) => {
    const h = lg[0] * D2R;
    const k = (lg[0] + lg[1]) * D2R;
    const kx = Math.sin(h) * TH;
    const ky = Math.cos(h) * TH;
    return [kx, ky, kx + Math.sin(k) * SH, ky + Math.cos(k) * SH];
  };
  const fL = legPts(pose.fl);
  const bL = legPts(pose.bl);
  const hipH = Math.abs(pose.rot) > 20 ? (TH + SH) * 0.95 : Math.max(fL[3], bL[3], 22);
  const hx = 0;
  const hy = -hipH;
  const le = pose.lean * D2R;
  const nx = hx + Math.sin(le) * TO;
  const ny = hy - Math.cos(le) * TO;
  const sx = hx + Math.sin(le) * (TO - 7);
  const sy = hy - Math.cos(le) * (TO - 7);
  const hd = (pose.lean + pose.head) * D2R;
  const headX = nx + Math.sin(hd) * (HR + 2);
  const headY = ny - Math.cos(hd) * (HR + 2);
  const armPts = (a) => {
    const s1 = a[0] * D2R;
    const s2 = (a[0] + a[1]) * D2R;
    const ex = sx + Math.sin(s1) * UA;
    const ey = sy + Math.cos(s1) * UA;
    return [sx, sy, ex, ey, ex + Math.sin(s2) * FA, ey + Math.cos(s2) * FA];
  };
  const drawArm = (a, back) => {
    const p = armPts(a);
    const sleeve = back ? dark(L.primary) : col(L.primary);
    const skin = back ? dark(L.skin) : col(L.skin);
    seg(ctx, [p[0], p[1], p[2], p[3]], LW, sleeve, ol);
    seg(ctx, [p[2], p[3], p[4], p[5]], LW - 1, skin, ol);
    circ(ctx, p[4], p[5], 6.5, back ? dark(L.secondary) : col(L.secondary), ol);
    return p;
  };
  const drawLeg = (lp, back) => {
    const pc = back ? dark(L.pants) : col(L.pants);
    seg(ctx, [hx, hy, hx + lp[0], hy + lp[1], hx + lp[2], hy + lp[3]], LW + 2, pc, ol);
    circ(ctx, hx + lp[2] + 3, hy + lp[3], 6.5, tint || (back ? '#1b1b22' : '#2b2b36'), ol);
  };

  // scarf / cape flow behind everything
  if (L.acc === 'scarf') {
    const w = Math.sin(t * 0.25) * 6;
    seg(ctx, [nx, ny + 3, nx - 18, ny + 4 + w, nx - 36, ny + 10 - w], 7, col(L.accColor || L.secondary), ol);
  }
  drawHairBack(ctx, L, headX, headY, HR, t, col, ol, hd);

  drawArm(pose.ba, true);
  drawLeg(bL, true);

  // torso
  const px = Math.cos(le);
  const py = Math.sin(le);
  ctx.beginPath();
  ctx.moveTo(hx - px * 12, hy - py * 12);
  ctx.lineTo(hx + px * 12, hy + py * 12);
  ctx.lineTo(sx + px * 15 + Math.sin(le) * 6, sy + py * 15 - Math.cos(le) * 6);
  ctx.lineTo(sx - px * 15 + Math.sin(le) * 6, sy - py * 15 - Math.cos(le) * 6);
  ctx.closePath();
  ctx.fillStyle = col(L.primary);
  ctx.fill();
  if (ol) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // belt + emblem
  seg(ctx, [hx - px * 12 + Math.sin(le) * 5, hy - py * 12 - Math.cos(le) * 5, hx + px * 12 + Math.sin(le) * 5, hy + py * 12 - Math.cos(le) * 5], 5, col(L.secondary), false);
  if (!tint) circ(ctx, hx + Math.sin(le) * 30 + px * 5, hy - Math.cos(le) * 30 + py * 5, 4.5, def.color, false);

  drawLeg(fL, false);

  // head
  circ(ctx, headX, headY, HR, col(L.skin), ol);
  if (!tint) {
    ctx.fillStyle = '#15151c';
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(hd);
    ctx.fillRect(HR * 0.35, -HR * 0.2, 4, 5);
    ctx.restore();
  }
  drawHairFront(ctx, L, headX, headY, HR, t, col, ol, hd);

  const fa = drawArm(pose.fa, false);
  if (L.acc === 'pads') {
    ctx.beginPath();
    ctx.ellipse(sx, sy + 3, 13, 9, le, 0, Math.PI * 2);
    ctx.fillStyle = col(L.accColor);
    ctx.fill();
    if (ol) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  ctx.restore();
  return fa;
}

function drawHairBack(ctx, L, x, y, R, t, col, ol, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const c = col(L.hair);
  const sw = Math.sin(t * 0.12) * 4;
  ctx.fillStyle = c;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  const fs = () => {
    ctx.fill();
    if (ol) ctx.stroke();
  };
  switch (L.style) {
    case 'long':
      ctx.beginPath();
      ctx.moveTo(-2, -R);
      ctx.quadraticCurveTo(-R * 1.6, -R * 0.2, -R * 1.2 + sw, R * 2.6);
      ctx.lineTo(-R * 0.3 + sw, R * 2.2);
      ctx.quadraticCurveTo(-R * 0.4, R, 0, 0);
      ctx.closePath();
      fs();
      break;
    case 'ponytail':
      ctx.beginPath();
      ctx.moveTo(-R * 0.8, -R * 0.6);
      ctx.quadraticCurveTo(-R * 2.4, -R * 0.4 + sw, -R * 2.2 + sw, R * 1.6);
      ctx.quadraticCurveTo(-R * 1.4, R * 0.2, -R * 0.6, -R * 0.1);
      ctx.closePath();
      fs();
      break;
    case 'twintails':
      for (const oy of [-0.5, 0.2]) {
        ctx.beginPath();
        ctx.moveTo(-R * 0.6, R * oy);
        ctx.quadraticCurveTo(-R * 2 + sw, R * (oy + 0.5), -R * 1.6 + sw, R * (oy + 2.2));
        ctx.quadraticCurveTo(-R * 1.1, R * (oy + 0.9), -R * 0.3, R * (oy + 0.3));
        ctx.closePath();
        fs();
      }
      break;
    case 'hood':
      ctx.fillStyle = col(U.shade(L.primary, -0.2));
      ctx.beginPath();
      ctx.moveTo(R * 0.3, -R * 1.25);
      ctx.quadraticCurveTo(-R * 1.8, -R * 1.2, -R * 1.5, R * 1.5);
      ctx.lineTo(-R * 0.2, R * 1.2);
      ctx.closePath();
      fs();
      break;
  }
  ctx.restore();
}

function drawHairFront(ctx, L, x, y, R, t, col, ol, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const c = col(L.hair);
  ctx.fillStyle = c;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  const fs = () => {
    ctx.fill();
    if (ol) ctx.stroke();
  };
  const cap = (from = Math.PI * 0.95, to = Math.PI * 2.05, r = R + 2) => {
    ctx.beginPath();
    ctx.arc(0, 0, r, from, to);
    ctx.closePath();
    fs();
  };
  switch (L.style) {
    case 'spiky':
      ctx.beginPath();
      ctx.moveTo(R * 0.9, -R * 0.3);
      ctx.lineTo(R * 0.8, -R * 1.5);
      ctx.lineTo(R * 0.2, -R * 1.1);
      ctx.lineTo(-R * 0.2, -R * 1.9);
      ctx.lineTo(-R * 0.6, -R * 1.1);
      ctx.lineTo(-R * 1.6, -R * 1.3);
      ctx.lineTo(-R * 1.1, -R * 0.4);
      ctx.lineTo(-R * 1.8, R * 0.2);
      ctx.lineTo(-R * 0.9, R * 0.5);
      ctx.closePath();
      fs();
      break;
    case 'long':
    case 'ponytail':
    case 'twintails':
    case 'bob':
    case 'slick':
    case 'buzz':
      cap(Math.PI * 0.9, Math.PI * 2.08, L.style === 'buzz' ? R + 1 : R + 2.5);
      if (L.style === 'bob') {
        ctx.beginPath();
        ctx.moveTo(-R * 1.1, -R * 0.2);
        ctx.quadraticCurveTo(-R * 1.4, R, -R * 0.4, R * 1.1);
        ctx.lineTo(-R * 0.2, 0);
        ctx.closePath();
        fs();
      }
      if (L.style === 'slick') {
        ctx.beginPath();
        ctx.moveTo(R, -R * 0.6);
        ctx.quadraticCurveTo(0, -R * 1.7, -R * 1.6, -R * 0.6);
        ctx.lineTo(-R * 0.5, -R * 0.3);
        ctx.closePath();
        fs();
      }
      break;
    case 'mohawk':
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (1.25 + i * 0.13);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.12) * R, Math.sin(a - 0.12) * R);
        ctx.lineTo(Math.cos(a) * R * 1.9, Math.sin(a) * R * 1.9);
        ctx.lineTo(Math.cos(a + 0.12) * R, Math.sin(a + 0.12) * R);
        ctx.closePath();
        fs();
      }
      break;
    case 'hood':
      ctx.fillStyle = col(U.shade(L.primary, -0.2));
      ctx.beginPath();
      ctx.arc(0, 0, R + 4, Math.PI * 0.85, Math.PI * 1.85);
      ctx.quadraticCurveTo(R * 0.4, -R * 0.4, -R * 0.1, R * 0.9);
      ctx.closePath();
      fs();
      break;
    case 'helmet':
      ctx.fillStyle = col(L.secondary);
      ctx.beginPath();
      ctx.arc(0, 0, R + 3, Math.PI * 0.75, Math.PI * 2.1);
      ctx.lineTo(R + 3, R * 0.5);
      ctx.lineTo(-R * 0.7, R * 0.9);
      ctx.closePath();
      fs();
      ctx.fillStyle = OUT;
      ctx.fillRect(R * 0.1, -R * 0.35, R, 4);
      ctx.fillStyle = col(L.primary);
      ctx.fillRect(-R * 0.3, -R - 8, 6, 10);
      break;
    case 'leafy':
      cap();
      ctx.fillStyle = col('#7cb342');
      for (let i = 0; i < 4; i++) {
        const a = Math.PI * (1.1 + i * 0.25);
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * R * 1.2, Math.sin(a) * R * 1.2, 8, 4, a, 0, Math.PI * 2);
        fs();
      }
      break;
    case 'wrap':
      ctx.fillStyle = col(L.secondary);
      cap(Math.PI * 0.9, Math.PI * 2.1, R + 4);
      ctx.fillStyle = col(L.primary);
      ctx.fillRect(-R - 2, -R * 0.4, R * 2 + 4, 5);
      break;
    case 'flame': {
      const cols = ['#ff6f00', '#ffab00', '#ff3d00'];
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (1.05 + i * 0.2);
        const fl = 1.7 + Math.sin(t * 0.4 + i) * 0.35;
        ctx.fillStyle = col(cols[i % 3]);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.3) * R, Math.sin(a - 0.3) * R);
        ctx.lineTo(Math.cos(a) * R * fl - 5, Math.sin(a) * R * fl);
        ctx.lineTo(Math.cos(a + 0.3) * R, Math.sin(a + 0.3) * R);
        ctx.closePath();
        fs();
      }
      break;
    }
  }

  // accessories on the head
  const ac = col(L.accColor || L.secondary);
  switch (L.acc) {
    case 'mask':
      ctx.fillStyle = ac;
      ctx.beginPath();
      ctx.moveTo(R * 1.05, R * 0.05);
      ctx.lineTo(R * 0.9, R * 0.8);
      ctx.lineTo(-R * 0.5, R * 0.9);
      ctx.lineTo(-R * 0.3, R * 0.05);
      ctx.closePath();
      fs();
      break;
    case 'crown':
      ctx.fillStyle = ac;
      ctx.beginPath();
      ctx.moveTo(-R * 0.8, -R * 0.9);
      ctx.lineTo(-R * 0.7, -R * 1.7);
      ctx.lineTo(-R * 0.3, -R * 1.2);
      ctx.lineTo(0, -R * 1.9);
      ctx.lineTo(R * 0.3, -R * 1.2);
      ctx.lineTo(R * 0.7, -R * 1.7);
      ctx.lineTo(R * 0.8, -R * 0.9);
      ctx.closePath();
      fs();
      break;
    case 'halo':
      ctx.strokeStyle = ac;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(-2, -R * 1.9 + Math.sin(t * 0.1) * 2, R * 0.9, R * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'headphones':
      ctx.strokeStyle = ac;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, R + 4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.fillStyle = col(L.secondary);
      ctx.beginPath();
      ctx.ellipse(-R * 0.1, R * 0.05, 6, 9, 0, 0, Math.PI * 2);
      fs();
      break;
    case 'band':
      ctx.fillStyle = ac;
      ctx.fillRect(-R, -R * 0.55, R * 2, 5);
      ctx.strokeStyle = ac;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-R, -R * 0.4);
      ctx.lineTo(-R * 2, -R * 0.1 + Math.sin(t * 0.3) * 4);
      ctx.stroke();
      break;
    case 'star':
      drawStar(ctx, -R * 0.5, -R * 0.9, 7, ac, t * 0.05);
      break;
    case 'monocle':
      ctx.strokeStyle = ac;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(R * 0.45, -R * 0.05, 6, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'topknot':
      ctx.fillStyle = c;
      circ(ctx, -R * 0.4, -R * 1.2, 7, c, ol);
      break;
  }
  ctx.restore();
}

function drawStar(ctx, x, y, r, color, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawFighter(ctx, f, t) {
  const s = f.status;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  const sh = U.clamp(1 + f.y / 400, 0.3, 1);
  ctx.ellipse(f.x, 2, 42 * f.def.size * sh, 9 * sh, 0, 0, Math.PI * 2);
  ctx.fill();

  if (f.hidden) {
    ctx.globalAlpha = 0.15;
  }
  // buff auras
  if (s.armor > 0 || s.speed > 0 || s.power > 0 || f.state === 'attack' && f.move && f.move.type === 'super') {
    const c = s.armor > 0 ? '#cfd8dc' : s.speed > 0 ? '#ffcc80' : s.power > 0 ? '#fff59d' : f.def.color;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(f.x, f.y - 75, 10, f.x, f.y - 75, 110 * f.def.size);
    gr.addColorStop(0, U.rgba(c.startsWith('#') ? c : '#ffffff', 0.35 + Math.sin(t * 0.3) * 0.1));
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(f.x - 130, f.y - 200, 260, 220);
    ctx.restore();
  }
  const jit = f.hitstop > 0 && f.state === 'hit' ? U.rand(-3, 3) : 0;
  drawFigure(ctx, f.def, f.pose, f.x + jit, f.y, f.facing, 1, { t });
  if (f.flash > 0 || s.freeze > 0) {
    ctx.save();
    ctx.globalAlpha = s.freeze > 0 ? 0.55 : 0.6;
    drawFigure(ctx, f.def, f.pose, f.x + jit, f.y, f.facing, 1, { t, tint: s.freeze > 0 ? (s.freezePersist ? '#ffd54f' : '#b3e5fc') : '#ffffff' });
    ctx.restore();
    if (s.freeze > 0 && !s.freezePersist) {
      ctx.strokeStyle = 'rgba(225,245,254,0.9)';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(179,229,252,0.3)';
      const hb = f.hurtbox();
      ctx.fillRect(hb.x - 8, hb.y - 10, hb.w + 16, hb.h + 10);
      ctx.strokeRect(hb.x - 8, hb.y - 10, hb.w + 16, hb.h + 10);
    }
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ hazards
function glow(ctx, x, y, r, color, a = 0.8) {
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, U.rgba(color, a));
  gr.addColorStop(1, U.rgba(color, 0));
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawHazard(ctx, h, t) {
  const c = h.color;
  const x = h.x;
  const y = h.y;
  const lifeT = h.maxLife ? U.clamp(h.life / h.maxLife, 0, 1) : 1;
  ctx.save();
  if (h.delay > 0) {
    // telegraph on the ground
    ctx.globalAlpha = 0.5 + Math.sin(t * 0.8) * 0.3;
    ctx.fillStyle = U.rgba(c, 0.5);
    ctx.beginPath();
    ctx.ellipse(x, 0, h.w * 0.6, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = c;
      ctx.fillRect(x + U.rand(-h.w / 2, h.w / 2), -U.rand(0, 20), 3, 6);
    }
    ctx.restore();
    return;
  }
  const dir = h.facing;
  switch (h.vis) {
    case 'orb':
    case 'fire':
    case 'lava':
    case 'venom': {
      ctx.globalCompositeOperation = 'lighter';
      const r = Math.max(h.w, h.h) * 0.6;
      const core = h.vis === 'fire' ? '#fff3a0' : h.vis === 'lava' ? '#ffcc80' : h.vis === 'venom' ? '#f4ff81' : '#ffffff';
      glow(ctx, x, y, r * 2, c, 0.6);
      for (let i = 0; i < 3; i++) glow(ctx, x - U.sign(h.vx) * i * r * 0.6, y + Math.sin(t * 0.5 + i) * 4, r * (1 - i * 0.2), c, 0.7);
      glow(ctx, x, y, r * 0.6, core, 1);
      break;
    }
    case 'gust': {
      ctx.strokeStyle = U.rgba(c, 0.85);
      ctx.lineWidth = 4;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(x - dir * i * 12, y, h.h * 0.5 - i * 6, dir > 0 ? -1.1 : Math.PI - 1.1, dir > 0 ? 1.1 : Math.PI + 1.1);
        ctx.stroke();
      }
      break;
    }
    case 'shard':
    case 'kunai': {
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(h.vy, h.vx));
      ctx.fillStyle = h.vis === 'kunai' ? '#b0bec5' : c;
      ctx.strokeStyle = h.vis === 'kunai' ? '#7e57c2' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(h.w / 2, 0);
      ctx.lineTo(0, -h.h / 2);
      ctx.lineTo(-h.w / 2, 0);
      ctx.lineTo(0, h.h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (h.vis === 'kunai') {
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, 0, 0, 24, '#7e57c2', 0.6);
      }
      break;
    }
    case 'boulder':
      ctx.translate(x, y);
      ctx.rotate(h.spin);
      ctx.fillStyle = '#8d6e63';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = h.w / 2 * (0.85 + ((i * 37) % 10) / 50);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#5d4037';
      ctx.beginPath();
      ctx.moveTo(-h.w * 0.2, -h.w * 0.1);
      ctx.lineTo(h.w * 0.1, h.w * 0.15);
      ctx.stroke();
      break;
    case 'spikes': {
      ctx.fillStyle = '#8d6e63';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const sx = x - dir * i * 22;
        const hh = h.h * (1 - i * 0.25);
        ctx.beginPath();
        ctx.moveTo(sx - 16, 0);
        ctx.lineTo(sx + dir * 4, -hh);
        ctx.lineTo(sx + 16, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'beam':
    case 'firebeam':
    case 'rail':
    case 'light':
    case 'soundbeam': {
      ctx.globalCompositeOperation = 'lighter';
      const x0 = x - h.w / 2;
      const th = h.h * (0.8 + Math.sin(t * 0.9) * 0.15) * Math.min(1, (h.maxLife - h.life + 1) / 3) * Math.min(1, h.life / 4);
      const gr = ctx.createLinearGradient(0, y - th, 0, y + th);
      gr.addColorStop(0, U.rgba(c, 0));
      gr.addColorStop(0.5, U.rgba(c, 0.9));
      gr.addColorStop(1, U.rgba(c, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(x0, y - th, h.w, th * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(x0, y - th * 0.2, h.w, th * 0.4);
      if (h.vis === 'soundbeam') {
        ctx.strokeStyle = U.rgba(c, 0.8);
        ctx.lineWidth = 4;
        for (let i = 0; i < 8; i++) {
          const ox = x0 + ((t * 20 * dir + i * h.w / 8) % h.w + h.w) % h.w;
          ctx.beginPath();
          ctx.ellipse(ox, y, 10, th * 0.9, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (h.vis === 'firebeam') {
        for (let i = 0; i < 6; i++) glow(ctx, x0 + Math.random() * h.w, y + U.rand(-th, th) * 0.7, U.rand(20, 50), '#ffab00', 0.5);
      }
      glow(ctx, h.owner.x + dir * 40, y, h.h * 0.9, c, 0.9);
      break;
    }
    case 'whip': {
      const o = h.owner;
      const x0 = o.x + dir * 30;
      const x1 = x0 + dir * h.w;
      ctx.strokeStyle = U.rgba(c, 0.9);
      ctx.lineCap = 'round';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.quadraticCurveTo((x0 + x1) / 2, y - 40 * Math.sin(t * 0.8), x1, y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 4;
      ctx.stroke();
      break;
    }
    case 'bolt':
    case 'lightning': {
      ctx.globalCompositeOperation = 'lighter';
      const vert = h.vis === 'lightning';
      const len = vert ? h.y + 800 : h.w;
      ctx.strokeStyle = c;
      ctx.lineWidth = 5;
      ctx.shadowColor = c;
      ctx.shadowBlur = 20;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        if (vert) {
          let px = x;
          ctx.moveTo(px, h.y + h.h / 2);
          for (let yy = h.y + h.h / 2; yy > -800; yy -= 40) {
            px = x + U.rand(-18, 18);
            ctx.lineTo(px, yy);
          }
        } else {
          const x0 = x - h.w / 2;
          ctx.moveTo(dir > 0 ? x0 : x0 + h.w, y);
          for (let i = 1; i <= 12; i++) ctx.lineTo(dir > 0 ? x0 + (h.w * i) / 12 : x0 + h.w - (h.w * i) / 12, y + U.rand(-h.h, h.h) * 0.6);
        }
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
      }
      if (vert) glow(ctx, x, h.y + h.h / 2, 60, c, 0.8);
      void len;
      break;
    }
    case 'pillar':
    case 'geyser':
    case 'icepillar':
    case 'bramble':
    case 'sandpillar':
    case 'lightpillar': {
      const grow = Math.min(1, (h.maxLife - h.life + 1) / 4) * Math.min(1, h.life / 5 + 0.3);
      const ph = h.h * grow;
      const x0 = x - h.w / 2;
      if (h.vis === 'geyser' || h.vis === 'lightpillar') {
        ctx.globalCompositeOperation = 'lighter';
        const gr = ctx.createLinearGradient(x0, 0, x0 + h.w, 0);
        gr.addColorStop(0, U.rgba(c, 0));
        gr.addColorStop(0.5, U.rgba(c, 0.95));
        gr.addColorStop(1, U.rgba(c, 0));
        ctx.fillStyle = gr;
        ctx.fillRect(x0, -ph, h.w, ph);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(x - h.w * 0.12, -ph, h.w * 0.24, ph);
      } else {
        const fill = h.vis === 'icepillar' ? '#b2ebf2' : h.vis === 'bramble' ? '#33691e' : h.vis === 'sandpillar' ? '#e0a96d' : '#8d6e63';
        ctx.fillStyle = fill;
        ctx.strokeStyle = h.vis === 'icepillar' ? '#ffffff' : OUT;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0 + h.w * 0.15, -ph * 0.8);
        ctx.lineTo(x, -ph);
        ctx.lineTo(x0 + h.w * 0.85, -ph * 0.8);
        ctx.lineTo(x0 + h.w, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (h.vis === 'bramble') {
          ctx.fillStyle = '#c5e1a5';
          for (let i = 0; i < 6; i++) {
            const yy = -ph * (i / 6);
            ctx.beginPath();
            ctx.moveTo(x0 + (i % 2 ? 0 : h.w), yy);
            ctx.lineTo(x0 + (i % 2 ? -12 : h.w + 12), yy - 8);
            ctx.lineTo(x0 + (i % 2 ? 4 : h.w - 4), yy - 14);
            ctx.fill();
          }
        }
      }
      break;
    }
    case 'ring':
    case 'firering':
    case 'nova':
    case 'frost':
    case 'clockring':
    case 'timestop':
    case 'quake':
    case 'shock':
    case 'vortex':
    case 'sandstorm': {
      const p = 1 - lifeT;
      if (h.vis === 'timestop') {
        ctx.fillStyle = `rgba(255,213,79,${0.35 * lifeT})`;
        ctx.fillRect(x - 3000, -2000, 6000, 3000);
        break;
      }
      if (h.vis === 'quake' || h.vis === 'shock') {
        ctx.fillStyle = U.rgba(h.vis === 'quake' ? '#a1887f' : c, 0.6 * lifeT);
        ctx.beginPath();
        ctx.ellipse(x, 0, h.w / 2 * (0.3 + p * 0.7), 24, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 3; i++) {
          const rx = x + U.rand(-h.w / 2, h.w / 2);
          ctx.fillStyle = '#8d6e63';
          ctx.fillRect(rx, -U.rand(10, 50) * lifeT, 8, 8);
        }
        break;
      }
      ctx.globalCompositeOperation = 'lighter';
      if (h.vis === 'vortex' || h.vis === 'sandstorm') {
        ctx.strokeStyle = U.rgba(c, 0.6);
        ctx.lineWidth = 3;
        const n = h.vis === 'sandstorm' ? 14 : 6;
        for (let i = 0; i < n; i++) {
          const a = t * 0.3 + i * 1.1;
          ctx.beginPath();
          ctx.ellipse(x, y, h.w / 2 * (0.4 + (i % 3) * 0.2), h.h / 2 * (0.2 + (i % 2) * 0.2), 0, a, a + 2);
          ctx.stroke();
        }
        if (h.vis === 'sandstorm') {
          ctx.fillStyle = 'rgba(224,169,109,0.18)';
          ctx.fillRect(x - h.w / 2, y - h.h / 2, h.w, h.h);
        }
        glow(ctx, x, y, 40, c, 0.8);
        break;
      }
      const rr = (h.w / 2) * (0.25 + p * 0.75);
      ctx.lineWidth = 10 * lifeT + 2;
      ctx.strokeStyle = U.rgba(c, 0.9);
      ctx.beginPath();
      ctx.ellipse(x, y, rr, rr * (h.h / h.w), 0, 0, Math.PI * 2);
      ctx.stroke();
      glow(ctx, x, y, rr, c, 0.35 * lifeT);
      if (h.vis === 'frost') {
        ctx.fillStyle = 'rgba(224,247,250,0.25)';
        ctx.fillRect(x - h.w / 2, y - h.h / 2, h.w, h.h);
      }
      if (h.vis === 'clockring') {
        ctx.strokeStyle = U.rgba(c, 0.9);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(t * 0.3) * rr * 0.8, y + Math.sin(t * 0.3) * rr * 0.8);
        ctx.stroke();
      }
      break;
    }
    case 'tornado': {
      ctx.globalCompositeOperation = 'lighter';
      const n = 9;
      for (let i = 0; i < n; i++) {
        const fy = y + h.h / 2 - (i / n) * h.h;
        const rw = h.w * (0.25 + (i / n) * 0.5);
        ctx.strokeStyle = U.rgba(c, 0.55);
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(x + Math.sin(t * 0.3 + i) * 12, fy, rw / 2, 12, 0, t * 0.5 + i, t * 0.5 + i + 4.5);
        ctx.stroke();
      }
      break;
    }
    case 'wave': {
      const x0 = x - h.w / 2;
      const gr = ctx.createLinearGradient(0, -h.h, 0, 0);
      gr.addColorStop(0, '#e1f5fe');
      gr.addColorStop(0.3, c);
      gr.addColorStop(1, '#0d47a1');
      ctx.fillStyle = gr;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      const front = dir > 0 ? x0 + h.w : x0;
      const back = dir > 0 ? x0 : x0 + h.w;
      ctx.moveTo(back, 0);
      ctx.quadraticCurveTo(back + dir * h.w * 0.3, -h.h * 0.7, x, -h.h);
      ctx.quadraticCurveTo(front + dir * 30, -h.h * 1.05, front - dir * 10, -h.h * 0.6);
      ctx.quadraticCurveTo(front - dir * 40, -h.h * 0.5, front, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
      break;
    }
    case 'star': {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, y, 40, c, 0.6);
      drawStar(ctx, x, y, 20, '#ffffff', h.spin);
      drawStar(ctx, x, y, 15, c, h.spin);
      break;
    }
    case 'sound': {
      ctx.strokeStyle = U.rgba(c, 0.9);
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x - dir * i * 14, y, h.h * 0.5 - i * 8, dir > 0 ? -0.9 : Math.PI - 0.9, dir > 0 ? 0.9 : Math.PI + 0.9);
        ctx.stroke();
      }
      break;
    }
    case 'sand': {
      ctx.fillStyle = c;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(x + U.rand(-10, 10), y + U.rand(-8, 8), U.rand(3, 6), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'vine':
    case 'chain': {
      const o = h.owner;
      const hx = o.x + dir * 30 * o.def.size;
      const hy = o.y - 100 * o.def.size;
      ctx.strokeStyle = h.vis === 'vine' ? '#2e7d32' : '#90a4ae';
      ctx.lineWidth = h.vis === 'vine' ? 7 : 5;
      if (h.vis === 'chain') ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo((hx + x) / 2, (hy + y) / 2 + Math.sin(t * 0.6) * 12, x, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = h.vis === 'vine' ? '#66bb6a' : '#cfd8dc';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + dir * 16, y);
      ctx.lineTo(x - dir * 6, y - 12);
      ctx.lineTo(x - dir * 6, y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'clock': {
      ctx.translate(x, y);
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, 0, 36, c, 0.5);
      ctx.rotate(h.spin * 2);
      ctx.strokeStyle = c;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, h.w / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-h.w / 2, 0);
      ctx.lineTo(h.w / 2, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -h.w / 3);
      ctx.stroke();
      break;
    }
    case 'meteor': {
      ctx.globalCompositeOperation = 'lighter';
      const a = Math.atan2(h.vy, h.vx);
      for (let i = 0; i < 5; i++) glow(ctx, x - Math.cos(a) * i * 20, y - Math.sin(a) * i * 20, h.w * (0.8 - i * 0.12), i < 2 ? '#ffab00' : c, 0.6);
      ctx.globalCompositeOperation = 'source-over';
      circ(ctx, x, y, h.w * 0.35, '#4e342e', true);
      break;
    }
    case 'serpent': {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) glow(ctx, x - dir * i * 16, y + Math.sin(t * 0.4 + i * 0.8) * 16, 30 - i * 2, c, 0.6);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#33691e';
      ctx.beginPath();
      ctx.ellipse(x + dir * 10, y + Math.sin(t * 0.4) * 16, 28, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(x + dir * 20 - 3, y + Math.sin(t * 0.4) * 16 - 8, 6, 5);
      break;
    }
    case 'mine': {
      const on = h.triggered;
      if (on) {
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, x, y, h.w * 0.7, c, 0.8 * lifeT);
        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + U.rand(-h.w / 2, h.w / 2), -U.rand(20, h.h));
          ctx.stroke();
        }
      } else {
        circ(ctx, x, -8, 10, '#424242', true);
        glow(ctx, x, -12, 12 + Math.sin(t * 0.3) * 4, c, h.arm > 0 ? 0.3 : 0.9);
      }
      break;
    }
    case 'seed': {
      if (h.triggered) {
        ctx.fillStyle = '#33691e';
        for (let i = 0; i < 5; i++) {
          const sx = x - h.w / 2 + (i + 0.5) * (h.w / 5);
          ctx.beginPath();
          ctx.moveTo(sx - 10, 0);
          ctx.lineTo(sx, -h.h * lifeT);
          ctx.lineTo(sx + 10, 0);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#6d4c41';
        ctx.beginPath();
        ctx.ellipse(x, -6, 12, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9ccc65';
        ctx.fillRect(x - 1, -18, 3, 10);
      }
      break;
    }
    case 'quicksand':
    case 'lavapool': {
      const lava = h.vis === 'lavapool';
      ctx.fillStyle = lava ? `rgba(255,112,67,${0.75})` : 'rgba(141,110,99,0.8)';
      ctx.beginPath();
      ctx.ellipse(x, -2, h.w / 2, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      if (lava) {
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, x, -6, h.w * 0.4, '#ffab00', 0.4);
      }
      if (h.triggered) {
        ctx.fillStyle = lava ? 'rgba(255,171,0,0.6)' : 'rgba(215,180,140,0.6)';
        ctx.fillRect(x - h.w / 2, -h.h * lifeT, h.w, h.h * lifeT);
      }
      break;
    }
    case 'cloud': {
      const a = h.triggered ? 0.5 * lifeT + 0.1 : 0.35;
      ctx.fillStyle = `rgba(198,255,0,${a})`;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(x + Math.cos(i + t * 0.05) * h.w * 0.3, (h.triggered ? y : -h.h * 0.3) + Math.sin(i * 2) * 20, h.triggered ? 50 : 26, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'icewall': {
      ctx.fillStyle = 'rgba(178,235,242,0.7)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      const grow = Math.min(1, (h.maxLife - h.life + 1) / 5);
      ctx.beginPath();
      ctx.moveTo(x - h.w / 2, 0);
      ctx.lineTo(x - h.w / 2 + 6, -h.h * grow);
      ctx.lineTo(x + h.w / 2, -h.h * grow + 20);
      ctx.lineTo(x + h.w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 8, -h.h * 0.8 * grow);
      ctx.lineTo(x + 6, -h.h * 0.4 * grow);
      ctx.stroke();
      break;
    }
    default:
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, y, Math.max(h.w, h.h) * 0.6, c, 0.8);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ particles
function drawParticle(ctx, p) {
  const a = p.life / p.max;
  ctx.globalAlpha = Math.max(0, a);
  switch (p.type) {
    case 'spark':
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * 0.7;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5);
      ctx.stroke();
      break;
    case 'ring':
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4 * a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.4 - a), 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'text':
      ctx.font = `900 ${Math.round(28 * (p.scale || 1))}px Impact, 'Arial Black', sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#000';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
      break;
    case 'star':
      drawStar(ctx, p.x, p.y, p.size * 1.5, p.color, p.life * 0.2);
      break;
    case 'plus':
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size, p.y - 1.5, p.size * 2, 3);
      ctx.fillRect(p.x - 1.5, p.y - p.size, 3, p.size * 2);
      break;
    case 'dust':
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.5 - a * 0.5), 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ stages
function mountains(ctx, baseY, color, seed, amp, off, W) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-10, baseY + 400);
  for (let x = -10; x <= W + 20; x += 20) {
    const wx = x + off;
    const h = Math.sin(wx * 0.004 + seed) * amp + Math.sin(wx * 0.011 + seed * 2) * amp * 0.4 + Math.sin(wx * 0.027 + seed) * amp * 0.15;
    ctx.lineTo(x, baseY - h);
  }
  ctx.lineTo(W + 20, baseY + 400);
  ctx.closePath();
  ctx.fill();
}

const STAGES = [
  {
    name: 'Sky Temple', floor: '#6d4c41', floorLine: '#8d6e63',
    draw(ctx, cam, gy, t, W, H) {
      const gr = ctx.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#2b1055');
      gr.addColorStop(0.5, '#d65a31');
      gr.addColorStop(1, '#f7b267');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
      glow(ctx, W * 0.7 - cam.x * 0.02, gy - 250, 180, '#ffe082', 0.8);
      mountains(ctx, gy - 140, '#7a3b50', 1, 90, cam.x * 0.08, W);
      mountains(ctx, gy - 60, '#4a2545', 3, 70, cam.x * 0.2, W);
      // temple pillars
      const off = -(cam.x * 0.5) % 420;
      for (let i = -1; i < 5; i++) {
        const px = off + i * 420;
        ctx.fillStyle = '#3b1f2b';
        ctx.fillRect(px, gy - 300, 34, 300);
        ctx.fillRect(px - 14, gy - 312, 62, 16);
      }
      for (let i = 0; i < 8; i++) {
        const lx = ((i * 260 - cam.x * 0.35 + t * 0.3) % (W + 200) + W + 200) % (W + 200) - 100;
        const ly = gy - 260 - (i % 3) * 60 + Math.sin(t * 0.03 + i) * 10;
        glow(ctx, lx, ly, 22, '#ffb74d', 0.9);
        ctx.fillStyle = '#e65100';
        ctx.fillRect(lx - 6, ly - 8, 12, 16);
      }
    },
  },
  {
    name: 'Frozen Lake', floor: '#b3cde0', floorLine: '#e1f5fe',
    draw(ctx, cam, gy, t, W, H) {
      const gr = ctx.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#020024');
      gr.addColorStop(0.6, '#0b3d6b');
      gr.addColorStop(1, '#5fa8d3');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + ((i * 7) % 10) / 15})`;
        ctx.fillRect(((i * 211 - cam.x * 0.02) % W + W) % W, (i * 97) % (gy - 250), 2, 2);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = `rgba(${k ? 120 : 80},255,${170 + k * 30},0.12)`;
        ctx.lineWidth = 50;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 120 + k * 40 + Math.sin(x * 0.006 + t * 0.01 + k) * 40);
        ctx.stroke();
      }
      ctx.restore();
      mountains(ctx, gy - 120, '#27496d', 5, 110, cam.x * 0.08, W);
      mountains(ctx, gy - 40, '#dbe9f4', 7, 50, cam.x * 0.2, W);
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 97 + t * (0.5 + (i % 3) * 0.3) - cam.x * 0.3) % W + W) % W;
        const sy = ((i * 53 + t * (1 + (i % 4) * 0.4)) % gy);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(sx, sy, 3, 3);
      }
    },
  },
  {
    name: 'Magma Forge', floor: '#2b1a17', floorLine: '#ff7043',
    draw(ctx, cam, gy, t, W, H) {
      const gr = ctx.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#120000');
      gr.addColorStop(0.7, '#5a1106');
      gr.addColorStop(1, '#c43e00');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
      mountains(ctx, gy - 130, '#2a0a05', 2, 140, cam.x * 0.08, W);
      const vx = W * 0.5 - cam.x * 0.08 + 300;
      glow(ctx, vx, gy - 300, 160, '#ff6d00', 0.5);
      mountains(ctx, gy - 40, '#1a0703', 9, 60, cam.x * 0.2, W);
      for (let i = 0; i < 30; i++) {
        const ex = ((i * 131 - cam.x * 0.3 + Math.sin(t * 0.02 + i) * 30) % W + W) % W;
        const ey = gy - ((t * (1 + (i % 5) * 0.4) + i * 71) % (gy + 40));
        ctx.fillStyle = i % 2 ? '#ffab00' : '#ff3d00';
        ctx.fillRect(ex, ey, 3, 3);
      }
    },
  },
  {
    name: 'Neon City', floor: '#1d1b2f', floorLine: '#ff4081',
    draw(ctx, cam, gy, t, W, H) {
      const gr = ctx.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#0f0c29');
      gr.addColorStop(0.6, '#302b63');
      gr.addColorStop(1, '#ff6e7f');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
      glow(ctx, W * 0.3, gy - 280, 140, '#ff80ab', 0.5);
      const layers = [[0.1, '#241e4e', 260, 90], [0.25, '#16123a', 180, 120]];
      layers.forEach(([f, colr, hmax, bw], li) => {
        const off = -(cam.x * f) % bw;
        for (let i = -1; i < W / bw + 2; i++) {
          const seed = Math.abs(Math.floor(i + (cam.x * f) / bw)) * 7 + li * 3;
          const bh = hmax * (0.5 + ((seed * 37) % 10) / 20);
          const bx = off + i * bw;
          ctx.fillStyle = colr;
          ctx.fillRect(bx, gy - bh, bw - 8, bh);
          for (let wy = gy - bh + 12; wy < gy - 10; wy += 18) {
            for (let wx = bx + 8; wx < bx + bw - 18; wx += 16) {
              if (((wx * 13 + wy * 7 + seed) | 0) % 5 === 0) {
                ctx.fillStyle = ((wx + wy + seed) | 0) % 3 ? '#ffd54f' : '#18ffff';
                ctx.fillRect(wx, wy, 6, 8);
              }
            }
          }
        }
      });
    },
  },
  {
    name: 'Bamboo Grove', floor: '#4e6b2f', floorLine: '#8bc34a',
    draw(ctx, cam, gy, t, W, H) {
      const gr = ctx.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#8ecae6');
      gr.addColorStop(1, '#e9f5db');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
      mountains(ctx, gy - 150, '#a3c4bc', 4, 120, cam.x * 0.06, W);
      mountains(ctx, gy - 70, '#6a994e', 6, 70, cam.x * 0.15, W);
      [[0.35, '#386641', 70], [0.55, '#2d4f2f', 110]].forEach(([f, colr, sp]) => {
        const off = -(cam.x * f) % sp;
        for (let i = -1; i < W / sp + 2; i++) {
          const bx = off + i * sp + Math.sin(t * 0.02 + i) * 3;
          ctx.fillStyle = colr;
          ctx.fillRect(bx, 0, 14, gy);
          for (let yy = 40; yy < gy; yy += 70) ctx.fillRect(bx - 2, yy, 18, 4);
        }
      });
      for (let i = 0; i < 16; i++) {
        const lx = ((i * 157 + t * 1.2 - cam.x * 0.4) % W + W) % W;
        const ly = (i * 61 + t * (0.8 + (i % 3) * 0.3)) % gy;
        ctx.fillStyle = '#90be6d';
        ctx.beginPath();
        ctx.ellipse(lx, ly, 7, 3, t * 0.05 + i, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
];
