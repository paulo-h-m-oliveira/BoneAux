import * as Tone from 'tone';

// Event emitter for state changes so React can sync
type Listener = () => void;

class AudioEngine {
  private isInitialized = false;
  private isPlaying = false;
  private listeners: Set<Listener> = new Set();
  
  // Metronome variables
  private clickSynth: Tone.Synth;
  private metronomeLoop: Tone.Sequence | null = null;
  private subdivisions = 1; // 1 = quarter, 2 = eighths, 3 = triplets, 4 = sixteenths
  private isMetronomeMuted = false;
  
  // MIDI Tempo Sync
  private baseTempos: { ticks: number, bpm: number }[] = [];
  private speedMultiplier = 1;
  private tempoEventIds: number[] = [];
  
  // Visualizer node
  public waveformViewer: Tone.Waveform;
  
  constructor() {
    this.clickSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.01 }
    }).toDestination();
    
    // For monitoring the master output
    this.waveformViewer = new Tone.Waveform(512);
    Tone.getDestination().connect(this.waveformViewer);
  }

  // Ensure AudioContext is started (requires user gesture)
  public async init() {
    if (this.isInitialized) return;
    await Tone.start();
    this.isInitialized = true;
    
    // Default BPM
    Tone.getTransport().bpm.value = 120;
    
    this.setupMetronome();
    this.notify();
  }

  public getPlaybackState() {
    return this.isPlaying;
  }

  public togglePlayback() {
    if (!this.isInitialized) return;
    
    if (this.isPlaying) {
      Tone.getTransport().pause();
      this.isPlaying = false;
    } else {
      Tone.getTransport().start();
      this.isPlaying = true;
    }
    this.notify();
  }

  public getBpm() {
    return Math.round(Tone.getTransport().bpm.value);
  }

  public getIsMidiSynced() {
    return this.baseTempos.length > 0;
  }

  public setBpm(bpm: number) {
    this.baseTempos = []; // Break MIDI sync
    Tone.getTransport().bpm.cancelScheduledValues(Tone.now());
    Tone.getTransport().bpm.value = bpm;
    this.notify();
  }

  public getSpeedMultiplier() {
    return this.speedMultiplier;
  }

  public setSpeedMultiplier(mult: number) {
    this.speedMultiplier = mult;
    this.applyTempos();
    this.notify();
  }

  public syncMetronomeToMidi(ppq: number, tempos: { ticks: number, bpm: number }[]) {
    Tone.getTransport().PPQ = ppq;
    this.baseTempos = tempos;
    this.applyTempos();
    this.setupMetronome();
    this.notify();
  }

  private applyTempos() {
    this.tempoEventIds.forEach(id => Tone.getTransport().clear(id));
    this.tempoEventIds = [];
    Tone.getTransport().bpm.cancelScheduledValues(0);
    
    if (this.baseTempos.length === 0) return;

    // Set initial BPM
    const initialBpm = this.baseTempos[0].bpm * this.speedMultiplier;
    Tone.getTransport().bpm.value = initialBpm;

    // Schedule subsequent tempo changes onto the Transport timeline
    for (let i = 1; i < this.baseTempos.length; i++) {
        const t = this.baseTempos[i];
        if (t.ticks > 0) {
            const id = Tone.getTransport().schedule(() => {
                Tone.getTransport().bpm.value = t.bpm * this.speedMultiplier;
            }, t.ticks + "i");
            this.tempoEventIds.push(id);
        }
    }
  }

  public getSubdivisions() {
    return this.subdivisions;
  }

  public setSubdivisions(sub: number) {
    this.subdivisions = Math.max(1, Math.min(4, sub));
    this.setupMetronome();
    this.notify();
  }

  public getMetronomeMuted() {
    return this.isMetronomeMuted;
  }

  public toggleMetronomeMute() {
    this.isMetronomeMuted = !this.isMetronomeMuted;
    this.notify();
  }

  private setupMetronome() {
    if (this.metronomeLoop) {
      this.metronomeLoop.dispose();
    }
    
    // E.g. subdivisions=1 => ["4n"], subdivisions=2 => ["8n", "8n"]
    const beats = [];
    for (let i = 0; i < this.subdivisions; i++) {
        beats.push(i === 0 ? "accent" : "tick");
    }
    
    const noteDuration = `${this.subdivisions * 4}n`;
    
    this.metronomeLoop = new Tone.Sequence((time, beat) => {
      if (this.isMetronomeMuted) return;
      
      if (beat === "accent") {
        this.clickSynth.triggerAttackRelease("C5", "32n", time, 1);
        // Dispatch custom event for visual flash
        window.dispatchEvent(new CustomEvent('metronome-tick', { detail: { isAccent: true } }));
      } else {
        this.clickSynth.triggerAttackRelease("G4", "32n", time, 0.5);
        window.dispatchEvent(new CustomEvent('metronome-tick', { detail: { isAccent: false } }));
      }
    }, beats, noteDuration).start(0);
  }

  // Subscription for React
  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const audioEngine = new AudioEngine();
