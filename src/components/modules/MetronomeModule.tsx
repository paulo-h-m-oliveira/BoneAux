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
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Metronome className="w-5 h-5 text-primary" />
          Metrônomo de Precisão
        </CardTitle>
        <div className="flex items-center gap-2">
           <div className={cn(
             "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-75",
             flash ? "scale-125" : "scale-100",
             flash === "accent" 
               ? "bg-primary shadow-[0_0_15px_hsl(var(--primary))]" 
               : flash === "normal" 
                 ? "bg-secondary-foreground/50" 
                 : "bg-secondary"
           )} />
           <Button variant="ghost" size="icon" onClick={toggleMetronome}>
             {isMetronomeMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
           </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">BPM</span>
              {isMidiSynced && (
                <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
                  MIDI Sync (Locked)
                </span>
              )}
            </div>
            <span className="text-2xl font-bold tabular-nums">
              {isMidiSynced ? "Auto" : bpm}
            </span>
          </div>
          <Slider 
            min={40} 
            max={240} 
            step={1} 
            value={bpm} 
            disabled={isMidiSynced}
            onChange={(e) => changeBpm(Number(e.target.value))} 
            className={isMidiSynced ? "opacity-50 cursor-not-allowed" : ""}
          />
        </div>

        <div className="space-y-3">
          <span className="text-sm font-medium">Subdivisões</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((sub) => (
              <Button
                key={sub}
                variant={subdivisions === sub ? "default" : "outline"}
                className="flex-1"
                onClick={() => changeSubdivisions(sub)}
              >
                {sub === 1 ? 'Semínima' : sub === 2 ? 'Colcheia' : sub === 3 ? 'Tercina' : 'Semicolcheia'}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
