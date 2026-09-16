import spiderVerseMusicUrl from '../Spider-Man Spider-Verse Theme  EPIC MUSIC SUITE (No Way Home Tribute) (mp3cut.net).mp3?url';

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isPlayingMusic = false;
    this.musicTimeout = null;
    this.currentNoteIndex = 0;
    this.bgAudio = null;
    this._initAudio();
  }

  _initAudio() {
    if (typeof window === 'undefined') return;
    try {
      this.bgAudio = new Audio(spiderVerseMusicUrl);
      this.bgAudio.loop = true;
      this.bgAudio.volume = 0.75;
    } catch (e) {
      console.warn('Could not initialize background audio:', e);
    }
  }

  _initContext() {
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

  // Happy Birthday melody notes: [frequency, duration in beats] (fallback)
  getMelody() {
    const G4 = 392.00;
    const A4 = 440.00;
    const B4 = 493.88;
    const C5 = 523.25;
    const D5 = 587.33;
    const E5 = 659.25;
    const F5 = 698.46;
    const G5 = 783.99;

    return [
      [G4, 0.75], [G4, 0.25], [A4, 1], [G4, 1], [C5, 1], [B4, 2],
      [G4, 0.75], [G4, 0.25], [A4, 1], [G4, 1], [D5, 1], [C5, 2],
      [G4, 0.75], [G4, 0.25], [G5, 1], [E5, 1], [C5, 1], [B4, 1], [A4, 1.5],
      [F5, 0.75], [F5, 0.25], [E5, 1], [C5, 1], [D5, 1], [C5, 2.5]
    ];
  }

  playMusic() {
    this.isPlayingMusic = true;
    if (!this.bgAudio) {
      this._initAudio();
    }
    if (this.bgAudio) {
      this.bgAudio.play().catch((err) => {
        console.warn('Playback error (waiting for user gesture):', err);
        // Fallback to synth if audio file playback is blocked
        this._initContext();
        if (this.ctx) {
          this.currentNoteIndex = 0;
          this._playNextMusicNote();
        }
      });
    } else {
      this._initContext();
      if (this.ctx) {
        this.currentNoteIndex = 0;
        this._playNextMusicNote();
      }
    }
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.bgAudio) {
      this.bgAudio.pause();
    }
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
  }

  _playNextMusicNote() {
    if (!this.isPlayingMusic || !this.ctx) return;

    const melody = this.getMelody();
    if (this.currentNoteIndex >= melody.length) {
      // Loop with a brief pause
      this.currentNoteIndex = 0;
      this.musicTimeout = setTimeout(() => this._playNextMusicNote(), 1500);
      return;
    }

    const [freq, beats] = melody[this.currentNoteIndex];
    const tempo = 380; // ms per beat
    const duration = (beats * tempo) / 1000;

    this._playChime(freq, duration);

    this.currentNoteIndex++;
    this.musicTimeout = setTimeout(() => {
      this._playNextMusicNote();
    }, beats * tempo);
  }

  _playChime(freq, duration) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Music box bell / chime tone using sine + harmonic
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now); // 1 octave overtone

    const gainNode1 = this.ctx.createGain();
    const gainNode2 = this.ctx.createGain();

    gainNode1.gain.setValueAtTime(0.12, now);
    gainNode2.gain.setValueAtTime(0.04, now);

    osc1.connect(gainNode1);
    osc2.connect(gainNode2);
    gainNode1.connect(gain);
    gainNode2.connect(gain);
    gain.connect(this.ctx.destination);

    // Envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + Math.max(duration * 1.2, 0.4));

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + Math.max(duration * 1.2, 0.4));
    osc2.stop(now + Math.max(duration * 1.2, 0.4));
  }

  // Sound effect: Like / click pop
  playPop() {
    this._initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Sound effect: Candle blow out / whoosh
  playBlow() {
    this._initContext();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  // Sound effect: Celebration fanfare / sparkle
  playSparkle() {
    this._initContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      }, idx * 70);
    });
  }
  // Sound effect: Knife cutting through cake
  playCut() {
    this._initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Short filtered noise sweep (cutting sound)
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.25);
    filter.Q.setValueAtTime(2, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  // Sound effect: Satisfying slice completion thud
  playSlice() {
    this._initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Low thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // Satisfying high ting
    setTimeout(() => {
      if (!this.ctx) return;
      const now2 = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(800, now2);

      gain2.gain.setValueAtTime(0.1, now2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.3);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now2);
      osc2.stop(now2 + 0.3);
    }, 100);
  }
}

export const sound = new SoundManager();

