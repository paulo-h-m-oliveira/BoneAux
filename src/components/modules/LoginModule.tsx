import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Activity, Mail, Lock, Loader2 } from 'lucide-react';

export function LoginModule() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        if (error) throw error;
        setSuccessMsg('Conta criada! Verifique seu email para confirmar ou faça login se a confirmação estiver desativada.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#050505] dark text-white">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md bg-black/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] z-10 relative">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-linear-to-br from-orange-500 to-yellow-500 p-4 rounded-2xl mb-6 orange-glow transform -rotate-3 hover:rotate-0 transition-transform duration-500">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-5xl font-black tracking-tighter text-gradient uppercase">
            BoneAux
          </h2>
          <div className="h-1 w-12 bg-linear-to-r from-orange-500 to-yellow-500 rounded-full mt-2" />
          <p className="text-sm font-bold tracking-widest text-muted-foreground mt-4 uppercase opacity-60">
            {isLogin ? 'Faça a sua Missão!' : 'Junte-se a nós!'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-500/80 ml-1">Nome completo</Label>
              <div className="relative group">
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 pl-12 bg-white/7 border-white/10 focus:border-orange-500/50 rounded-xl transition-all text-white placeholder:text-white/20"
                  required={!isLogin}
                />
                <div className="absolute left-4 top-3.5 text-muted-foreground group-focus-within:text-orange-500 transition-colors">
                  <Activity className="w-5 h-5 opacity-50" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-500/80 ml-1">E-mail</Label>
            <div className="relative group">
              <Input
                id="email"
                type="email"
                placeholder="pilot@boneaux.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 pl-12 bg-white/7 border-white/10 focus:border-orange-500/50 rounded-xl transition-all text-white placeholder:text-white/20"
                required
              />
              <div className="absolute left-4 top-3.5 text-muted-foreground group-focus-within:text-orange-500 transition-colors">
                <Mail className="w-5 h-5 opacity-50" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-500/80 ml-1">Senha</Label>
            <div className="relative group">
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pl-12 bg-white/7 border-white/10 focus:border-orange-500/50 rounded-xl transition-all text-white placeholder:text-white/20"
                required
              />
              <div className="absolute left-4 top-3.5 text-muted-foreground group-focus-within:text-orange-500 transition-colors">
                <Lock className="w-5 h-5 opacity-50" />
              </div>
            </div>
          </div>

          {error && <div className="text-red-400 text-xs font-bold p-4 bg-red-400/5 rounded-xl border border-red-400/10 animate-shake">{error}</div>}
          {successMsg && <div className="text-orange-400 text-xs font-bold p-4 bg-orange-400/5 rounded-xl border border-orange-400/10">{successMsg}</div>}

          <Button type="submit" className="w-full font-black uppercase tracking-widest text-sm mt-8 h-14 rounded-2xl orange-glow" disabled={loading}>
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isLogin ? 'Entrar no sistema' : 'Criar conta')}
          </Button>

          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-orange-500 transition-all"
            >
              {isLogin ? 'Cadastre-se' : 'Já faz parte? faça o Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
