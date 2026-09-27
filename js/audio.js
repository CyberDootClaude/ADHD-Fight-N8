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
