// Tiny WebAudio synth for sound effects (no asset files needed).
const SFX = {
  ctx: null,
  master: null,
  enabled: true,
  noiseBuf: null,

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },

  tone(freq, dur, type = 'square', slideTo = null, vol = 0.3, delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  noise(dur, freq = 1200, vol = 0.3, sweepTo = null, type = 'bandpass', delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  },

  play(name) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    switch (name) {
      case 'hitL':
        this.noise(0.08, 2500, 0.35);
        this.tone(180, 0.08, 'triangle', 60, 0.3);
        break;
      case 'hitH':
        this.noise(0.16, 1400, 0.45, 300);
        this.tone(120, 0.18, 'sine', 40, 0.5);
        break;
      case 'block':
        this.tone(900, 0.05, 'square', 600, 0.12);
        this.noise(0.05, 4000, 0.2);
        break;
      case 'whoosh':
        this.noise(0.12, 600, 0.12, 2400);
        break;
      case 'jump':
        this.tone(260, 0.1, 'sine', 520, 0.12);
        break;
      case 'dash':
        this.noise(0.15, 3000, 0.18, 500, 'highpass');
        break;
      case 'proj':
        this.noise(0.25, 800, 0.22, 3000);
        this.tone(300, 0.15, 'sawtooth', 600, 0.06);
        break;
      case 'beam':
        this.tone(90, 0.5, 'sawtooth', 70, 0.2);
        this.noise(0.5, 1500, 0.25, 500);
        break;
      case 'boom':
        this.noise(0.45, 400, 0.5, 60, 'lowpass');
        this.tone(70, 0.4, 'sine', 30, 0.5);
        break;
      case 'zap':
        this.tone(1200, 0.12, 'sawtooth', 200, 0.12);
        this.noise(0.1, 5000, 0.2);
        break;
      case 'super':
        this.tone(200, 0.6, 'sawtooth', 1200, 0.15);
        this.tone(300, 0.6, 'square', 1800, 0.08);
        break;
      case 'ko':
        this.tone(400, 0.9, 'sawtooth', 40, 0.3);
        this.noise(0.8, 600, 0.4, 80, 'lowpass');
        break;
      case 'heal':
        this.tone(600, 0.2, 'sine', 900, 0.15);
        this.tone(900, 0.25, 'sine', 1300, 0.12, 0.1);
        break;
      case 'counter':
        this.tone(1500, 0.08, 'square', 800, 0.15);
        this.tone(500, 0.2, 'sawtooth', 1500, 0.12, 0.05);
        break;
      case 'select':
        this.tone(660, 0.05, 'square', null, 0.08);
        break;
      case 'confirm':
        this.tone(520, 0.08, 'square', null, 0.1);
        this.tone(780, 0.12, 'square', null, 0.1, 0.07);
        break;
      case 'back':
        this.tone(400, 0.1, 'square', 250, 0.08);
        break;
      case 'announce':
        this.tone(220, 0.3, 'sawtooth', 440, 0.12);
        this.tone(330, 0.35, 'square', 660, 0.08);
        break;
    }
  },
};

// ------------------------------------------------------------------ music
// Procedural background music: every track is generated from a small recipe
// (tempo, key, scale, chord progression, drum pattern) and a seed, then played
// by a look-ahead scheduler on the same WebAudio context as the sound effects.
const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);
const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  pent: [0, 3, 5, 7, 10, 12, 15],
  hira: [0, 2, 3, 7, 8, 12, 14],
};

