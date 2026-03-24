class AudioManager {
  constructor() {
    this.audioContext = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.masterGain = null;
    this.isInitialized = false;
    this.isMusicPlaying = false;
    this.musicOscillators = [];
    this.musicIntervalId = null;
    this.musicTimeouts = [];
    this.isMenuMusicPlaying = false;
    this.menuMusicOscillators = [];
    this.menuMusicIntervalId = null;
    this.currentDifficulty = 'medium';
    this.voidStormOsc = null;
    this.voidStormGain = null;
    this._isInGame = false;

    try { this.isMuted = localStorage.getItem('voidHopper_muted') === 'true'; } catch { this.isMuted = false; }

    // Music settings
    this.baseFrequency = 220; // A3
    this.tempo = 0.8;

    // SFX debounce — minimum ms between consecutive plays of the same sound
    this._sfxLastPlayed = {};
    this._sfxCooldowns = {
      boost: 80,
      bounce: 80,
      collision: 100,
      scoreMilestone: 150,
      coinPickup: 50,
      nearMiss: 100,
      comboTierUp: 120,
      moodIgnition: 400,
      moodChill: 400,
    };

    // Cached noise buffers (created on first init)
    this._noiseBuffers = {};
  }

  async initialize() {
    if (this.isInitialized && this.audioContext && this.audioContext.state === 'running') return;
    // Close old context if it's stuck in suspended/interrupted state (e.g. iOS after YouTube)
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) {}
    }
    this.isInitialized = false;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      if (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted') {
        await this.audioContext.resume();
      }

      // Limiter to prevent volume spikes when multiple SFX play simultaneously
      this.limiter = this.audioContext.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-6, this.audioContext.currentTime);   // start compressing at -6dB
      this.limiter.knee.setValueAtTime(3, this.audioContext.currentTime);         // soft knee
      this.limiter.ratio.setValueAtTime(20, this.audioContext.currentTime);       // hard limiting
      this.limiter.attack.setValueAtTime(0.001, this.audioContext.currentTime);   // instant catch
      this.limiter.release.setValueAtTime(0.05, this.audioContext.currentTime);   // quick release
      this.limiter.connect(this.audioContext.destination);

      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.limiter);
      this.masterGain.gain.value = 0.5;

      this.musicGain = this.audioContext.createGain();
      this.musicGain.connect(this.masterGain);
      this.musicGain.gain.value = 0.6;

      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.connect(this.masterGain);
      this.sfxGain.gain.value = 0.7;

      if (this.isMuted) {
        this.masterGain.gain.value = 0;
      }

      // Pre-generate noise buffers for SFX reuse
      this._noiseBuffers = {
        boost: this._createNoiseBuffer(0.2),
        collision: this._createNoiseBuffer(0.3),
        nearMiss: this._createNoiseBuffer(0.15),
      };

      this.isInitialized = true;
    } catch (error) {
      if (this.audioContext) {
        try { this.audioContext.close(); } catch (e) {}
        this.audioContext = null;
      }
    }
  }

  // SFX debounce — returns true if the sound should be skipped (too soon since last play)
  _sfxThrottled(name) {
    const now = performance.now();
    const cooldown = this._sfxCooldowns[name] || 50;
    if (now - (this._sfxLastPlayed[name] || 0) < cooldown) return true;
    this._sfxLastPlayed[name] = now;
    return false;
  }

  // Create a reusable noise buffer of given duration (seconds)
  _createNoiseBuffer(duration) {
    if (!this.audioContext) return null;
    const length = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Nuclear option for iOS: tear down everything and rebuild from scratch.
  // Called inside a user gesture (touchstart) so the new AudioContext is allowed to play.
  async forceReinitialize() {
    // Kill all running oscillators and intervals
    this._stopWatchdog();
    if (this.musicIntervalId) { clearInterval(this.musicIntervalId); this.musicIntervalId = null; }
    if (this.menuMusicIntervalId) { clearInterval(this.menuMusicIntervalId); this.menuMusicIntervalId = null; }
    this.musicTimeouts.forEach(t => clearTimeout(t));
    this.musicTimeouts = [];
    [...this.musicOscillators, ...this.menuMusicOscillators].forEach(({ osc, gain, filters }) => {
      try { osc.stop(); } catch (e) {}
      try { osc.disconnect(); } catch (e) {}
      try { gain.disconnect(); } catch (e) {}
      if (filters) filters.forEach(f => { try { f.disconnect(); } catch (e) {} });
    });
    this.musicOscillators = [];
    this.menuMusicOscillators = [];
    this.isMusicPlaying = false;
    this.isMenuMusicPlaying = false;
    // Clean up void storm oscillator
    if (this.voidStormOsc) {
      try { this.voidStormOsc.stop(); } catch (e) {}
      try { this.voidStormOsc.disconnect(); } catch (e) {}
    }
    if (this.voidStormGain) {
      try { this.voidStormGain.disconnect(); } catch (e) {}
    }
    this.voidStormOsc = null;
    this.voidStormGain = null;
    // Close the old context entirely
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) {}
    }
    this.audioContext = null;
    this.isInitialized = false;
    this._noiseBuffers = {};
    // Create a brand new context (inside user gesture = iOS allows it)
    await this.initialize();
  }

  // ── GAMEPLAY MUSIC — difficulty-specific ──────────────

  // Replace musicGain with a fresh node — instantly silences any orphaned
  // oscillators still connected to the old node (e.g. from a slow fade)
  _replaceMusicGain() {
    if (!this.audioContext || !this.masterGain) return;
    // Stop all tracked oscillators so they don't consume CPU
    [...this.musicOscillators, ...this.menuMusicOscillators].forEach(({ osc, gain, filters }) => {
      try { osc.stop(); } catch (e) {}
      try { osc.disconnect(); } catch (e) {}
      try { gain.disconnect(); } catch (e) {}
      if (filters) filters.forEach(f => { try { f.disconnect(); } catch (e) {} });
    });
    // Disconnect old musicGain so any untracked oscillators still connected go silent
    if (this.musicGain) {
      try { this.musicGain.disconnect(); } catch (e) {}
    }
    this.musicGain = this.audioContext.createGain();
    this.musicGain.connect(this.masterGain);
    this.musicOscillators = [];
    this.menuMusicOscillators = [];
  }

  async startMusic(difficulty) {
    if (!this.isInitialized) return;
    if (this.isMusicPlaying) return;

    if (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted') {
      try { await this.audioContext.resume(); } catch (e) { return; }
    }

    // Replace musicGain with a fresh node — this instantly orphans any
    // still-fading oscillators from previous music so they can't bleed through
    this._replaceMusicGain();

    this.isMusicPlaying = true;
    this._isInGame = true;
    this.currentDifficulty = difficulty || 'medium';
    this._startWatchdog();

    // Fade in the fresh musicGain cleanly from silence
    const now = this.audioContext.currentTime;
    this.musicGain.gain.setValueAtTime(0, now);
    this.musicGain.gain.linearRampToValueAtTime(0.6, now + 2.0);

    switch (this.currentDifficulty) {
      case 'easy': this._playEasyMusic(); break;
      case 'hard': this._playHardMusic(); break;
      default: this._playMediumMusic(); break;
    }
  }

  // ── EASY: Warm, peaceful, major key ──────────────────
  // Like floating through a sunlit nebula
  // Key of C major / A minor pentatonic, slow evolving pads
  _playEasyMusic() {
    const chords = [
      [261.63, 329.63, 392],       // C major (C E G)
      [349.23, 440, 523.25],       // F major (F A C)
      [392, 493.88, 587.33],       // G major (G B D)
      [220, 261.63, 329.63],       // Am (A C E) — gentle minor touch
    ];

    // Pentatonic melody — bright, hopeful
    const melodies = [
      [523.25, 587.33, 659.25, 784],     // C5 D5 E5 G5
      [784, 659.25, 587.33, 523.25],     // G5 E5 D5 C5
      [659.25, 784, 880, 784],           // E5 G5 A5 G5
      [523.25, 440, 392, 440],           // C5 A4 G4 A4
    ];

    let idx = 0;
    const CYCLE = 5;          // new chord every 5s
    const SUSTAIN = CYCLE + 2; // oscillators ring for 2s into next chord (crossfade overlap)
    const FADE_END = SUSTAIN - 0.3;

    const play = () => {
      if (!this.isMusicPlaying) return;
      if (this.audioContext.state !== 'running') return; // skip when suspended
      this._cleanupExpiredOscillators();

      const chord = chords[idx];
      const melody = melodies[idx];
      const now = this.audioContext.currentTime;

      // Warm pad — sine waves with gentle crossfade tails
      chord.forEach((freq, i) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 6, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06 - i * 0.01, now + 1.5);
        gain.gain.setValueAtTime(0.06 - i * 0.01, now + CYCLE - 1);
        gain.gain.linearRampToValueAtTime(0, now + FADE_END);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + SUSTAIN);
        this._trackOsc(this.musicOscillators, osc, gain, now + SUSTAIN);

        // Warm octave above — very soft
        const high = this.audioContext.createOscillator();
        const highGain = this.audioContext.createGain();
        high.type = 'sine';
        high.frequency.setValueAtTime(freq * 2, now);
        highGain.gain.setValueAtTime(0, now);
        highGain.gain.linearRampToValueAtTime(0.015, now + 2);
        highGain.gain.setValueAtTime(0.015, now + CYCLE - 1);
        highGain.gain.linearRampToValueAtTime(0, now + FADE_END);
        high.connect(highGain);
        highGain.connect(this.musicGain);
        high.start(now);
        high.stop(now + SUSTAIN);
        this._trackOsc(this.musicOscillators, high, highGain, now + SUSTAIN);
      });

      // Sub bass — gentle foundation
      const sub = this.audioContext.createOscillator();
      const subGain = this.audioContext.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(chord[0] / 2, now);
      subGain.gain.setValueAtTime(0, now);
      subGain.gain.linearRampToValueAtTime(0.04, now + 1);
      subGain.gain.setValueAtTime(0.04, now + CYCLE - 1);
      subGain.gain.linearRampToValueAtTime(0, now + FADE_END);
      sub.connect(subGain);
      subGain.connect(this.musicGain);
      sub.start(now);
      sub.stop(now + SUSTAIN);
      this._trackOsc(this.musicOscillators, sub, subGain, now + SUSTAIN);

      // Bright melody — bell-like sine tones, 2 notes per chord
      melody.slice(0, 2).forEach((freq, m) => {
        const del = m * 1.2;
        const stopT = now + del + 3.5;
        const mel = this.audioContext.createOscillator();
        const melGain = this.audioContext.createGain();
        mel.type = 'sine';
        mel.frequency.setValueAtTime(freq, now + del);
        melGain.gain.setValueAtTime(0, now + del);
        melGain.gain.linearRampToValueAtTime(0.055, now + del + 0.15);
        melGain.gain.exponentialRampToValueAtTime(0.001, now + del + 3);
        mel.connect(melGain);
        melGain.connect(this.musicGain);
        mel.start(now + del);
        mel.stop(stopT);
        this._trackOsc(this.musicOscillators, mel, melGain, stopT);
      });

      idx = (idx + 1) % chords.length;
    };

    play();
    this.musicIntervalId = setInterval(() => {
      if (this.isMusicPlaying) play();
    }, CYCLE * 1000);
  }

  // ── MEDIUM: Ethereal, mysterious, minor key ──────────
  // Deeper space exploration — the original vibe but richer
  // Am - F - C - G with added 7ths and 9ths
  _playMediumMusic() {
    const chords = [
      [220, 261.63, 329.63, 392],       // Am7 (A C E G)
      [174.61, 220, 261.63, 329.63],    // Fmaj7 (F A C E)
      [261.63, 329.63, 392, 493.88],    // Cmaj7 (C E G B)
      [196, 246.94, 293.66, 349.23],    // G7 (G B D F)
    ];

    // Haunting melody — minor scale, wider intervals
    const melodies = [
      [440, 523.25, 493.88, 440],       // A4 C5 B4 A4
      [349.23, 392, 440, 392],          // F4 G4 A4 G4
      [523.25, 659.25, 587.33, 523.25], // C5 E5 D5 C5
      [392, 349.23, 329.63, 293.66],    // G4 F4 E4 D4
    ];

    let idx = 0;
    const CYCLE = 6;
    const SUSTAIN = CYCLE + 2.5;
    const FADE_END = SUSTAIN - 0.3;

    const play = () => {
      if (!this.isMusicPlaying) return;
      if (this.audioContext.state !== 'running') return; // skip when suspended
      this._cleanupExpiredOscillators();

      const chord = chords[idx];
      const melody = melodies[idx];
      const now = this.audioContext.currentTime;

      // Deep filtered pad
      const pad = this.audioContext.createOscillator();
      const padGain = this.audioContext.createGain();
      const padFilter = this.audioContext.createBiquadFilter();
      pad.type = 'sawtooth';
      pad.frequency.setValueAtTime(chord[0] / 2, now);
      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(500, now);
      padFilter.frequency.linearRampToValueAtTime(700, now + 3);
      padFilter.Q.value = 2;
      padGain.gain.setValueAtTime(0, now);
      padGain.gain.linearRampToValueAtTime(0.025, now + 2);
      padGain.gain.setValueAtTime(0.025, now + CYCLE - 1);
      padGain.gain.linearRampToValueAtTime(0, now + FADE_END);
      pad.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(this.musicGain);
      pad.start(now);
      pad.stop(now + SUSTAIN);
      this._trackOsc(this.musicOscillators, pad, padGain, now + SUSTAIN, [padFilter]);

      // Chord tones with shimmer
      chord.forEach((freq, i) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05 - i * 0.008, now + 1.5);
        gain.gain.setValueAtTime(0.05 - i * 0.008, now + CYCLE - 1);
        gain.gain.linearRampToValueAtTime(0, now + FADE_END);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + SUSTAIN);
        this._trackOsc(this.musicOscillators, osc, gain, now + SUSTAIN);

        // Octave shimmer
        const shim = this.audioContext.createOscillator();
        const shimGain = this.audioContext.createGain();
        shim.type = 'sine';
        shim.frequency.setValueAtTime(freq * 2, now);
        shimGain.gain.setValueAtTime(0, now);
        shimGain.gain.linearRampToValueAtTime(0.01, now + 2.5);
        shimGain.gain.setValueAtTime(0.01, now + CYCLE - 1);
        shimGain.gain.linearRampToValueAtTime(0, now + FADE_END);
        shim.connect(shimGain);
        shimGain.connect(this.musicGain);
        shim.start(now);
        shim.stop(now + SUSTAIN);
        this._trackOsc(this.musicOscillators, shim, shimGain, now + SUSTAIN);
      });

      // Melody — triangle wave, gentle
      melody.slice(0, 2).forEach((freq, m) => {
        const del = m * 1.5;
        const stopT = now + del + 4;
        const mel = this.audioContext.createOscillator();
        const melGain = this.audioContext.createGain();
        const melFilter = this.audioContext.createBiquadFilter();
        mel.type = 'triangle';
        mel.frequency.setValueAtTime(freq, now + del);
        melFilter.type = 'lowpass';
        melFilter.frequency.setValueAtTime(2000, now);
        melGain.gain.setValueAtTime(0, now + del);
        melGain.gain.linearRampToValueAtTime(0.045, now + del + 0.3);
        melGain.gain.exponentialRampToValueAtTime(0.001, now + del + 3.5);
        mel.connect(melFilter);
        melFilter.connect(melGain);
        melGain.connect(this.musicGain);
        mel.start(now + del);
        mel.stop(stopT);
        this._trackOsc(this.musicOscillators, mel, melGain, stopT, [melFilter]);
      });

      idx = (idx + 1) % chords.length;
    };

    play();
    this.musicIntervalId = setInterval(() => {
      if (this.isMusicPlaying) play();
    }, CYCLE * 1000);
  }

  // ── HARD: Dark, tense, pulsing — cosmic void ────────
  // Minor key with diminished chords, pulsing bass, eerie overtones
  // Still calming but with an undercurrent of tension
  _playHardMusic() {
    const chords = [
      [146.83, 174.61, 220],             // Dm (D F A) — dark root
      [130.81, 155.56, 196],             // Cm (C Eb G) — ominous
      [123.47, 146.83, 185],             // Bdim (B D F) — tension
      [110, 130.81, 164.81],             // Am (A C E) — resolve
    ];

    // Eerie melody — chromatic touches, wide leaps
    const melodies = [
      [293.66, 349.23, 311.13, 261.63],  // D4 F4 Eb4 C4
      [261.63, 311.13, 293.66, 220],     // C4 Eb4 D4 A3
      [349.23, 293.66, 261.63, 246.94],  // F4 D4 C4 B3
      [220, 261.63, 246.94, 220],        // A3 C4 B3 A3
    ];

    let idx = 0;
    const CYCLE = 7;
    const SUSTAIN = CYCLE + 3;
    const FADE_END = SUSTAIN - 0.3;

    const play = () => {
      if (!this.isMusicPlaying) return;
      if (this.audioContext.state !== 'running') return; // skip when suspended
      this._cleanupExpiredOscillators();

      const chord = chords[idx];
      const melody = melodies[idx];
      const now = this.audioContext.currentTime;

      // Dark rumbling sub-bass with pulse
      const sub = this.audioContext.createOscillator();
      const subGain = this.audioContext.createGain();
      const subFilter = this.audioContext.createBiquadFilter();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(chord[0] / 2, now);
      subFilter.type = 'lowpass';
      subFilter.frequency.setValueAtTime(200, now);
      subFilter.Q.value = 4;
      subGain.gain.setValueAtTime(0, now);
      // Pulsing volume for tension — 7 pulses to fit cycle
      for (let p = 0; p < 7; p++) {
        const t = p * 0.95;
        subGain.gain.linearRampToValueAtTime(0.04, now + t + 0.2);
        subGain.gain.linearRampToValueAtTime(0.015, now + t + 0.7);
      }
      // Gentle tail into next cycle
      subGain.gain.linearRampToValueAtTime(0.01, now + CYCLE);
      subGain.gain.linearRampToValueAtTime(0, now + FADE_END);
      sub.connect(subFilter);
      subFilter.connect(subGain);
      subGain.connect(this.musicGain);
      sub.start(now);
      sub.stop(now + SUSTAIN);
      this._trackOsc(this.musicOscillators, sub, subGain, now + SUSTAIN, [subFilter]);

      // Dark pad — detuned for unease
      chord.forEach((freq, i) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 15, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600 + i * 100, now);
        filter.frequency.linearRampToValueAtTime(400, now + 6);
        filter.Q.value = 1;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.03 - i * 0.005, now + 2);
        gain.gain.setValueAtTime(0.03 - i * 0.005, now + CYCLE - 1);
        gain.gain.linearRampToValueAtTime(0, now + FADE_END);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + SUSTAIN);
        this._trackOsc(this.musicOscillators, osc, gain, now + SUSTAIN, [filter]);
      });

      // Eerie high overtone — distant, ghostly
      const ghost = this.audioContext.createOscillator();
      const ghostGain = this.audioContext.createGain();
      const ghostFilter = this.audioContext.createBiquadFilter();
      ghost.type = 'sine';
      ghost.frequency.setValueAtTime(chord[0] * 4, now);
      ghost.frequency.linearRampToValueAtTime(chord[0] * 3.5, now + CYCLE);
      ghostFilter.type = 'bandpass';
      ghostFilter.frequency.setValueAtTime(chord[0] * 4, now);
      ghostFilter.Q.value = 8;
      ghostGain.gain.setValueAtTime(0, now);
      ghostGain.gain.linearRampToValueAtTime(0.012, now + 3);
      ghostGain.gain.setValueAtTime(0.012, now + CYCLE - 1);
      ghostGain.gain.linearRampToValueAtTime(0, now + FADE_END);
      ghost.connect(ghostFilter);
      ghostFilter.connect(ghostGain);
      ghostGain.connect(this.musicGain);
      ghost.start(now);
      ghost.stop(now + SUSTAIN);
      this._trackOsc(this.musicOscillators, ghost, ghostGain, now + SUSTAIN, [ghostFilter]);

      // Melody — sine wave, sparse, with reverb-like delay
      melody.slice(0, 2).forEach((freq, m) => {
        const del = m * 2;
        const stopT = now + del + 4.5;
        // Main note
        const mel = this.audioContext.createOscillator();
        const melGain = this.audioContext.createGain();
        mel.type = 'sine';
        mel.frequency.setValueAtTime(freq, now + del);
        melGain.gain.setValueAtTime(0, now + del);
        melGain.gain.linearRampToValueAtTime(0.05, now + del + 0.2);
        melGain.gain.exponentialRampToValueAtTime(0.001, now + del + 4);
        mel.connect(melGain);
        melGain.connect(this.musicGain);
        mel.start(now + del);
        mel.stop(stopT);
        this._trackOsc(this.musicOscillators, mel, melGain, stopT);

        // Echo/delay ghost note
        const echoStopT = now + del + 4;
        const echo = this.audioContext.createOscillator();
        const echoGain = this.audioContext.createGain();
        echo.type = 'sine';
        echo.frequency.setValueAtTime(freq, now + del + 0.4);
        echoGain.gain.setValueAtTime(0, now + del + 0.4);
        echoGain.gain.linearRampToValueAtTime(0.02, now + del + 0.6);
        echoGain.gain.exponentialRampToValueAtTime(0.001, now + del + 3.5);
        echo.connect(echoGain);
        echoGain.connect(this.musicGain);
        echo.start(now + del + 0.4);
        echo.stop(echoStopT);
        this._trackOsc(this.musicOscillators, echo, echoGain, echoStopT);
      });

      idx = (idx + 1) % chords.length;
    };

    play();
    this.musicIntervalId = setInterval(() => {
      if (this.isMusicPlaying) play();
    }, CYCLE * 1000);
  }

  // ── SHARED MUSIC HELPERS ─────────────────────────────

  // Hard cap — if we exceed this many live oscillators, something is stuck
  static MAX_OSCILLATORS = 40;

  // Register an oscillator for tracking. Adds onended cleanup and enforces cap.
  // Optional filters array for BiquadFilter nodes that should be cleaned up with the oscillator.
  _trackOsc(arr, osc, gain, stopTime, filters) {
    osc.onended = () => {
      try { osc.disconnect(); } catch (e) {}
      try { gain.disconnect(); } catch (e) {}
      if (filters) filters.forEach(f => { try { f.disconnect(); } catch (e) {} });
    };
    arr.push({ osc, gain, stopTime, filters });
    // Enforce hard cap — kill oldest if too many
    if (arr.length > AudioManager.MAX_OSCILLATORS) {
      const excess = arr.splice(0, arr.length - AudioManager.MAX_OSCILLATORS);
      excess.forEach(({ osc: o, gain: g, filters: fs }) => {
        try { o.stop(); } catch (e) {}
        try { o.disconnect(); } catch (e) {}
        try { g.disconnect(); } catch (e) {}
        if (fs) fs.forEach(f => { try { f.disconnect(); } catch (e) {} });
      });
    }
  }

  // Start a watchdog that periodically force-kills stuck oscillators
  _startWatchdog() {
    if (this._watchdogId) return;
    this._watchdogId = setInterval(() => {
      this._forceCleanup(this.musicOscillators);
      this._forceCleanup(this.menuMusicOscillators);
    }, 2000);
  }

  _stopWatchdog() {
    if (this._watchdogId) {
      clearInterval(this._watchdogId);
      this._watchdogId = null;
    }
  }

  // Force-disconnect oscillators past their stopTime + grace period
  _forceCleanup(arr) {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    let write = 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].stopTime > now) {
        arr[write++] = arr[i];
      } else {
        const { osc, gain, filters } = arr[i];
        try { osc.stop(); } catch (e) {}
        try { osc.disconnect(); } catch (e) {}
        try { gain.disconnect(); } catch (e) {}
        if (filters) filters.forEach(f => { try { f.disconnect(); } catch (e) {} });
      }
    }
    arr.length = write;
  }

  // Remove oscillators that have already stopped naturally
  _cleanupExpiredOscillators() {
    this._forceCleanup(this.musicOscillators);
  }

  _stopGameOscillators(fadeDuration = 1.5) {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    const oscs = this.musicOscillators.splice(0);
    oscs.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fadeDuration);
        osc.stop(now + fadeDuration + 0.1);
      } catch (e) {}
    });
    // Hard-kill after fade duration as safety net (iOS gain ramps can fail)
    setTimeout(() => {
      oscs.forEach(({ osc, gain, filters }) => {
        try { osc.stop(); } catch (e) {}
        try { osc.disconnect(); } catch (e) {}
        try { gain.disconnect(); } catch (e) {}
        if (filters) filters.forEach(f => { try { f.disconnect(); } catch (e) {} });
      });
    }, (fadeDuration + 0.5) * 1000);
  }

  stopMusic() {
    if (!this.isInitialized) return;
    this.isMusicPlaying = false;
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    this.musicTimeouts.forEach(t => clearTimeout(t));
    this.musicTimeouts = [];
    // Cancel any in-progress ramps on musicGain to prevent gain spikes
    if (this.musicGain && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    }
    this._stopGameOscillators(1.5);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    try { localStorage.setItem('voidHopper_muted', this.isMuted); } catch {}
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.5;
    }
    return this.isMuted;
  }

  async toggleMusic() {
    if (this.isMusicPlaying || this.isMenuMusicPlaying) {
      this.stopMusic();
      this.stopMenuMusic();
      return false;
    } else {
      // Context-aware: start the right music type
      if (this._isInGame) {
        await this.startMusic(this.currentDifficulty);
        return this.isMusicPlaying;
      } else {
        await this.startMenuMusic();
        return this.isMenuMusicPlaying;
      }
    }
  }

  // ── MENU MUSIC — dreamy ambient ──────────────────────

  async startMenuMusic() {
    if (!this.isInitialized) return;
    if (this.isMenuMusicPlaying) return;

    if (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted') {
      try { await this.audioContext.resume(); } catch (e) { return; }
    }

    // Replace musicGain with a fresh node to silence any orphaned oscillators
    this._replaceMusicGain();

    // Fade in musicGain from silence for a clean start
    const menuNow = this.audioContext.currentTime;
    this.musicGain.gain.setValueAtTime(0, menuNow);
    this.musicGain.gain.linearRampToValueAtTime(0.6, menuNow + 2.0);

    this.isMenuMusicPlaying = true;
    this._isInGame = false;
    this._startWatchdog();

    // Ethereal chord progression: Dm9 - Bbmaj7 - Fmaj7 - Am7
    const chords = [
      [146.83, 174.61, 220, 261.63, 329.63], // Dm9
      [116.54, 146.83, 174.61, 220],          // Bbmaj7
      [174.61, 220, 261.63, 329.63],          // Fmaj7
      [110, 130.81, 164.81, 196],             // Am7
    ];

    const melodySequences = [
      [523.25, 493.88, 440, 392],
      [440, 392, 349.23, 329.63],
      [523.25, 587.33, 523.25, 440],
      [392, 349.23, 329.63, 293.66],
    ];

    let chordIndex = 0;
    const CYCLE = 6;
    const SUSTAIN = CYCLE + 2.5;
    const FADE_END = SUSTAIN - 0.3;

    const playMenuChord = () => {
      if (!this.isMenuMusicPlaying) return;
      if (this.audioContext.state !== 'running') return; // skip when suspended
      this._cleanupExpiredMenuOscillators();

      const chord = chords[chordIndex];
      const melody = melodySequences[chordIndex];
      const now = this.audioContext.currentTime;

      // Deep pad
      const pad = this.audioContext.createOscillator();
      const padGain = this.audioContext.createGain();
      const padFilter = this.audioContext.createBiquadFilter();
      pad.type = 'sawtooth';
      pad.frequency.setValueAtTime(chord[0] / 2, now);
      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(400, now);
      padFilter.frequency.linearRampToValueAtTime(600, now + 3);
      padFilter.Q.value = 2;
      padGain.gain.setValueAtTime(0, now);
      padGain.gain.linearRampToValueAtTime(0.025, now + 2);
      padGain.gain.setValueAtTime(0.025, now + CYCLE - 1);
      padGain.gain.linearRampToValueAtTime(0, now + FADE_END);
      pad.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(this.musicGain);
      pad.start(now);
      pad.stop(now + SUSTAIN);
      this._trackOsc(this.menuMusicOscillators, pad, padGain, now + SUSTAIN, [padFilter]);

      // Chord tones
      chord.forEach((freq, i) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04 - i * 0.005, now + 1.5);
        gain.gain.setValueAtTime(0.04 - i * 0.005, now + CYCLE - 1);
        gain.gain.linearRampToValueAtTime(0, now + FADE_END);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + SUSTAIN);
        this._trackOsc(this.menuMusicOscillators, osc, gain, now + SUSTAIN);

        // Shimmer
        const shim = this.audioContext.createOscillator();
        const shimGain = this.audioContext.createGain();
        shim.type = 'sine';
        shim.frequency.setValueAtTime(freq * 2, now);
        shimGain.gain.setValueAtTime(0, now);
        shimGain.gain.linearRampToValueAtTime(0.008, now + 2);
        shimGain.gain.setValueAtTime(0.008, now + CYCLE - 1);
        shimGain.gain.linearRampToValueAtTime(0, now + FADE_END);
        shim.connect(shimGain);
        shimGain.connect(this.musicGain);
        shim.start(now);
        shim.stop(now + SUSTAIN);
        this._trackOsc(this.menuMusicOscillators, shim, shimGain, now + SUSTAIN);
      });

      // Melody
      for (let m = 0; m < 2; m++) {
        const noteFreq = melody[m % melody.length];
        const noteDelay = m * 1.5;
        const stopT = now + noteDelay + 4;
        const mel = this.audioContext.createOscillator();
        const melGain = this.audioContext.createGain();
        const melFilter = this.audioContext.createBiquadFilter();
        mel.type = 'triangle';
        mel.frequency.setValueAtTime(noteFreq, now + noteDelay);
        melFilter.type = 'lowpass';
        melFilter.frequency.setValueAtTime(2000, now);
        melGain.gain.setValueAtTime(0, now + noteDelay);
        melGain.gain.linearRampToValueAtTime(0.045, now + noteDelay + 0.3);
        melGain.gain.exponentialRampToValueAtTime(0.001, now + noteDelay + 3.5);
        mel.connect(melFilter);
        melFilter.connect(melGain);
        melGain.connect(this.musicGain);
        mel.start(now + noteDelay);
        mel.stop(stopT);
        this._trackOsc(this.menuMusicOscillators, mel, melGain, stopT, [melFilter]);
      }

      chordIndex = (chordIndex + 1) % chords.length;
    };

    playMenuChord();
    this.menuMusicIntervalId = setInterval(() => {
      if (this.isMenuMusicPlaying) playMenuChord();
    }, CYCLE * 1000);
  }

  _cleanupExpiredMenuOscillators() {
    this._forceCleanup(this.menuMusicOscillators);
  }

  stopAllMenuOscillators(fadeDuration = 2.0) {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    const oscs = this.menuMusicOscillators.splice(0);
    oscs.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fadeDuration);
        osc.stop(now + fadeDuration + 0.1);
      } catch (e) {}
    });
    // Hard-kill after fade duration as safety net (iOS gain ramps can fail)
    setTimeout(() => {
      oscs.forEach(({ osc, gain, filters }) => {
        try { osc.stop(); } catch (e) {}
        try { osc.disconnect(); } catch (e) {}
        try { gain.disconnect(); } catch (e) {}
        if (filters) filters.forEach(f => { try { f.disconnect(); } catch (e) {} });
      });
    }, (fadeDuration + 0.5) * 1000);
  }

  stopMenuMusic() {
    if (!this.isMenuMusicPlaying) return;
    this.isMenuMusicPlaying = false;
    if (this.menuMusicIntervalId) {
      clearInterval(this.menuMusicIntervalId);
      this.menuMusicIntervalId = null;
    }
    // Cancel any in-progress ramps on musicGain to prevent gain spikes
    if (this.musicGain && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    }
    // Slow fade for smooth transition to gameplay music
    this.stopAllMenuOscillators(2.5);
  }

  ensureContextRunning() {
    if (!this.audioContext) return false;
    // Attempt to resume if suspended/interrupted — during gameplay the user is
    // actively touching the screen so the resume call is allowed on iOS.
    if (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted') {
      this.audioContext.resume().then(() => {
        // Kill all existing oscillators — their scheduled params are broken
        // after an interruption and will cause stuck/droning sounds
        if (this.musicIntervalId) {
          clearInterval(this.musicIntervalId);
          this.musicIntervalId = null;
        }
        this._replaceMusicGain();
        // Restart music cleanly
        if (this.isMusicPlaying) {
          this.isMusicPlaying = false;
          this.startMusic(this.currentDifficulty);
        }
      }).catch(() => {});
      return false;
    }
    return this.audioContext.state === 'running';
  }

  _restartActiveMusic() {
    if (this.isMusicPlaying) {
      if (this.musicIntervalId) clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
      this.isMusicPlaying = false;
      this.startMusic(this.currentDifficulty);
    } else if (this._wasGameMusicPlaying) {
      this._wasGameMusicPlaying = false;
      this.startMusic(this._savedDifficulty || this.currentDifficulty);
    }
    if (this.isMenuMusicPlaying) {
      if (this.menuMusicIntervalId) clearInterval(this.menuMusicIntervalId);
      this.menuMusicIntervalId = null;
      this.isMenuMusicPlaying = false;
      this.startMenuMusic();
    } else if (this._wasMenuMusicPlaying) {
      this._wasMenuMusicPlaying = false;
      this.startMenuMusic();
    }
  }

  // ── SOUND EFFECTS ────────────────────────────────────

  playBoostSound() {
    if (!this.isInitialized || !this.ensureContextRunning()) return;
    if (this._sfxThrottled('boost')) return;
    const now = this.audioContext.currentTime;

    const osc1 = this.audioContext.createOscillator();
    const gain1 = this.audioContext.createGain();
    const filter1 = this.audioContext.createBiquadFilter();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(200, now);
    osc1.frequency.exponentialRampToValueAtTime(600, now + 0.3);
    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(1200, now);
    filter1.Q.value = 1;
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain1.gain.linearRampToValueAtTime(0, now + 0.3);
    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.onended = () => { try { osc1.disconnect(); filter1.disconnect(); gain1.disconnect(); } catch(e){} };
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = this.audioContext.createOscillator();
    const gain2 = this.audioContext.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(400, now);
    osc2.frequency.exponentialRampToValueAtTime(800, now + 0.25);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.05);
    gain2.gain.linearRampToValueAtTime(0, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.onended = () => { try { osc2.disconnect(); gain2.disconnect(); } catch(e){} };
    osc2.start(now);
    osc2.stop(now + 0.25);

    const noise = this.audioContext.createBufferSource();
    noise.buffer = this._noiseBuffers.boost || this._createNoiseBuffer(0.2);
    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(2000, now);
    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.03, now + 0.02);
    noiseGain.gain.linearRampToValueAtTime(0, now + 0.2);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.onended = () => { try { noise.disconnect(); noiseFilter.disconnect(); noiseGain.disconnect(); } catch(e){} };
    noise.start(now);
    noise.stop(now + 0.2);
  }

  playBounceSound() {
    if (!this.isInitialized || !this.ensureContextRunning()) return;
    if (this._sfxThrottled('bounce')) return;
    const now = this.audioContext.currentTime;

    const osc1 = this.audioContext.createOscillator();
    const gain1 = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(350, now);
    osc1.frequency.exponentialRampToValueAtTime(180, now + 0.15);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.value = 2;
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.linearRampToValueAtTime(0, now + 0.15);
    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.onended = () => { try { osc1.disconnect(); filter.disconnect(); gain1.disconnect(); } catch(e){} };
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = this.audioContext.createOscillator();
    const gain2 = this.audioContext.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(80, now);
    osc2.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.onended = () => { try { osc2.disconnect(); gain2.disconnect(); } catch(e){} };
    osc2.start(now);
    osc2.stop(now + 0.1);
  }

  playCollisionSound() {
    if (!this.isInitialized || !this.ensureContextRunning()) return;
    if (this._sfxThrottled('collision')) return;
    const now = this.audioContext.currentTime;

    const noise = this.audioContext.createBufferSource();
    noise.buffer = this._noiseBuffers.collision || this._createNoiseBuffer(0.3);
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.onended = () => { try { noise.disconnect(); filter.disconnect(); gain.disconnect(); } catch(e){} };
    noise.start(now);
    noise.stop(now + 0.3);
  }

  playScoreMilestoneSound() {
    if (!this.isInitialized || !this.ensureContextRunning()) return;
    if (this._sfxThrottled('scoreMilestone')) return;
    const now = this.audioContext.currentTime;

    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    frequencies.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      gain.gain.setValueAtTime(0.15, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.5);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch(e){} };
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.5);
    });
  }

  playCoinPickupSound() {
    if (!this.isInitialized || !this.ensureContextRunning()) return;
    if (this._sfxThrottled('coinPickup')) return;
    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch(e){} };
    osc.start(now);
    osc.stop(now + 0.1);

    // Soft harmonic overtone for brightness
    const osc2 = this.audioContext.createOscillator();
    const gain2 = this.audioContext.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2000, now);
    osc2.frequency.exponentialRampToValueAtTime(2400, now + 0.04);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.06, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.onended = () => { try { osc2.disconnect(); gain2.disconnect(); } catch(e){} };
    osc2.start(now);
    osc2.stop(now + 0.08);
  }

  playNearMissSound() {
    if (!this.isInitialized || !this.ensureContextRunning()) return;
    if (this._sfxThrottled('nearMiss')) return;
    const now = this.audioContext.currentTime;

    // Quick frequency sweep from 400Hz down to 100Hz
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    filter.Q.value = 2;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + 0.15);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.onended = () => { try { osc.disconnect(); filter.disconnect(); gain.disconnect(); } catch(e){} };
    osc.start(now);
    osc.stop(now + 0.15);

    // Noise layer for whoosh texture
    const noise = this.audioContext.createBufferSource();
    noise.buffer = this._noiseBuffers.nearMiss || this._createNoiseBuffer(0.15);
    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.15);
    noiseFilter.Q.value = 1;
    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    noiseGain.gain.linearRampToValueAtTime(0, now + 0.15);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.onended = () => { try { noise.disconnect(); noiseFilter.disconnect(); noiseGain.disconnect(); } catch(e){} };
    noise.start(now);
    noise.stop(now + 0.15);
  }

  playComboTierUpSound(tier) {
    if (!this.isInitialized || !this.ensureContextRunning()) return;
    if (this._sfxThrottled('comboTierUp')) return;
    const now = this.audioContext.currentTime;

    const baseFreq = 400 + tier * 100;
    // Number of notes in arpeggio: 2 at low tiers, 3 at higher tiers
    const noteCount = tier >= 3 ? 3 : 2;
    const noteSpacing = 0.06;
    const noteDuration = 0.15;

    for (let n = 0; n < noteCount; n++) {
      const freq = baseFreq * Math.pow(1.25, n); // ascending intervals (major 3rd steps)
      const startTime = now + n * noteSpacing;
      const stopTime = startTime + noteDuration;
      const peakGain = 0.1 + tier * 0.02; // higher tiers = louder

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(Math.min(peakGain, 0.2), startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, stopTime);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch(e){} };
      osc.start(startTime);
      osc.stop(stopTime);

      // Add shimmer overtone for higher tiers
      if (tier >= 2) {
        const shim = this.audioContext.createOscillator();
        const shimGain = this.audioContext.createGain();
        shim.type = 'sine';
        shim.frequency.setValueAtTime(freq * 2, startTime);
        shimGain.gain.setValueAtTime(0, startTime);
        shimGain.gain.linearRampToValueAtTime(Math.min(peakGain * 0.3, 0.06), startTime + 0.01);
        shimGain.gain.exponentialRampToValueAtTime(0.01, stopTime);
        shim.connect(shimGain);
        shimGain.connect(this.sfxGain);
        shim.onended = () => { try { shim.disconnect(); shimGain.disconnect(); } catch(e){} };
        shim.start(startTime);
        shim.stop(stopTime);
      }
    }
  }

  playMoodIgnitionSound() {
    if (!this.isInitialized || !this.ensureContextRunning()) return;
    if (this._sfxThrottled('moodIgnition')) return;
    const now = this.audioContext.currentTime;

    // Gentle ascending chime — three soft sine notes rising in a major triad
    // Matches the game's ethereal ambient vibe instead of harsh swooshes
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 — warm major chord
    notes.forEach((freq, i) => {
      const delay = i * 0.12;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      // Gentle low-pass to keep it soft
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now + delay);
      filter.Q.value = 0.5;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.07, now + delay + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.6);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.onended = () => { try { osc.disconnect(); filter.disconnect(); gain.disconnect(); } catch(e){} };
      osc.start(now + delay);
      osc.stop(now + delay + 0.6);

      // Soft octave shimmer for warmth
      const shim = this.audioContext.createOscillator();
      const shimGain = this.audioContext.createGain();
      shim.type = 'sine';
      shim.frequency.setValueAtTime(freq * 2, now + delay);
      shimGain.gain.setValueAtTime(0, now + delay);
      shimGain.gain.linearRampToValueAtTime(0.02, now + delay + 0.1);
      shimGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);
      shim.connect(shimGain);
      shimGain.connect(this.sfxGain);
      shim.onended = () => { try { shim.disconnect(); shimGain.disconnect(); } catch(e){} };
      shim.start(now + delay);
      shim.stop(now + delay + 0.5);
    });
  }

  playMoodChillSound() {
    if (!this.isInitialized || !this.ensureContextRunning()) return;
    if (this._sfxThrottled('moodChill')) return;
    const now = this.audioContext.currentTime;

    // Gentle descending tone — 600Hz down to 300Hz over 0.4s
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.4);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    gain.gain.setValueAtTime(0.08, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch(e){} };
    osc.start(now);
    osc.stop(now + 0.4);

    // Soft triangle wave layer for warmth
    const osc2 = this.audioContext.createOscillator();
    const gain2 = this.audioContext.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(500, now);
    osc2.frequency.exponentialRampToValueAtTime(250, now + 0.4);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.05, now + 0.05);
    gain2.gain.setValueAtTime(0.05, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.onended = () => { try { osc2.disconnect(); gain2.disconnect(); } catch(e){} };
    osc2.start(now);
    osc2.stop(now + 0.4);
  }

  startVoidStormAmbience() {
    if (!this.isInitialized || !this.ensureContextRunning()) return;
    if (this.voidStormOsc) return; // already running

    const now = this.audioContext.currentTime;

    this.voidStormGain = this.audioContext.createGain();
    this.voidStormGain.gain.setValueAtTime(0, now);
    this.voidStormGain.connect(this.sfxGain);

    this.voidStormOsc = this.audioContext.createOscillator();
    this.voidStormOsc.type = 'sine';
    this.voidStormOsc.frequency.setValueAtTime(50, now);
    this.voidStormOsc.connect(this.voidStormGain);
    this.voidStormOsc.start(now);
  }

  updateVoidStormProximity(proximity) {
    if (!this.voidStormOsc || !this.voidStormGain) return;
    const p = Math.max(0, Math.min(1, proximity));
    const now = this.audioContext.currentTime;
    // Map proximity to frequency: 40Hz (far) to 80Hz (close)
    this.voidStormOsc.frequency.setTargetAtTime(40 + p * 40, now, 0.05);
    // Map proximity to gain: 0 (far) to 0.15 (close)
    this.voidStormGain.gain.setTargetAtTime(p * 0.15, now, 0.05);
  }

  stopVoidStormAmbience() {
    if (!this.voidStormOsc) return;
    const osc = this.voidStormOsc;
    const gain = this.voidStormGain;
    this.voidStormOsc = null;
    this.voidStormGain = null;
    const now = this.audioContext.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.stop(now + 0.35);
      setTimeout(() => {
        try { osc.disconnect(); gain.disconnect(); } catch (e) {}
      }, 400);
    } catch (e) {
      try { osc.disconnect(); gain.disconnect(); } catch (e2) {}
    }
  }

  // ── VOLUME CONTROLS ──────────────────────────────────

  setMasterVolume(volume) {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  setMusicVolume(volume) {
    if (this.musicGain) this.musicGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  setSfxVolume(volume) {
    if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  dispose() {
    this._stopWatchdog();
    this.stopMusic();
    this.stopMenuMusic();
    this.stopVoidStormAmbience();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

export default AudioManager;
