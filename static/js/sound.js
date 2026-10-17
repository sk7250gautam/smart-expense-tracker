/**
 * CYBERVAULT 3D - Web Audio API Sound Synthesizer
 * Generates futuristic sci-fi sound effects natively without external audio files.
 */

class CyberSoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('cybervault_sound_enabled') !== 'false';
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('cybervault_sound_enabled', this.enabled);
    if (this.enabled) {
      this.init();
      this.playSuccess();
    }
    return this.enabled;
  }

  playTone(freq, type, duration, gainVal = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  playClick() {
    this.playTone(850, 'sine', 0.04, 0.08);
  }

  playHover() {
    this.playTone(420, 'triangle', 0.03, 0.03);
  }

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.16, 0.08);
      }, i * 65);
    });
  }

  playExpense() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.18);
  }

  playAlert() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    [320, 260].forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'square', 0.14, 0.08);
      }, idx * 120);
    });
  }
}

window.soundFx = new CyberSoundEngine();