// x = hit, - = rest; 16 steps per bar
const MUSIC_TRACKS = {
  menu: { bpm: 118, root: 45, scale: 'dorian', prog: [0, 5, 3, 4], seed: 7, lead: 'triangle', bass: 'triangle',
    kick: 'x-------x-------', snare: '----x-------x---', hat: '--x---x---x---x-', bassRhythm: 'x--x--x---x--x--', leadDensity: 0.35, pad: 0.05 },
  // Sky Temple: airy, pentatonic, swinging
  0: { bpm: 150, root: 50, scale: 'pent', prog: [0, 3, 4, 2], seed: 11, lead: 'triangle', bass: 'square',
    kick: 'x-----x---x-----', snare: '----x-------x---', hat: 'x-xxx-xxx-xxx-xx', bassRhythm: 'x--x--x-x--x--x-', leadDensity: 0.55, pad: 0.045 },
  // Frozen Lake: cold minor, bell-like lead
  1: { bpm: 140, root: 47, scale: 'minor', prog: [0, 5, 2, 6], seed: 23, lead: 'sine', bass: 'sawtooth',
    kick: 'x-------x-x-----', snare: '----x-------x--x', hat: 'x-x-x-x-x-x-x-x-', bassRhythm: 'x-x---x-x-x---x-', leadDensity: 0.5, pad: 0.06, bell: true },
  // Magma Forge: heavy phrygian, driving
  2: { bpm: 164, root: 40, scale: 'phrygian', prog: [0, 1, 0, 6], seed: 31, lead: 'sawtooth', bass: 'sawtooth',
    kick: 'x-x---x-x-x---x-', snare: '----x-------x---', hat: 'xxxxxxxxxxxxxxxx', bassRhythm: 'xxx-xxx-xxx-xx-x', leadDensity: 0.45, pad: 0.035 },
  // Neon City: synthwave
  3: { bpm: 156, root: 45, scale: 'minor', prog: [0, 5, 2, 6], seed: 47, lead: 'square', bass: 'sawtooth',
    kick: 'x---x---x---x---', snare: '----x-------x---', hat: '--x---x---x---xx', bassRhythm: 'x-xxx-xxx-xxx-xx', leadDensity: 0.6, pad: 0.05 },
  // Bamboo Grove: hirajoshi, plucky
  4: { bpm: 144, root: 52, scale: 'hira', prog: [0, 3, 0, 4], seed: 59, lead: 'triangle', bass: 'triangle',
    kick: 'x-----x-x-------', snare: '----x--x----x---', hat: 'x--x--x-x--x--x-', bassRhythm: 'x---x-x-x---x-x-', leadDensity: 0.5, pad: 0.04, pluck: true },
  // Desert Ruins: phrygian, hand-drum feel
  5: { bpm: 136, root: 48, scale: 'phrygian', prog: [0, 1, 0, 3], seed: 71, lead: 'triangle', bass: 'square',
    kick: 'x--x--x---x--x--', snare: '---x---x---x--x-', hat: 'x-x-xx-xx-x-xx-x', bassRhythm: 'x--x--x---x-x---', leadDensity: 0.55, pad: 0.04, pluck: true },
  // Void Throne: slow and menacing, then driving
  6: { bpm: 170, root: 38, scale: 'minor', prog: [0, 1, 5, 4], seed: 83, lead: 'sawtooth', bass: 'sawtooth',
    kick: 'x-x-x-x-x-x-x-xx', snare: '----x-------x-x-', hat: 'x-xxx-xxx-xxx-xx', bassRhythm: 'xxxxxxxxxxxxxxxx', leadDensity: 0.4, pad: 0.06 },
};

