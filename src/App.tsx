import { useEffect, useState } from 'react';
import { Play, Square, Activity, LogOut, User } from 'lucide-react';
import { useAudioEngine } from './hooks/useAudioEngine';
import { Button } from './components/ui/button';
import { MetronomeModule } from './components/modules/MetronomeModule';
import { PlayerModule } from './components/modules/PlayerModule';
import { RecorderModule } from './components/modules/RecorderModule';
import { VisualizerModule } from './components/modules/VisualizerModule';
import { LoginModule } from './components/modules/LoginModule';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function App() {
  const { init, isPlaying, togglePlayback } = useAudioEngine();
  const [hasStarted, setHasStarted] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleStart = async () => {
    if (!hasStarted) {
      await init();
      setHasStarted(true);
      togglePlayback();
    } else {
      togglePlayback();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <Activity className="w-12 h-12 text-primary animate-pulse" />
    </div>;
  }

  if (!session) {
    return <LoginModule />;
  }

  const userName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">BoneAux Web</h1>
          </div>
          
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{userName}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
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

          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
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
