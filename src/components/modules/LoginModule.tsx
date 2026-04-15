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
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-card/40 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/20 p-3 rounded-2xl mb-4 shadow-lg shadow-primary/20">
            <Activity className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white to-white/60">
            BoneAux
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {isLogin ? 'Entre na sua conta para continuar' : 'Crie sua conta no BoneAux'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <div className="relative">
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-black/20 border-white/10 focus-visible:ring-primary/50"
                  required={!isLogin}
                />
                <div className="absolute left-3 top-2.5 text-muted-foreground">
                  <Activity className="w-5 h-5 opacity-50" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-black/20 border-white/10 focus-visible:ring-primary/50"
                required
              />
              <div className="absolute left-3 top-2.5 text-muted-foreground">
                <Mail className="w-5 h-5 opacity-50" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-black/20 border-white/10 focus-visible:ring-primary/50"
                required
              />
              <div className="absolute left-3 top-2.5 text-muted-foreground">
                <Lock className="w-5 h-5 opacity-50" />
              </div>
            </div>
          </div>

          {error && <div className="text-red-400 text-sm font-medium p-3 bg-red-400/10 rounded-lg border border-red-400/20">{error}</div>}
          {successMsg && <div className="text-emerald-400 text-sm font-medium p-3 bg-emerald-400/10 rounded-lg border border-emerald-400/20">{successMsg}</div>}

          <Button type="submit" className="w-full font-bold mt-6 h-12 rounded-xl" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Entrar' : 'Criar Conta')}
          </Button>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
