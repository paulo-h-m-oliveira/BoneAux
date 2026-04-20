import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { Metronome, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../lib/utils';

export function MetronomeModule() {
  const { bpm, changeBpm, subdivisions, changeSubdivisions, isMetronomeMuted, toggleMetronome, isMidiSynced } = useAudioEngine();
  const [flash, setFlash] = useState<"accent" | "normal" | null>(null);

  useEffect(() => {
    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent;
      setFlash(customEvent.detail.isAccent ? "accent" : "normal");
      setTimeout(() => setFlash(null), 100);
    };

    window.addEventListener('metronome-tick', handleTick);
    return () => window.removeEventListener('metronome-tick', handleTick);
  }, []);

  return (
    <Card className="w-full relative overflow-hidden border-primary/10 animate-in fade-in slide-in-from-right-4 duration-500 shadow-2xl">
      <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-yellow-500 to-orange-500" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-6">
        <CardTitle className="text-2xl font-black flex items-center gap-3 tracking-tighter uppercase">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Metronome className="w-6 h-6 text-yellow-500" />
          </div>
          Quantum Beat
        </CardTitle>
        <div className="flex items-center gap-4">
           <div className={cn(
             "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-75 border-2",
             flash ? "scale-110" : "scale-100",
             flash === "accent" 
               ? "bg-orange-500 border-orange-400 shadow-[0_0_30px_hsl(25,100%,50%)]" 
               : flash === "normal" 
                 ? "bg-yellow-500 border-yellow-400 shadow-[0_0_20px_hsl(45,100%,50%)]" 
                 : "bg-white/5 border-white/10"
           )}>
             <div className={cn(
               "w-2 h-2 rounded-full",
               flash ? "bg-white animate-ping" : "bg-white/20"
             )} />
           </div>
           <Button variant="ghost" size="icon" onClick={toggleMetronome} className="rounded-full hover:bg-white/10 transition-all">
             {isMetronomeMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-yellow-500" />}
           </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-10 pt-2">
        <div className="space-y-6">
          <div className="flex justify-between items-end px-1">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-400 ml-1">Tempo Control</span>
              {isMidiSynced && (
                <span className="text-[9px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-md uppercase tracking-widest animate-pulse">
                  SLAVE MODE
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="tabular-nums font-black text-5xl tracking-tighter text-white">
                {isMidiSynced ? "EXT" : bpm}
              </span>
              {!isMidiSynced && <span className="text-yellow-400 text-sm font-black tracking-tighter ml-1">BPM</span>}
            </div>
          </div>
          <div className="relative pt-2">
            <Slider 
              min={40} 
              max={240} 
              step={1} 
              value={bpm} 
              disabled={isMidiSynced}
              onChange={(e) => changeBpm(Number(e.target.value))} 
              className={cn("relative z-10", isMidiSynced && "opacity-20 cursor-not-allowed")}
            />
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -translate-y-1/2" />
          </div>
        </div>

        <div className="space-y-4">
          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-400 ml-1">Grain Division</span>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((sub) => (
              <Button
                key={sub}
                variant={subdivisions === sub ? "default" : "outline"}
                className={cn(
                  "h-14 font-black uppercase tracking-tight text-[11px] rounded-xl transition-all",
                  subdivisions === sub ? "orange-glow scale-105" : "bg-white/2 border-white/5 hover:bg-white/10"
                )}
                onClick={() => changeSubdivisions(sub)}
              >
                {sub === 1 ? 'Quarter' : sub === 2 ? 'Eighth' : sub === 3 ? 'Triplet' : 'Sixteenth'}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

