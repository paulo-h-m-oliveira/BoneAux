import { useEffect, useState, useRef, useCallback } from 'react';
import { Music, Upload, Save, Volume2, VolumeX, Eye, Layers, Settings, Search, X, Play, Pause, Square } from 'lucide-react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { audioEngine } from '../../lib/AudioEngine';
import { ScoreManager } from './ScoreManager';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useMultiSoundfont } from '../../hooks/useMultiSoundfont';
import { getInstrumentName, MIDI_INSTRUMENTS } from '../../lib/midiMapping';
import { cn } from '../../lib/utils';

interface TrackState {
  id: number;
  name: string;
  instrumentName: string;
  notesCount: number;
  isMuted: boolean;
  volume: number;
  program: number;
}

export function PlayerModule() {
  const { isPlaying, togglePlayback, stopPlayback } = useAudioEngine();
  const [player, setPlayer] = useState<Tone.Player | null>(null);
  const [pitchShift, setPitchShift] = useState<Tone.PitchShift | null>(null);
  const [synth, setSynth] = useState<Tone.PolySynth | null>(null);
  const [midiPart, setMidiPart] = useState<Tone.Part | null>(null);
  const [parsedMidi, setParsedMidi] = useState<Midi | null>(null);
  
  const { instruments, loadInstrument, setInstrumentVolume, toggleMute, disposeAll, stopAllNotes } = useMultiSoundfont();
  const [tracks, setTracks] = useState<TrackState[]>([]);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);

  const [pitch] = useState(0); // Semitones
  const pitchRef = useRef(pitch);
  const [speed] = useState(1); // multiplier tracking target BPM / baseBpm

  const [isInstrumentBrowserOpen, setIsInstrumentBrowserOpen] = useState(false);
  const [browserTargetTrack, setBrowserTargetTrack] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const activeNodesRef = useRef<any[]>([]);

  useEffect(() => {
    pitchRef.current = pitch;
    if (pitchShift) pitchShift.pitch = pitch;
  }, [pitch, pitchShift]);

  const [baseBpm, setBaseBpm] = useState(120);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(100);
  
  const [fileName, setFileName] = useState<string>("Nenhum arquivo");

  useEffect(() => {
    const pShift = new Tone.PitchShift(0).toDestination();
    const plr = new Tone.Player().connect(pShift);
    const syn = new Tone.PolySynth(Tone.Synth).toDestination();

    setPitchShift(pShift);
    setPlayer(plr);
    setSynth(syn);

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
      disposeAll();
      if (midiPartRef.current) midiPartRef.current.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const midiPartRef = useRef<Tone.Part | null>(null);

  useEffect(() => {
    if (parsedMidi && parsedMidi.header.tempos.length > 0) {
      setBaseBpm(parsedMidi.header.tempos[0].bpm);
    } else {
      setBaseBpm(120);
    }
  }, [parsedMidi]);

  useEffect(() => {
    if (player) {
      player.playbackRate = speed;
    }
    audioEngine.setSpeedMultiplier(speed);
  }, [speed, player]);

  // Stop all ringing notes when playback is paused or stopped
  useEffect(() => {
    if (!isPlaying) {
      synth?.releaseAll();
      stopAllNotes();
      activeNodesRef.current.forEach(node => {
        try { node.stop(); } catch(e){}
      });
      activeNodesRef.current = [];
      if (player && player.state === "started") {
        try { player.stop(); } catch(e){}
      }
    } else {
      if (player && player.buffer && player.buffer.loaded && !parsedMidi) {
        try { player.start(0, Tone.Transport.seconds); } catch(e){}
      }
    }
  }, [isPlaying, synth, stopAllNotes, player, parsedMidi]);

  const rebuildMidiPart = useCallback((currentParsedMidi: Midi, currentTracks: TrackState[]) => {
    if (midiPartRef.current) {
        midiPartRef.current.dispose();
        midiPartRef.current = null;
    }
    activeNodesRef.current.forEach(node => {
        try { node.stop(); } catch(e){}
    });
    activeNodesRef.current = [];
    
    const events: {time: string, note: string, durationTicks: number, velocity: number, instrument: string}[] = [];
    currentParsedMidi.tracks.forEach((track, i) => {
        // Find our track state to get the (potentially changed) instrument
        const trackState = currentTracks.find(t => t.id === i);
        const instName = trackState ? trackState.instrumentName : getInstrumentName(track.instrument.number);
        
        track.notes.forEach(note => {
          events.push({
            time: note.ticks + 'i',
            note: note.name,
            durationTicks: note.durationTicks,
            velocity: note.velocity,
            instrument: instName
          });
        });
    });
    
    const part = new Tone.Part((time, noteValue) => {
        const durationSecs = Tone.Ticks(noteValue.durationTicks).toSeconds();
        const inst = instruments[noteValue.instrument];
        
        if (inst && inst.player) {
          const transposedFreq = Tone.Frequency(noteValue.note).transpose(pitchRef.current).toNote();
          const node = inst.player.play(transposedFreq, time, { 
            duration: durationSecs, 
            gain: noteValue.velocity 
          });
          if (node) activeNodesRef.current.push(node);
        } else {
          const transposedFreq = Tone.Frequency(noteValue.note).transpose(pitchRef.current).toNote();
          synth?.triggerAttackRelease(transposedFreq, durationSecs, time, noteValue.velocity);
        }
    }, events);
    
    part.start(0);
    midiPartRef.current = part;
    setMidiPart(part);
  }, [instruments, pitchRef, synth]);

  // Rebuild part whenever instruments are loaded or changed
  useEffect(() => {
    if (parsedMidi && tracks.length > 0) {
        rebuildMidiPart(parsedMidi, tracks);
    }
  }, [instruments, tracks, parsedMidi]);

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
      disposeAll();
      if (player) player.buffer = new Tone.ToneAudioBuffer();
      
      const arrayBuffer = await file.arrayBuffer();
      const isMidi = file.name.toLowerCase().endsWith('.mid') || file.name.toLowerCase().endsWith('.midi');

      if (isMidi) {
        const midi = new Midi(arrayBuffer);
        setParsedMidi(midi);
        setDuration(midi.duration);
        
        audioEngine.syncMetronomeToMidi(midi.header.ppq, midi.header.tempos);
        
        const newTracks: TrackState[] = [];
        const uniqueInstruments = new Set<string>();

        midi.tracks.forEach((track, i) => {
          if (track.notes.length > 0) {
            const instName = getInstrumentName(track.instrument.number);
            uniqueInstruments.add(instName);
            newTracks.push({
              id: i,
              name: track.name || `Trilha ${i + 1}`,
              instrumentName: instName,
              notesCount: track.notes.length,
              isMuted: false,
              volume: 1,
              program: track.instrument.number
            });
          }
        });

        setTracks(newTracks);
        setSelectedTrackIndex(newTracks[0]?.id || 0);

        for (const inst of Array.from(uniqueInstruments)) {
          await loadInstrument(inst);
        }
        player.buffer = new Tone.ToneAudioBuffer();
      } else {
        alert("Este sistema suporta apenas arquivos MIDI (.mid, .midi).");
      }
    } catch (err) {
      console.error("Error loading file:", err);
      alert("Erro ao carregar o arquivo.");
    } finally {
      if (wasPlaying) Tone.Transport.start();
    }
  };

  const handleSeek = (val: number) => {
    Tone.Transport.seconds = val;
    setCurrentTime(val);
    synth?.releaseAll();
    stopAllNotes();
    activeNodesRef.current.forEach(node => {
      try { node.stop(); } catch(e){}
    });
    activeNodesRef.current = [];
    
    if (isPlaying && !parsedMidi) {
        if (player && player.buffer && player.buffer.loaded) {
            try { player.stop(); player.start(0, val); } catch(e){}
        }
    }
  };

  const changeTrackInstrument = async (trackId: number, newInstName: string) => {
    await loadInstrument(newInstName);
    setTracks((prev: TrackState[]) => prev.map((t: TrackState) => t.id === trackId ? { ...t, instrumentName: newInstName } : t));
    setIsInstrumentBrowserOpen(false);
  };

  const exportModifiedMidi = () => {
    if (!parsedMidi) return;
    try {
        const modifiedMidi = new Midi(parsedMidi.toArray());
        modifiedMidi.tracks.forEach(track => {
            track.notes.forEach(note => {
                note.midi += pitch;
            });
        });
        const midiData = modifiedMidi.toArray();
        const blob = new Blob([midiData as unknown as BlobPart], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `boneaux_modificado_${fileName.split('.')[0]}.mid`;
        link.click();
        URL.revokeObjectURL(url);
    } catch {
        alert("Erro ao exportar MIDI.");
    }
  };

  const currentBpm = Math.round(baseBpm * speed);

  const filteredInstruments = Object.entries(MIDI_INSTRUMENTS).filter(([, name]) => 
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-[#0a0a0a] rounded-[2.5rem] overflow-hidden border border-white/5 shadow-3xl animate-in fade-in zoom-in-95 duration-700">
      
      {/* DAW Header / Toolbar */}
      <div className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-3xl flex items-center justify-between px-8">
        <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-[0.3em] text-orange-500 uppercase">Project</span>
              <span className="text-sm font-bold text-white truncate max-w-[200px]">{fileName}</span>
            </div>
            
            <div className="h-10 w-px bg-white/10" />
            
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-white/30 uppercase">Tempo</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-white tabular-nums">{currentBpm}</span>
                        <span className="text-[10px] font-bold text-orange-500">BPM</span>
                    </div>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-white/30 uppercase">Pitch</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-white tabular-nums">{pitch > 0 ? `+${pitch}` : pitch}</span>
                        <span className="text-[10px] font-bold text-orange-500">SEMI</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 flex justify-center px-12">
            <div className="w-full max-w-3xl flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { stopPlayback(); handleSeek(0); }} className="rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-all">
                        <Square className="w-4 h-4 fill-current" />
                    </Button>
                    <Button variant={isPlaying ? "destructive" : "default"} size="icon" onClick={togglePlayback} className={cn("rounded-full w-12 h-12 transition-all", isPlaying ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20" : "bg-white/10 hover:bg-white/20 text-white border border-white/5")}>
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                    </Button>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] font-black text-white/40 uppercase tracking-widest px-1">
                        <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}</span>
                        <span>{Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}</span>
                    </div>
                    <Slider 
                      min={0} 
                      max={duration || 1} 
                      step={0.1}
                      value={currentTime} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSeek(Number(e.target.value))} 
                    />
                </div>
            </div>
        </div>

        <div className="flex items-center gap-4">
            <Button variant="outline" className="bg-white/5 border-white/5 hover:bg-white/10 h-11 rounded-xl relative overflow-hidden group">
                <Upload className="w-4 h-4 mr-2 text-orange-500" />
                <span className="text-[11px] font-black uppercase tracking-wider">Import MIDI</span>
                <input type="file" accept=".mid,.midi" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            </Button>
            
            <div className="flex gap-2">
                {parsedMidi && (
                    <Button onClick={exportModifiedMidi} variant="outline" size="icon" className="h-11 w-11 rounded-xl border-orange-500/20 hover:bg-orange-500/10">
                        <Save className="w-4 h-4 text-orange-500" />
                    </Button>
                )}
            </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Professional Mixer */}
        <div className="w-80 border-r border-white/5 bg-black/20 flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-black uppercase tracking-widest text-white">Console Mixer</span>
                </div>
                <span className="text-[10px] font-bold text-white/30">{tracks.length} Trilhas</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {tracks.map((track: TrackState) => {
                    const inst = instruments[track.instrumentName];
                    const isSelected = selectedTrackIndex === track.id;
                    return (
                        <div key={track.id} className={cn(
                            "group p-4 rounded-2xl border transition-all duration-300",
                            isSelected ? "bg-orange-500/10 border-orange-500/30 ring-1 ring-orange-500/20" : "bg-white/2 border-white/5 hover:bg-white/5"
                        )}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className={cn("text-[11px] font-black uppercase truncate tracking-tight mb-0.5", isSelected ? "text-white" : "text-white/60")}>
                                        {track.name}
                                    </span>
                                    <button 
                                        onClick={() => { setBrowserTargetTrack(track.id); setIsInstrumentBrowserOpen(true); }}
                                        className="text-[9px] font-bold text-orange-500/70 hover:text-orange-500 uppercase flex items-center gap-1 transition-colors"
                                    >
                                        <Settings className="w-3 h-3" /> {track.instrumentName.replace(/_/g, ' ')}
                                    </button>
                                </div>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => toggleMute(track.instrumentName)}
                                        className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                            inst?.isMuted ? "bg-red-500 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                                        )}
                                    >
                                        <VolumeX className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={() => setSelectedTrackIndex(track.id)}
                                        className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                            isSelected ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-white/5 text-white/40 hover:bg-white/10"
                                        )}
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <Volume2 className="w-3 h-3 text-white/20" />
                                <Slider 
                                    min={0} 
                                    max={1.5} 
                                    step={0.01} 
                                    value={inst?.volume || 1} 
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInstrumentVolume(track.instrumentName, Number(e.target.value))}
                                    className="flex-1"
                                />
                                <span className="text-[10px] font-black text-white/30 w-8 text-right tabular-nums">
                                    {Math.round((inst?.volume || 1) * 100)}
                                </span>
                            </div>
                        </div>
                    );
                })}
                
                {tracks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center px-6">
                        <Music className="w-12 h-12 mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Nenhuma trilha carregada</span>
                    </div>
                )}
            </div>
            
            {/* Master Fader Area */}
            <div className="p-6 bg-black/40 border-t border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Main Output</span>
                    <span className="text-xs font-black text-white">0.0 dB</span>
                </div>
                <div className="h-32 bg-white/5 rounded-xl border border-white/5 p-4 flex gap-4">
                    <div className="flex-1 bg-black/40 rounded-lg overflow-hidden relative">
                        <div className="absolute bottom-0 left-0 w-full bg-linear-to-t from-orange-500 to-yellow-400 transition-all duration-75" style={{ height: isPlaying ? '40%' : '0%' }} />
                    </div>
                    <div className="flex-1 bg-black/40 rounded-lg overflow-hidden relative">
                        <div className="absolute bottom-0 left-0 w-full bg-linear-to-t from-orange-500 to-yellow-400 transition-all duration-75" style={{ height: isPlaying ? '35%' : '0%' }} />
                    </div>
                </div>
            </div>
        </div>

        {/* Center/Right: Score Workspace */}
        <div className="flex-1 flex flex-col bg-white/1">
            <div className="flex-1 overflow-auto custom-scrollbar p-12">
                {parsedMidi ? (
                    <ScoreManager midi={parsedMidi} pitchShift={pitch} trackIndex={selectedTrackIndex} />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                        <div className="p-8 bg-orange-500/5 rounded-full border border-orange-500/10 animate-pulse">
                            <Music className="w-16 h-16 text-orange-500/50" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Área de Trabalho Vazia</h3>
                            <p className="text-white/40 text-sm font-medium max-w-xs">Importe um arquivo MIDI para começar a gerar partituras e separar instrumentos.</p>
                        </div>
                    </div>
                )}
            </div>
            
            {/* DAW Status Bar */}
            <div className="h-10 border-t border-white/5 bg-black/40 px-6 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/30">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", isPlaying ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                        <span>Motor: {isPlaying ? 'Ativo' : 'Parado'}</span>
                    </div>
                    <span>Latência: 12ms</span>
                </div>
                <div className="flex items-center gap-6">
                    <span>Sample Rate: 44.1kHz</span>
                    <span>Buffer: 512</span>
                </div>
            </div>
        </div>
      </div>

      {/* Instrument Browser Modal */}
      {isInstrumentBrowserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-[#111] rounded-3xl border border-white/10 shadow-3xl overflow-hidden flex flex-col max-h-full">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500/10 rounded-2xl">
                            <Settings className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Navegador de Instrumentos</h2>
                            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Selecione o timbre para a trilha selecionada</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsInstrumentBrowserOpen(false)} className="rounded-full hover:bg-white/10">
                        <X className="w-6 h-6" />
                    </Button>
                </div>
                
                <div className="p-6 bg-black/20 border-b border-white/5">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                        <input 
                            type="text" 
                            placeholder="Buscar instrumento (ex: Piano, Guitar, Bass...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 custom-scrollbar">
                    {filteredInstruments.map(([id, name]) => (
                        <button 
                            key={id}
                            onClick={() => browserTargetTrack !== null && changeTrackInstrument(browserTargetTrack, name)}
                            className="p-6 rounded-2xl bg-white/3 border border-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 transition-all text-left group"
                        >
                            <Music className="w-5 h-5 text-white/20 group-hover:text-orange-500 mb-3 transition-colors" />
                            <span className="text-[11px] font-black text-white/80 group-hover:text-white uppercase leading-tight block">
                                {name.replace(/_/g, ' ')}
                            </span>
                        </button>
                    ))}
                </div>
                
                <div className="p-8 border-t border-white/5 bg-black/40 flex justify-end">
                    <Button onClick={() => setIsInstrumentBrowserOpen(false)} variant="default" className="h-12 px-8 font-black uppercase tracking-widest rounded-xl">
                        Fechar Navegador
                    </Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
