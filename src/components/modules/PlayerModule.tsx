import { useEffect, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { Music, Settings2, Upload, Loader2, Play, Pause, Clock } from 'lucide-react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { useSoundfont } from '../../hooks/useSoundfont';
import { audioEngine } from '../../lib/AudioEngine';
import { ScoreManager } from './ScoreManager';
import { useAudioEngine } from '../../hooks/useAudioEngine';

export function PlayerModule() {
  const { isPlaying, togglePlayback } = useAudioEngine();
  const [player, setPlayer] = useState<Tone.Player | null>(null);
  const [pitchShift, setPitchShift] = useState<Tone.PitchShift | null>(null);
  const [synth, setSynth] = useState<Tone.PolySynth | null>(null);
  const [midiPart, setMidiPart] = useState<Tone.Part | null>(null);
  const [parsedMidi, setParsedMidi] = useState<Midi | null>(null);
  
  const [instrumentName, setInstrumentName] = useState('trombone');
  const { instrument, isLoading: isInstLoading, setVolume } = useSoundfont(instrumentName);
  const instrumentRef = useRef(instrument);

  const [volume, setVolumeState] = useState(0.8);
  const [pitch, setPitch] = useState(0); // Semitones
  const [speed, setSpeed] = useState(1); // multiplier tracking target BPM / baseBpm
  const [baseBpm, setBaseBpm] = useState(120);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(100);
  
  const [fileName, setFileName] = useState<string>("Nenhum arquivo");

  useEffect(() => {
    instrumentRef.current = instrument;
  }, [instrument]);

  useEffect(() => {
    setVolume(volume);
  }, [volume, setVolume]);

  useEffect(() => {
    const pShift = new Tone.PitchShift(0).toDestination();
    const plr = new Tone.Player().connect(pShift);
    const syn = new Tone.PolySynth(Tone.Synth).connect(pShift);
    
    plr.sync().start(0);

    setPitchShift(pShift);
    setPlayer(plr);
    setSynth(syn);

    // Track playback line in seconds (VLine)
    let animationFrame: number;
    const updateTime = () => {
      setCurrentTime(Tone.Transport.seconds);
      animationFrame = requestAnimationFrame(updateTime);
    };
    updateTime();

    return () => {
      cancelAnimationFrame(animationFrame);
      plr.dispose();
      pShift.dispose();
      syn.dispose();
      if (midiPart) midiPart.dispose();
    };
  }, []);

  useEffect(() => {
    if (parsedMidi && parsedMidi.header.tempos.length > 0) {
      setBaseBpm(parsedMidi.header.tempos[0].bpm);
    } else {
      setBaseBpm(120);
    }
  }, [parsedMidi]);

  useEffect(() => {
    if (pitchShift) pitchShift.pitch = pitch;
  }, [pitch, pitchShift]);

  useEffect(() => {
    if (player) {
      player.playbackRate = speed;
    }
    audioEngine.setSpeedMultiplier(speed);
  }, [speed, player]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !player || !synth) return;
    setFileName(file.name);
    
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
        setDuration(midi.duration);
        
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
        player.buffer = new Tone.ToneAudioBuffer();
      } else {
        setParsedMidi(null);
        const audioBuffer = await Tone.context.decodeAudioData(arrayBuffer);
        player.buffer = new Tone.ToneAudioBuffer(audioBuffer);
        setDuration(audioBuffer.duration);
      }
    } catch (err) {
      console.error("Error loading file:", err);
      alert("Erro ao carregar o arquivo. Certifique-se de que é um áudio válido ou um arquivo MIDI (.mid).");
    } finally {
      if (wasPlaying) Tone.Transport.start();
    }
  };

  const handleSeek = (val: number) => {
    Tone.Transport.seconds = val;
    setCurrentTime(val);
  };

  const currentBpm = Math.round(baseBpm * speed);

  return (
    <div className="space-y-6 w-full">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Player Flexível
          </CardTitle>
          <Button 
            onClick={togglePlayback} 
            size="sm" 
            variant={isPlaying ? "destructive" : "default"}
            className="w-28 font-bold flex items-center gap-2"
          >
            {isPlaying ? (
              <><Pause className="w-4 h-4 fill-current" /> Pausar</>
            ) : (
              <><Play className="w-4 h-4 fill-current" /> Tocar</>
            )}
          </Button>
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

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="flex items-center gap-2 text-primary text-xs uppercase tracking-wider font-bold">
                <Clock className="w-4 h-4" /> VLine
              </span>
              <span className="tabular-nums font-mono">
                {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')} 
                <span className="text-muted-foreground text-xs"> / {Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}</span>
              </span>
            </div>
            <Slider 
              min={0} 
              max={duration || 1} 
              step={0.1}
              value={currentTime} 
              onChange={(e) => handleSeek(Number(e.target.value))} 
              className="accent-primary"
            />
          </div>
          
          <div className="flex flex-col gap-1.5 pt-4">
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
            <span>Velocidade (BPM)</span>
            <span className="tabular-nums">{currentBpm} BPM</span>
          </div>
          <Slider 
            min={30} 
            max={240} 
            step={1} 
            value={currentBpm} 
            onChange={(e) => setSpeed(Number(e.target.value) / baseBpm)} 
          />
        </div>

        </CardContent>
      </Card>
      
      {parsedMidi && <ScoreManager midi={parsedMidi} pitchShift={pitch} />}
    </div>
  );
}
