import { useEffect, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { Music, Settings2, Upload, Loader2 } from 'lucide-react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { useSoundfont } from '../../hooks/useSoundfont';
import { audioEngine } from '../../lib/AudioEngine';
import { ScoreManager } from './ScoreManager';

// Using a local Player instance since the AudioEngine mainly manages global state.
// We can tie its start/stop to the global transport.

export function PlayerModule() {
  const [player, setPlayer] = useState<Tone.Player | null>(null);
  const [pitchShift, setPitchShift] = useState<Tone.PitchShift | null>(null);
  const [synth, setSynth] = useState<Tone.PolySynth | null>(null);
  const [midiPart, setMidiPart] = useState<Tone.Part | null>(null);
  const [parsedMidi, setParsedMidi] = useState<Midi | null>(null);
  
  const [instrumentName, setInstrumentName] = useState('trombone');
  const { instrument, isLoading: isInstLoading, setVolume } = useSoundfont(instrumentName);
  const instrumentRef = useRef(instrument);

  const [volume, setVolumeState] = useState(0.8);

  useEffect(() => {
    instrumentRef.current = instrument;
  }, [instrument]);

  useEffect(() => {
    setVolume(volume);
  }, [volume, setVolume]);
  const [pitch, setPitch] = useState(0); // Semitones
  const [speed, setSpeed] = useState(1); // 0.5x to 1.5x
  
  const [fileName, setFileName] = useState<string>("Nenhum arquivo");

  useEffect(() => {
    // Init audio nodes
    const pShift = new Tone.PitchShift(0).toDestination();
    const plr = new Tone.Player().connect(pShift);
    const syn = new Tone.PolySynth(Tone.Synth).connect(pShift);
    
    // Sync with transport so it plays when global play is hit
    plr.sync().start(0);

    setPitchShift(pShift);
    setPlayer(plr);
    setSynth(syn);

    return () => {
      plr.dispose();
      pShift.dispose();
      syn.dispose();
      if (midiPart) midiPart.dispose();
    };
  }, []); // Only run once on mount

  useEffect(() => {
    if (pitchShift) pitchShift.pitch = pitch;
  }, [pitch, pitchShift]);

  useEffect(() => {
    if (player) {
      player.playbackRate = speed;
    }
    audioEngine.setSpeedMultiplier(speed);
  }, [speed, player, midiPart]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !player || !synth) return;
    setFileName(file.name);
    
    // Pause transport safely if playing to prevent glitches while loading
    const wasPlaying = Tone.Transport.state === "started";
    if (wasPlaying) Tone.Transport.pause();

    try {
      if (midiPart) {
        midiPart.dispose();
        setMidiPart(null);
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const isMidi = file.name.toLowerCase().endsWith('.mid') || file.name.toLowerCase().endsWith('.midi');

      if (isMidi) {
        const midi = new Midi(arrayBuffer);
        setParsedMidi(midi);
        
        audioEngine.syncMetronomeToMidi(midi.header.ppq, midi.header.tempos);
        
        const events: {time: string, note: string, durationTicks: number, velocity: number}[] = [];
        midi.tracks.forEach(track => {
          track.notes.forEach(note => {
            events.push({
              time: note.ticks + 'i',
              note: note.name,
              durationTicks: note.durationTicks,
              velocity: note.velocity
            });
          });
        });
        
        const part = new Tone.Part((time, noteValue) => {
          const durationSecs = Tone.Ticks(noteValue.durationTicks).toSeconds();
          if (instrumentRef.current) {
            const transposedFreq = Tone.Frequency(noteValue.note).transpose(pitch).toNote();
            instrumentRef.current.play(transposedFreq, time, { 
              duration: durationSecs, 
              gain: noteValue.velocity 
            });
          } else {
            const transposedFreq = Tone.Frequency(noteValue.note).transpose(pitch).toNote();
            synth.triggerAttackRelease(transposedFreq, durationSecs, time, noteValue.velocity);
          }
        }, events);
        
        part.start(0);
        setMidiPart(part);
        
        // Clear audio buffer if any left over
        player.buffer = new Tone.ToneAudioBuffer();
      } else {
        // Audio
        setParsedMidi(null);
        const audioBuffer = await Tone.context.decodeAudioData(arrayBuffer);
        player.buffer = new Tone.ToneAudioBuffer(audioBuffer);
      }
    } catch (err) {
      console.error("Error loading file:", err);
      alert("Erro ao carregar o arquivo. Certifique-se de que é um áudio válido ou um arquivo MIDI (.mid).");
    } finally {
      if (wasPlaying) Tone.Transport.start();
    }
  };

  return (
    <div className="space-y-6 w-full">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Player Flexível
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" className="w-full text-left justify-start relative overflow-hidden">
               <Upload className="w-4 h-4 mr-2" />
               <span className="truncate">{fileName}</span>
               <input 
                 type="file" 
                 accept="audio/*,.mid,.midi"
                 onChange={handleFileUpload}
                 className="absolute inset-0 opacity-0 cursor-pointer"
               />
            </Button>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Instrumento MIDI (SoundFont)</span>
            <div className="flex items-center gap-2">
              <select 
                value={instrumentName}
                onChange={(e) => setInstrumentName(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="trombone" className="bg-background">Trombone</option>
                <option value="acoustic_grand_piano" className="bg-background">Piano</option>
                <option value="alto_sax" className="bg-background">Saxofone Alto</option>
                <option value="flute" className="bg-background">Flauta</option>
                <option value="synth_drum" className="bg-background">Bateria Synth</option>
              </select>
              {isInstLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
            </div>
            {isInstLoading && <p className="text-xs text-muted-foreground">Carregando instrumento...</p>}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Volume (Instrumento MIDI)</span>
              <span className="tabular-nums">{Math.round(volume * 100)}%</span>
            </div>
            <Slider 
              min={0} 
              max={1} 
              step={0.01} 
              value={volume} 
              onChange={(e) => setVolumeState(Number(e.target.value))} 
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm font-medium">
            <span className="flex items-center gap-2"><Settings2 className="w-4 h-4"/> Afinação (Pitch)</span>
            <span className="tabular-nums">{pitch > 0 ? `+${pitch}` : pitch} semi</span>
          </div>
          <Slider 
            min={-12} 
            max={12} 
            step={1} 
            value={pitch} 
            onChange={(e) => setPitch(Number(e.target.value))} 
            className="accent-primary"
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm font-medium">
            <span>Velocidade (Rate)</span>
            <span className="tabular-nums">{speed.toFixed(2)}x</span>
          </div>
          <Slider 
            min={0.5} 
            max={1.5} 
            step={0.05} 
            value={speed} 
            onChange={(e) => setSpeed(Number(e.target.value))} 
          />
        </div>

        </CardContent>
      </Card>
      
      {parsedMidi && <ScoreManager midi={parsedMidi} pitchShift={pitch} />}
    </div>
  );
}