const Music = {
  enabled: true,
  track: null,
  want: null,
  gain: null,
  step: 0,
  nextT: 0,
  timer: null,
  duck: 1,

  // Pick the track to play; the scheduler starts once the audio context runs.
  play(id) {
    this.want = id;
    if (!this.enabled || !SFX.ctx) return;
    if (this.track && this.track.id === id) return;
    this.start(id);
  },
  setEnabled(on) {
    this.enabled = on;
    if (!on) this.stop();
    else if (this.want != null) this.play(this.want);
  },
  setDuck(v) {
    this.duck = v;
    if (this.gain && SFX.ctx) this.gain.gain.setTargetAtTime(0.16 * v, SFX.ctx.currentTime, 0.08);
  },

  start(id) {
    const c = SFX.ctx;
    const def = MUSIC_TRACKS[id];
    if (!c || !def) return;
    this.stop();
    if (!this.gain) {
      this.gain = c.createGain();
      this.gain.connect(c.destination);
    }
    this.gain.gain.cancelScheduledValues(c.currentTime);
    this.gain.gain.setValueAtTime(0, c.currentTime);
    this.gain.gain.linearRampToValueAtTime(0.16 * this.duck, c.currentTime + 1);
    this.track = Object.assign({ id, melody: this.compose(def) }, def);
    this.step = 0;
    this.nextT = c.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 40);
  },
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  },

  // A 4-bar lead line: a random walk over the scale, landing on chord tones on the beat.
  compose(def) {
    let s = def.seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const notes = [];
    let deg = 4;
    for (let bar = 0; bar < 4; bar++) {
      for (let i = 0; i < 16; i++) {
        const onBeat = i % 4 === 0;
        if (rnd() > def.leadDensity * (onBeat ? 1.6 : i % 2 === 0 ? 1 : 0.6)) { notes.push(null); continue; }
        deg += Math.round((rnd() - 0.5) * 4);
        if (onBeat) deg = def.prog[bar] + [0, 2, 4][Math.floor(rnd() * 3)] + 7 * (rnd() < 0.5 ? 1 : 0);
        deg = Math.max(0, Math.min(13, deg));
        notes.push({ deg, len: rnd() < 0.3 ? 2 : 1 });
      }
    }
    return notes;
  },

  note(deg, octave) {
    const tr = this.track;
    const sc = SCALES[tr.scale];
    const o = Math.floor(deg / 7);
    return midiHz(tr.root + 12 * (octave + o) + sc[((deg % 7) + 7) % 7]);
  },

  schedule() {
    const c = SFX.ctx;
    const tr = this.track;
    if (!c || !tr || c.state !== 'running') return;
    const sixteenth = 60 / tr.bpm / 4;
    if (this.nextT < c.currentTime - 0.5) this.nextT = c.currentTime + 0.05; // tab was asleep
    while (this.nextT < c.currentTime + 0.2) {
      this.playStep(this.step, this.nextT, sixteenth);
      this.nextT += sixteenth;
      this.step = (this.step + 1) % 64;
    }
  },

  voice(freq, t, dur, type, vol, cutoff) {
    const c = SFX.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = o;
    if (cutoff) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      o.connect(f);
      out = f;
    }
    out.connect(g);
    g.connect(this.gain);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
  hit(t, dur, freq, vol, type) {
    const c = SFX.ctx;
    const s = c.createBufferSource();
    s.buffer = SFX.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.gain);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  },

  playStep(step, t, sx) {
    const tr = this.track;
    const i = step % 16;
    const bar = Math.floor(step / 16);
    const chord = tr.prog[bar];
    if (tr.kick[i] === 'x') {
      const c = SFX.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g);
      g.connect(this.gain);
      o.start(t);
      o.stop(t + 0.2);
    }
    if (tr.snare[i] === 'x') this.hit(t, 0.14, 1800, 0.45, 'bandpass');
    if (tr.hat[i] === 'x') this.hit(t, 0.035, 8000, i % 4 === 2 ? 0.22 : 0.12, 'highpass');
    if (tr.bassRhythm[i] === 'x') {
      const deg = chord + (i % 8 === 6 ? 4 : 0);
      this.voice(this.note(deg, -1), t, sx * 1.8, tr.bass, 0.32, 900);
    }
    if (i === 0 && tr.pad) {
      for (const d of [0, 2, 4]) this.voice(this.note(chord + d, 0) * (1 + d * 0.0015), t, sx * 15, 'triangle', tr.pad, 1600);
    }
    const n = tr.melody[step];
    if (n) {
      const f = this.note(n.deg, 1);
      const dur = sx * (tr.pluck ? 1.2 : n.len * 1.6);
      this.voice(f, t, dur, tr.lead, tr.lead === 'sawtooth' || tr.lead === 'square' ? 0.07 : 0.13, tr.lead === 'sawtooth' ? 2600 : 0);
      if (tr.bell) this.voice(f * 2, t, dur * 2, 'sine', 0.04);
    }
  },
};
