import { useEffect, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { Music, Settings2, Upload, Loader2, Play, Pause } from 'lucide-react';
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
    <div className="space-y-6 w-full animate-in fade-in slide-in-from-left-4 duration-500">
      <Card className="w-full overflow-hidden border-primary/10 shadow-2xl">
        <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-orange-500 to-yellow-500" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-6">
          <CardTitle className="text-2xl font-black flex items-center gap-3 tracking-tighter uppercase">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Music className="w-6 h-6 text-orange-500" />
            </div>
            Universal Player
          </CardTitle>
          <Button 
            onClick={togglePlayback} 
            size="lg" 
            variant={isPlaying ? "destructive" : "default"}
            className="w-32 font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all h-12"
          >
            {isPlaying ? (
              <><Pause className="w-5 h-5 fill-current" /> PAUSE</>
            ) : (
              <><Play className="w-5 h-5 fill-current" /> PLAY</>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-8 pt-2">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-400 ml-1">Deck Loading</span>
              <Button variant="outline" className="w-full text-left justify-start relative overflow-hidden h-12 bg-white/5 border-white/5 hover:bg-white/10 group transition-all rounded-xl">
                 <Upload className="w-5 h-5 mr-3 text-orange-500 group-hover:scale-110 transition-transform" />
                 <span className="truncate font-bold text-sm tracking-tight">{fileName}</span>
                 <input 
                   type="file" 
                   accept="audio/*,.mid,.midi"
                   onChange={handleFileUpload}
                   className="absolute inset-0 opacity-0 cursor-pointer"
                 />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-400 ml-1">V-Line Tracking</span>
                  <span className="text-xs font-bold text-white/50 uppercase tracking-tight">Timeline status</span>
                </div>
                <div className="text-right">
                  <span className="tabular-nums font-black text-3xl tracking-tighter text-white">
                    {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')} 
                  </span>
                  <span className="text-orange-500/50 text-sm font-black tracking-tighter ml-1"> / {Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}</span>
                </div>
              </div>
              <div className="relative pt-2">
                <Slider 
                  min={0} 
                  max={duration || 1} 
                  step={0.1}
                  value={currentTime} 
                  onChange={(e) => handleSeek(Number(e.target.value))} 
                  className="relative z-10"
                />
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-400 ml-1">Engine Output</span>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <select 
                    value={instrumentName}
                    onChange={(e) => setInstrumentName(e.target.value)}
                    className="flex h-12 w-full font-bold rounded-xl border border-white/5 bg-white/5 px-4 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/30 appearance-none text-white tracking-tight"
                  >
                    <option value="trombone" className="bg-[#111]">Trombone</option>
                    <option value="acoustic_grand_piano" className="bg-[#111]">Piano</option>
                    <option value="alto_sax" className="bg-[#111]">Alto Sax</option>
                    <option value="flute" className="bg-[#111]">Flute</option>
                    <option value="synth_drum" className="bg-[#111]">Synth Drum</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <Settings2 className="w-4 h-4" />
                  </div>
                </div>
                {isInstLoading && <Loader2 className="w-6 h-6 animate-spin text-orange-500" />}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-400">Master Volume</span>
                <span className="tabular-nums font-black text-lg tracking-tighter text-white">{Math.round(volume * 100)}%</span>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/5">
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-400">Tuning (Pitch)</span>
              <span className="tabular-nums font-black text-lg tracking-tighter text-white">{pitch > 0 ? `+${pitch}` : pitch}<span className="text-[10px] ml-1 uppercase opacity-40">semi</span></span>
            </div>
            <Slider 
              min={-12} 
              max={12} 
              step={1} 
              value={pitch} 
              onChange={(e) => setPitch(Number(e.target.value))} 
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-400">Engine BPM</span>
              <span className="tabular-nums font-black text-3xl tracking-tighter text-gradient">{currentBpm}<span className="text-xs ml-1 font-black">BPM</span></span>
            </div>
            <Slider 
              min={30} 
              max={240} 
              step={1} 
              value={currentBpm} 
              onChange={(e) => setSpeed(Number(e.target.value) / baseBpm)} 
            />
          </div>
        </div>

        </CardContent>
      </Card>
      
      {parsedMidi && (
        <div className="animate-in zoom-in-95 fade-in duration-500">
          <ScoreManager midi={parsedMidi} pitchShift={pitch} />
        </div>
      )}
    </div>
  );
}
