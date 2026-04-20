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
    <div className="min-h-screen bg-[#050505] text-foreground flex flex-col items-center selection:bg-orange-500/30">
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 group">
            <div className="bg-linear-to-br from-orange-500 to-yellow-500 p-2 rounded-xl orange-glow group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter uppercase text-gradient">BoneAux</h1>
              <span className="text-[10px] font-bold tracking-[0.2em] text-orange-400 uppercase leading-none">Pro Studio</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-default">
            <User className="w-4 h-4 text-orange-500/80" />
            <span className="text-sm font-semibold text-white/80">{userName}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleStart} 
            size="lg" 
            variant={isPlaying ? "destructive" : "default"}
            className="h-11 px-6 font-black uppercase tracking-wider gap-2 shadow-orange-500/20"
          >
            {isPlaying ? (
              <><Square className="w-4 h-4 fill-current" /> STOP</>
            ) : (
              <><Play className="w-4 h-4 fill-current" /> {hasStarted ? 'RESUME' : 'START ENGINE'}</>
            )}
          </Button>

          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full hover:bg-red-500/10 hover:text-red-500 transition-all">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Dashboard Workspace */}
      <main className="flex-1 w-full max-w-7xl p-4 md:p-8 flex flex-col gap-8">
        {!hasStarted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="relative mb-4">
               <div className="absolute -inset-10 bg-orange-500/20 blur-[100px] rounded-full" />
               <Activity className="w-24 h-24 text-orange-500 animate-pulse relative z-10" />
            </div>
            <div className="space-y-4 relative z-10">
              <h2 className="text-5xl font-black tracking-tighter text-white">READY TO <span className="text-gradient">PLAY?</span></h2>
              <p className="text-white/60 text-xl leading-relaxed max-w-xl mx-auto">
                Sua plataforma de precisão musical acaba de ficar mais quente. Ative o motor de áudio para carregar seus módulos.
              </p>
            </div>
            <Button 
              onClick={handleStart} 
              size="lg" 
              className="h-16 px-12 text-xl font-black rounded-2xl orange-glow hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
            >
              Iniciar Sistema
            </Button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
            {/* Top Grid: Player and Metronome */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
               <div className="xl:col-span-1">
                 <PlayerModule />
               </div>
               <div className="xl:col-span-1">
                 <MetronomeModule />
               </div>
            </div>
            
            {/* Visualizer Span */}
            <div className="w-full">
              <VisualizerModule />
            </div>

            <div className="w-full">
              <RecorderModule />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
