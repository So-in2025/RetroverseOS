export class AudioEngine {
  private static ctx: AudioContext | null = null;
  private static masterGain: GainNode | null = null;
  private static sfxGain: GainNode | null = null;
  private static delayNode: DelayNode | null = null;
  private static filterNode: BiquadFilterNode | null = null;
  
  private static isPlayingBGM = false;
  private static currentTrack = 0;
  
  // Sequencer state
  private static nextNoteTime = 0;
  private static currentStep = 0;
  private static currentChordIndex = 0;
  private static timerID: number | null = null;

  private static readonly THEMES = [
    {
      name: 'Neon Grid',
      tempo: 120,
      chords: [
        [57, 60, 64, 69], // Am
        [53, 57, 60, 65], // F
        [48, 52, 55, 60], // C
        [55, 59, 62, 67], // G
      ],
      arpPattern: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3],
      bassRhythm: [1, 0, 1, 0, 1, 0, 1, 0]
    },
    {
      name: 'Dark Sector',
      tempo: 105,
      chords: [
        [50, 53, 57, 62], // Dm
        [46, 50, 53, 58], // Bb
        [43, 46, 50, 55], // Gm
        [45, 49, 52, 57], // A
      ],
      arpPattern: [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3],
      bassRhythm: [1, 1, 0, 1, 1, 0, 1, 0]
    },
    {
      name: 'Starlight',
      tempo: 95,
      chords: [
        [48, 52, 55, 59], // Cmaj7
        [45, 48, 52, 55], // Am7
        [41, 45, 48, 52], // Fmaj7
        [43, 47, 50, 53], // G6
      ],
      arpPattern: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3],
      bassRhythm: [1, 0, 0, 0, 1, 0, 0, 0]
    }
  ];

  public static getContext() {
    return this.ctx;
  }

  public static getIsPlayingBGM() {
    return this.isPlayingBGM;
  }

  private static getFreq(midiNote: number) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  private static init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // SFX Routing (Direct, punchy)
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.15;
      this.sfxGain.connect(this.ctx.destination);

      // BGM Routing (Warm, atmospheric)
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.12; // Lower volume for background

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 1800; // Warm analog feel

      this.delayNode = this.ctx.createDelay();
      this.delayNode.delayTime.value = 0.3; // Will be updated per tempo
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.35;
      this.delayNode.connect(feedback);
      feedback.connect(this.delayNode);

      // Connect BGM chain
      this.filterNode.connect(this.masterGain);
      this.delayNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public static playMoveSound() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  public static playSelectSound() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  public static playSuccessSound() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start();
    osc.stop(now + 0.6);
  }

  public static toggleBGM() {
    if (this.isPlayingBGM) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.isPlayingBGM;
  }

  public static nextTrack() {
    this.currentTrack = (this.currentTrack + 1) % this.THEMES.length;
    if (this.isPlayingBGM) {
      this.stopBGM();
      this.startBGM();
    }
    return this.THEMES[this.currentTrack].name;
  }

  public static startBGM() {
    if (this.isPlayingBGM) return;
    this.init();
    if (!this.ctx) return;
    
    // Ensure any previous timer is cleared
    if (this.timerID !== null) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }

    this.isPlayingBGM = true;
    this.currentStep = 0;
    this.currentChordIndex = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    
    // Reset master gain with a slight ramp to avoid clicks
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(0.12, this.ctx.currentTime, 0.1);
    }
    
    // Update delay time based on tempo (dotted 8th note)
    if (this.delayNode) {
      const beatDuration = 60 / this.THEMES[this.currentTrack].tempo;
      this.delayNode.delayTime.setValueAtTime(beatDuration * 0.75, this.ctx.currentTime);
    }

    this.schedule();
  }

  public static stopBGM() {
    if (!this.isPlayingBGM) return;
    this.isPlayingBGM = false;
    
    if (this.timerID !== null) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
    
    // Ramp down master gain to zero to stop any lingering notes
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  public static stopAll() {
    this.stopBGM();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.suspend().catch(() => {});
    }
  }

  private static schedule() {
    if (!this.isPlayingBGM || !this.ctx) return;

    // Schedule notes up to 0.1 seconds in the future
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.playStep(this.currentStep, this.nextNoteTime);
      this.advanceNote();
    }

    this.timerID = window.setTimeout(() => this.schedule(), 25.0);
  }

  private static advanceNote() {
    const secondsPerBeat = 60.0 / this.THEMES[this.currentTrack].tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th note
    
    this.currentStep++;
    if (this.currentStep >= 16) {
      this.currentStep = 0;
      this.currentChordIndex = (this.currentChordIndex + 1) % 4;
    }
  }

  private static playStep(step: number, time: number) {
    const theme = this.THEMES[this.currentTrack];
    const chord = theme.chords[this.currentChordIndex];

    // 1. Arp (16th notes)
    const arpNoteIndex = theme.arpPattern[step];
    const arpMidi = chord[arpNoteIndex] + 12; // +1 octave
    this.playSynth(arpMidi, time, 0.15, 'square', 0.08, true, 0.01, 0.1);

    // 2. Bass (8th notes)
    if (step % 2 === 0) {
      const bassStep = step / 2;
      if (theme.bassRhythm[bassStep]) {
        const bassMidi = chord[0] - 12; // Root note, -1 octave
        this.playSynth(bassMidi, time, 0.25, 'triangle', 0.2, false, 0.02, 0.2);
      }
    }

    // 3. Pad/Lead (Every 16 steps = 1 bar)
    if (step === 0) {
      const padMidi = chord[0];
      this.playSynth(padMidi, time, 2.0, 'sine', 0.15, true, 0.5, 1.0);
    }
  }

  private static playSynth(
    midiNote: number, 
    time: number, 
    duration: number, 
    type: OscillatorType, 
    vol: number, 
    useDelay: boolean,
    attack: number,
    release: number
  ) {
    if (!this.ctx || !this.filterNode || !this.delayNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = this.getFreq(midiNote);

    // ADSR Envelope
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + attack);
    gain.gain.setTargetAtTime(0, time + duration - release, release / 3);

    osc.connect(gain);
    
    if (useDelay) {
      gain.connect(this.delayNode);
    }
    gain.connect(this.filterNode);

    osc.start(time);
    osc.stop(time + duration);
  }
}
