'use strict';
// ---- Tiny synthesized sound effects + ambient music (no audio files needed) ----
const Sfx = {
  ctx: null, master: null, musicGain: null, _musicTimer: null, _step: 0, _lastPlay: {},
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.45; this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.12; this.musicGain.connect(this.master);
      this.startMusic();
    } catch (e) { this.ctx = null; }
  },
  tone(freq, dur, type = 'sine', vol = 0.2, slide = 0, delay = 0, dest) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.2, freq = 1000, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  play(name) {
    if (!this.ctx || !Save.p.settings.sfx) return;
    const now = performance.now();
    if (this._lastPlay[name] && now - this._lastPlay[name] < 45) return; // avoid stacking
    this._lastPlay[name] = now;
    switch (name) {
      case 'coin': this.tone(1320, 0.08, 'square', 0.06); this.tone(1760, 0.12, 'square', 0.06, 0, 0.06); break;
      case 'bigcoin': [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.12, 0, i * 0.05)); break;
      case 'drop': this.tone(500, 0.12, 'sine', 0.12, -300); break;
      case 'eat': this.tone(220, 0.1, 'square', 0.07, 200); break;
      case 'buy': this.tone(880, 0.08, 'triangle', 0.15); this.tone(1320, 0.15, 'triangle', 0.15, 0, 0.07); break;
      case 'nope': this.tone(180, 0.18, 'sawtooth', 0.08, -60); break;
      case 'splash': this.noise(0.25, 0.12, 1800); break;
      case 'laser': this.tone(1600, 0.09, 'sawtooth', 0.05, -1200); break;
      case 'hit': this.noise(0.08, 0.15, 3000); this.tone(300, 0.08, 'square', 0.06, -150); break;
      case 'chomp': this.noise(0.15, 0.25, 600); this.tone(120, 0.2, 'sawtooth', 0.12, -60); break;
      case 'die': this.tone(400, 0.5, 'triangle', 0.1, -320); break;
      case 'alarm': for (let i = 0; i < 3; i++) { this.tone(600, 0.25, 'square', 0.07, 300, i * 0.5); this.tone(900, 0.25, 'square', 0.07, -300, i * 0.5 + 0.25); } break;
      case 'boom': this.noise(0.6, 0.35, 500); this.tone(90, 0.5, 'sine', 0.3, -60); break;
      case 'zap': this.noise(0.2, 0.15, 6000); this.tone(2000, 0.15, 'sawtooth', 0.05, -1800); break;
      case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.15, 0, i * 0.12)); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.15, 0, i * 0.25)); break;
      case 'quest': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.15, 0, i * 0.08)); break;
      case 'wish': for (let i = 0; i < 8; i++) this.tone(800 + i * 150, 0.2, 'sine', 0.08, 0, i * 0.05); break;
      case 'heart': this.tone(1046, 0.15, 'sine', 0.05, 200); break;
      case 'pop': this.tone(900, 0.06, 'sine', 0.1, 600); break;
      case 'sing': [659, 784, 880, 1046, 880].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.08, 0, i * 0.15)); break;
      case 'birth': this.tone(700, 0.12, 'sine', 0.1, 400); break;
      case 'event': [440, 660, 880].forEach((f, i) => this.tone(f, 0.2, 'square', 0.06, 0, i * 0.1)); break;
      case 'click': this.tone(660, 0.05, 'square', 0.05); break;
    }
  },
  // gentle generative arpeggio
  startMusic() {
    if (this._musicTimer || !this.ctx) return;
    const chords = [[220, 277, 330, 415], [196, 247, 294, 370], [175, 220, 262, 330], [196, 247, 294, 392]];
    this._musicTimer = setInterval(() => {
      if (!this.ctx || !Save.p.settings.music || document.hidden) return;
      const s = this._step++;
      const ch = chords[Math.floor(s / 16) % chords.length];
      const pat = [0, 2, 1, 3, 2, 1, 3, 2];
      if (s % 2 === 0) this.tone(ch[pat[(s / 2) % 8]] * 2, 0.5, 'sine', 0.35, 0, 0, this.musicGain);
      if (s % 16 === 0) this.tone(ch[0] / 2, 2.2, 'triangle', 0.5, 0, 0, this.musicGain);
      if (s % 8 === 4 && Math.random() < 0.5) this.tone(ch[3] * 4, 0.4, 'sine', 0.15, 0, 0, this.musicGain);
    }, 190);
  },
};
