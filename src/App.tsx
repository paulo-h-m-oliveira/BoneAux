import { useState } from 'react';
import { Play, Square, Activity } from 'lucide-react';
import { useAudioEngine } from './hooks/useAudioEngine';
import { Button } from './components/ui/button';
import { MetronomeModule } from './components/modules/MetronomeModule';
import { PlayerModule } from './components/modules/PlayerModule';
import { RecorderModule } from './components/modules/RecorderModule';
import { VisualizerModule } from './components/modules/VisualizerModule';

export default function App() {
  const { init, isPlaying, togglePlayback } = useAudioEngine();
  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = async () => {
    if (!hasStarted) {
      await init();
      setHasStarted(true);
      togglePlayback();
    } else {
      togglePlayback();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">BoneAux Web</h1>
        </div>
        
        <Button 
          onClick={handleStart} 
          size="lg" 
          variant={isPlaying ? "destructive" : "default"}
          className="w-40 font-bold gap-2 transition-all shadow-md"
        >
          {isPlaying ? (
            <><Square className="w-4 h-4 fill-current" /> PARAR TUDO</>
          ) : (
            <><Play className="w-4 h-4 fill-current" /> {hasStarted ? 'CONTINUAR' : 'INICIAR MOTOR'}</>
          )}
        </Button>
      </header>

      {/* Main Dashboard Workspace */}
      <main className="flex-1 w-full max-w-6xl p-6 flex flex-col gap-6">
        {!hasStarted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight">Bem-vindo ao BoneAux Web</h2>
            <p className="text-muted-foreground text-lg">
              Sua plataforma integrada de estudo e precisão. Clique em "Iniciar Motor" para ativar o sistema de áudio Tone.js de baixa latência e habilitar os módulos.
            </p>
          </div>
        ) : (
          <>
            {/* Top Grid: Player and Metronome */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
               <PlayerModule />
               <MetronomeModule />
            </div>
            
            {/* Visualizer Span */}
            <div className="w-full">
              <VisualizerModule />
            </div>

            {/* Recorder Span */}
            <div className="w-full">
              <RecorderModule />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
