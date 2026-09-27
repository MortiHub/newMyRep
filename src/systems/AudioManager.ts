// ============================================================
// Простые звуки через WebAudio API (осцилляторы).
// Никаких внешних файлов. Вызывать после первого user gesture.
// ============================================================

class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;

  /** Инициализация по первому касанию/клику (требование браузеров). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.25;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol = 1,
    slideTo?: number
  ): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    if (this.ctx.state === 'suspended') return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, slideTo),
        t0 + dur
      );
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  shoot(): void {
    this.tone(880, 0.09, 'square', 0.18, 320);
  }
  hit(): void {
    this.tone(220, 0.06, 'sawtooth', 0.12, 120);
  }
  kill(): void {
    this.tone(160, 0.14, 'triangle', 0.2, 60);
  }
  orb(): void {
    this.tone(1200, 0.07, 'sine', 0.15, 1800);
  }
  levelUp(): void {
    this.tone(523, 0.12, 'sine', 0.25);
    setTimeout(() => this.tone(659, 0.12, 'sine', 0.25), 90);
    setTimeout(() => this.tone(784, 0.2, 'sine', 0.3), 180);
  }
  hurt(): void {
    this.tone(110, 0.18, 'sawtooth', 0.3, 55);
  }
  explosion(): void {
    this.tone(90, 0.3, 'square', 0.3, 30);
  }
  death(): void {
    this.tone(300, 0.5, 'sawtooth', 0.3, 40);
  }
  uiClick(): void {
    this.tone(660, 0.05, 'sine', 0.2, 990);
  }
}

export const SFX = new SfxEngine();
