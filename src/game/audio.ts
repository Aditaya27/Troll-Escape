import { GameSettings } from './types';

class AudioSystem {
  private ctx: AudioContext | null = null;
  private bgmBuffer: AudioBuffer | null = null;
  private bgmSource: AudioBufferSourceNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private settings: GameSettings = { sfxVolume: 5, bgmVolume: 5 };
  private bgmGenerating: boolean = false;

  async init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.error("Audio failed to resume", e);
      }
    }

    if (this.ctx && !this.bgmGain) {
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.connect(this.ctx.destination);
    }
    if (this.ctx && !this.sfxGain) {
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
    }
    this.applySettings(this.settings);
  }

  applySettings(settings: GameSettings) {
    this.settings = settings;
    if (this.bgmGain) {
      this.bgmGain.gain.value = (settings.bgmVolume / 10) * 0.2; // Doubled from 0.1
    }
    if (this.sfxGain) {
      this.sfxGain.gain.value = (settings.sfxVolume / 10) * 0.2;
    }
  }

  private async generateBGMBuffer() {
    if (!this.ctx) return null;
    if (this.bgmBuffer) return this.bgmBuffer;
    this.bgmGenerating = true;

    const sampleRate = this.ctx.sampleRate;
    const bpm = 70;
    const beatLen = 60 / bpm;
    // Loop of 16 beats (4 bars)
    const duration = beatLen * 16;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);

    // Eerie reverb / delay effect
    const delay = offlineCtx.createDelay(3.0);
    delay.delayTime.value = beatLen * 0.75; // Dotted 8th note delay
    const feedback = offlineCtx.createGain();
    feedback.gain.value = 0.5;
    
    // Slight lowpass on the delay line for a darker distant sound
    const delayFilter = offlineCtx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 800;

    delay.connect(delayFilter);
    delayFilter.connect(feedback);
    feedback.connect(delay);

    const mainGain = offlineCtx.createGain();
    mainGain.gain.value = 0.4;
    delay.connect(mainGain);
    mainGain.connect(offlineCtx.destination);
    
    const dryGain = offlineCtx.createGain();
    dryGain.gain.value = 0.6;
    dryGain.connect(offlineCtx.destination);

    // 1. Drones / Ambient wind
    const startDrone = (freq: number, vol: number) => {
      const drone = offlineCtx.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = freq;
      
      const droneGain = offlineCtx.createGain();
      droneGain.gain.value = vol;
      
      // Tremolo/wobble for eerie feel
      const trem = offlineCtx.createOscillator();
      trem.type = 'sine';
      trem.frequency.value = 0.15; // ultra slow
      const tremGain = offlineCtx.createGain();
      tremGain.gain.value = vol * 0.5;
      trem.connect(tremGain);
      tremGain.connect(droneGain.gain);
      trem.start(0);
      trem.stop(duration);

      drone.connect(droneGain);
      droneGain.connect(mainGain);
      drone.start(0);
      drone.stop(duration);
    };
    startDrone(55, 0.2); // Low A Drone
    startDrone(110, 0.05); // A2 Drone

    // 2. Soft Piano/Bell Synth
    const playNote = (time: number, freq: number, isChime: boolean = false) => {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        
        osc.type = isChime ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        
        // Attack/Decay
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(isChime ? 0.05 : 0.2, time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, time + (isChime ? 3.0 : 2.5));
        
        osc.connect(gain);
        gain.connect(mainGain); // Sent to delay
        gain.connect(dryGain);  // Sent out dry
        
        osc.start(time);
        osc.stop(time + 3.0);
    };

    // Melody: Suspenseful, somewhat playful but eerie (A minor / Diminished vibes)
    const notes = [
        { b: 0, f: 440.00 }, // A4
        { b: 1.5, f: 523.25 }, // C5
        { b: 3, f: 622.25 }, // D#5 (dissonance)
        
        { b: 6, f: 415.30 }, // G#4
        { b: 7, f: 329.63 }, // E4
        
        { b: 8, f: 440.00 }, // A4
        { b: 9.5, f: 523.25 }, // C5
        { b: 11, f: 311.13 }, // D#4 (Drop lower)
        
        { b: 14, f: 293.66 }, // D4 (Suspenseful resolving tease)
    ];

    notes.forEach(n => {
        const t = n.b * beatLen;
        playNote(t, n.f, false); // Base note
        playNote(t + 0.02, n.f * 2.01, true); // Slightly detuned octave chime
        
        // Add occasional eerie backwards swells
        if (n.b === 3 || n.b === 11) {
            const swell = offlineCtx.createOscillator();
            const swellGain = offlineCtx.createGain();
            swell.type = 'sine';
            swell.frequency.value = n.f * 0.5; // one octave below
            
            swellGain.gain.setValueAtTime(0, t);
            swellGain.gain.linearRampToValueAtTime(0.1, t + 1.2);
            swellGain.gain.linearRampToValueAtTime(0, t + 1.5);
            
            swell.connect(swellGain);
            swellGain.connect(mainGain);
            swell.start(t);
            swell.stop(t + 1.5);
        }
    });

    this.bgmBuffer = await offlineCtx.startRendering();
    this.bgmGenerating = false;
    return this.bgmBuffer;
  }

  private async ensureResumed() {
    if (this.ctx && this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch (e) {}
    }
  }

  async playBGM() {
    await this.ensureResumed();
    if (!this.ctx || !this.bgmGain) return;
    this.stopBGM();

    const buffer = await this.generateBGMBuffer();
    if (!buffer) return;

    // Check if we were stopped while generating
    if (this.ctx.state === 'suspended' && !this.bgmGenerating && !this.bgmBuffer) return;

    this.bgmSource = this.ctx.createBufferSource();
    this.bgmSource.buffer = buffer;
    this.bgmSource.loop = true;
    this.bgmSource.connect(this.bgmGain);
    
    this.bgmSource.start(0);
  }

  stopBGM() {
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch(e) {}
      this.bgmSource.disconnect();
      this.bgmSource = null;
    }
  }

  playJump() {
    this.ensureResumed();
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(this.sfxGain);

    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playFootstep() {
    this.ensureResumed();
    if (!this.ctx || !this.sfxGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(this.sfxGain);

    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
    
    gain.gain.setValueAtTime(2.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playClick() {
    this.ensureResumed();
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(this.sfxGain);

    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
    
    gain.gain.setValueAtTime(1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playDeath() {
    this.ensureResumed();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    
    gain.gain.setValueAtTime(1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.start(now);
    osc.stop(now + 0.3);

    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 2000;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    
    noise.start(now);
  }

  playGoal() {
    this.ensureResumed();
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(this.sfxGain);

    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(500, now + 0.1);
    osc.frequency.setValueAtTime(600, now + 0.2);
    osc.frequency.setValueAtTime(800, now + 0.3);
    
    gain.gain.setValueAtTime(1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);
    
    osc.start(now);
    osc.stop(now + 0.6);
  }
}

export const audioSystem = new AudioSystem();
