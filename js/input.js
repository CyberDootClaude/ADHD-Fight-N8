// Keyboard, gamepad and touch input -> per-player logical buttons.
const BUTTONS = ['left', 'right', 'up', 'down', 'L', 'H', 'S', 'D', 'SU', 'jump', 'start', 'esc'];
const BUFFER_FRAMES = 10;

const KEYMAP = [
  {
    left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    L: ['KeyF'], H: ['KeyG'], S: ['KeyH'], D: ['Space'], SU: ['KeyT'],
    jump: [], start: ['Enter', 'KeyP'], esc: ['Escape'],
  },
  {
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    L: ['Comma', 'Numpad1'], H: ['Period', 'Numpad2'], S: ['Slash', 'Numpad3'],
    D: ['ShiftRight', 'Numpad0'], SU: ['Semicolon', 'Numpad4'],
    jump: [], start: ['NumpadEnter'], esc: ['Backspace'],
  },
];

const Keys = {
  down: new Set(),
  // keys pressed since the last game tick, so very quick taps are never lost
  tapped: new Set(),
  endTick() {
    this.tapped.clear();
  },
  isDown(code) {
    return this.down.has(code) || this.tapped.has(code);
  },
  init() {
    const block = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Slash', 'Quote', 'Backspace']);
    window.addEventListener('keydown', (e) => {
      if (block.has(e.code)) e.preventDefault();
      if (!e.repeat) this.tapped.add(e.code);
      this.down.add(e.code);
      SFX.init();
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  },
};

// On-screen touch controls feed player 1.
const Touch = {
  state: {},
  active: false,
  init() {
    const pad = document.getElementById('touch');
    if (!pad) return;
    const enable = () => {
      if (this.active) return;
      this.active = true;
      pad.classList.add('on');
    };
    window.addEventListener('touchstart', enable, { passive: true });
    const setFrom = (e) => {
      e.preventDefault();
      SFX.init();
      const next = {};
      for (const t of e.touches) {
        const el = document.elementFromPoint(t.clientX, t.clientY);
        const k = el && el.dataset ? el.dataset.k : null;
        if (k) k.split(',').forEach((kk) => (next[kk] = true));
      }
      this.state = next;
      pad.querySelectorAll('[data-k]').forEach((el) => {
        el.classList.toggle('pressed', el.dataset.k.split(',').some((kk) => next[kk]));
      });
    };
    ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach((ev) =>
      pad.addEventListener(ev, setFrom, { passive: false })
    );
  },
};

function readGamepad(index) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = pads && pads[index];
  const r = {};
  if (!gp) return r;
  const b = (i) => gp.buttons[i] && gp.buttons[i].pressed;
  const ax = gp.axes[0] || 0;
  const ay = gp.axes[1] || 0;
  r.left = b(14) || ax < -0.4;
  r.right = b(15) || ax > 0.4;
  r.up = b(12) || ay < -0.5;
  r.down = b(13) || ay > 0.5;
  r.jump = b(0);
  r.L = b(2);
  r.H = b(3);
  r.S = b(1);
  r.D = b(4) || b(5);
  r.SU = b(6) || b(7);
  r.start = b(9);
  r.esc = b(8);
  return r;
}

// Collects raw held state for a player from all devices.
function rawForPlayer(idx, mergeBoth, bothPads) {
  const r = {};
  if (bothPads) {
    const gp2 = readGamepad(1);
    for (const k in gp2) if (gp2[k]) r[k] = true;
  }
  const maps = mergeBoth ? KEYMAP : [KEYMAP[idx]];
  for (const m of maps) {
    for (const btn of BUTTONS) {
      if (m[btn].some((code) => Keys.isDown(code))) r[btn] = true;
    }
  }
  const gp = readGamepad(idx);
  for (const k in gp) if (gp[k]) r[k] = true;
  if (idx === 0 && Touch.active) for (const k in Touch.state) if (Touch.state[k]) r[k] = true;
  return r;
}

class PlayerInput {
  constructor() {
    this.held = {};
    this.prev = {};
    this.buf = {};
    this.edge = {};
    this.frame = 0;
    this.lastTap = { left: -99, right: -99 };
    this.dbl = { left: false, right: false };
    this.locked = false;
  }

  update(raw) {
    this.frame++;
    this.prev = this.held;
    this.held = {};
    for (const k of BUTTONS) {
      const h = !this.locked && !!raw[k];
      this.held[k] = h;
      this.edge[k] = h && !this.prev[k];
      if (this.edge[k]) this.buf[k] = BUFFER_FRAMES;
      else if (this.buf[k] > 0) this.buf[k]--;
    }
    // "jump" button acts as up-press for jumping only
    for (const d of ['left', 'right']) {
      this.dbl[d] = false;
      if (this.edge[d]) {
        if (this.frame - this.lastTap[d] < 13) this.dbl[d] = true;
        this.lastTap[d] = this.frame;
      }
    }
  }

  pressed(k) { return this.buf[k] > 0; }
  consume(k) { this.buf[k] = 0; }
  clearBuffer() { for (const k of BUTTONS) this.buf[k] = 0; }
  dirX() { return (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0); }
}
