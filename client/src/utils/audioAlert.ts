class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5; // Default 50% volume

  constructor() {
    try {
      if (typeof window !== 'undefined') {
        const savedVol = localStorage.getItem('fayda_audio_volume');
        if (savedVol !== null) {
          const parsed = parseFloat(savedVol);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
            this.volume = parsed;
          }
        }
      }
    } catch {}
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('fayda_audio_volume', this.volume.toString());
      }
    } catch {}
  }

  public getVolume(): number {
    return this.volume;
  }

  public playExtremeAlert() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const effectiveVol = this.volume;
      
      // Dual tone alert
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.exponentialRampToValueAtTime(587.33, now + 0.15);

      gain.gain.setValueAtTime(0.18 * effectiveVol * 2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);

      // Repeat second ping for urgency
      setTimeout(() => {
        if (this.isMuted || !this.ctx || this.volume <= 0) return;
        const now2 = this.ctx.currentTime;
        const osc3 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();

        osc3.type = 'sawtooth';
        osc3.frequency.setValueAtTime(1174.66, now2);
        osc3.frequency.exponentialRampToValueAtTime(1760, now2 + 0.2);

        gain2.gain.setValueAtTime(0.2 * this.volume * 2, now2);
        gain2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.35);

        osc3.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc3.start(now2);
        osc3.stop(now2 + 0.35);
      }, 180);
    } catch (e) {
      console.warn('Audio alert error:', e);
    }
  }

  public playStrongAlert() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.12); // B5

      gain.gain.setValueAtTime(0.12 * this.volume * 2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('Audio alert error:', e);
    }
  }

  public playTargetHitAlert() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // 4-note ascending triumphant arpeggio: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.22 * this.volume * 2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } catch (e) {
      console.warn('Audio alert error:', e);
    }
  }

  public playChime() {
    if (this.isMuted || this.volume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Pleasant dual bell chime: G5 (784Hz) -> C6 (1046Hz)
      const notes = [783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.18 * this.volume * 2, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.4);
      });
    } catch (e) {
      console.warn('Audio alert error:', e);
    }
  }

  public async play(soundType?: string): Promise<void> {
    if (this.isMuted) return;
    if (soundType === 'targetHit') this.playTargetHitAlert();
    else if (soundType === 'extreme' || soundType === 'marketOpen') this.playExtremeAlert();
    else if (soundType === 'chime') this.playChime();
    else this.playStrongAlert();
  }
}

export const soundManager = new SoundSynthesizer();

