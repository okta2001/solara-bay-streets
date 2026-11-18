// Synthesized sound with WebAudio only - no audio files
export class AudioSys {
  constructor() {
    this.ctx = null; this.muted = false; this.master = null;
    this.engineOsc = null; this.engineGain = null; this.sirenOsc = null; this.sirenGain = null;
    this.bassTimer = 0; this.bassStep = 0;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 60;
      this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineGain); this.engineGain.connect(this.master); this.engineOsc.start();
      this.sirenOsc = this.ctx.createOscillator(); this.sirenOsc.type = 'triangle'; this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain(); this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master); this.sirenOsc.start();
    } catch (e) { this.ctx = null; }
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; }
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime; const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(g); g.connect(this.master); src.start(t);
  }
  gunshot() { this.noise(0.12, 0.5); this.tone(150, 0.1, 'square', 0.3, 40); }
  punch() { this.noise(0.06, 0.3); this.tone(90, 0.08, 'sine', 0.4, 50); }
  pickup() { this.tone(880, 0.1, 'sine', 0.25); setTimeout(() => this.tone(1320, 0.14, 'sine', 0.25), 70); }
  jingle() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.3), i * 110)); }
  crash() { this.noise(0.25, 0.45); this.tone(70, 0.2, 'sawtooth', 0.25, 35); }
  update(dt, speedRatio, sirenNear, playing) {
    if (!this.ctx) return;
    const eg = this.muted ? 0 : (playing ? 0.015 + speedRatio * 0.05 : 0);
    this.engineGain.gain.value += (eg - this.engineGain.gain.value) * 0.1;
    this.engineOsc.frequency.value = 55 + speedRatio * 140;
    const sg = this.muted ? 0 : (sirenNear ? 0.03 : 0);
    this.sirenGain.gain.value += (sg - this.sirenGain.gain.value) * 0.1;
    if (sirenNear) this.sirenOsc.frequency.value = 650 + Math.sin(performance.now() / 180) * 250;
    // simple looping bassline
    this.bassTimer -= dt;
    if (playing && this.bassTimer <= 0) {
      this.bassTimer = 0.42;
      const notes = [55, 55, 65.4, 55, 49, 49, 73.4, 82.4];
      this.tone(notes[this.bassStep % notes.length], 0.35, 'triangle', 0.12);
      this.bassStep++;
    }
  }
}
