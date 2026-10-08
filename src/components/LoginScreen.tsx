import { FormEvent, useState } from 'react';
import { Anchor, Eye, EyeOff, LockKeyhole, LogIn, Mail, RefreshCw, TriangleAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await signIn(email, password);
    if (result.error) setError(result.error.message);
    setSubmitting(false);
  };

  return (
    <main className="auth-backdrop flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20"><Anchor size={22} /></span>
          <div>
            <strong className="block text-base font-extrabold text-white">Porto do Pecém</strong>
            <small className="text-xs uppercase tracking-[0.18em] text-slate-400">Gestão operacional</small>
          </div>
        </div>

        <h1 className="text-xl font-bold text-white">Acesso ao painel</h1>
        <p className="mt-1 text-sm text-slate-400">Entre com sua conta corporativa para consultar o cockpit operacional.</p>

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200" role="alert">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-300">E-mail</span>
            <span className="input flex items-center gap-2">
              <Mail size={15} className="text-slate-500" />
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full bg-transparent outline-none placeholder:text-slate-600" placeholder="nome@empresa.com.br" />
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-300">Senha</span>
            <span className="input flex items-center gap-2">
              <LockKeyhole size={15} className="text-slate-500" />
              <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="w-full bg-transparent outline-none" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-500 hover:text-slate-300" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </span>
          </label>
          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-2.5">
            {submitting ? <RefreshCw size={16} className="animate-spin" /> : <LogIn size={16} />} Entrar
          </button>
        </form>
        <p className="mt-6 text-center text-[11px] text-slate-500">Sem acesso? Peça ao administrador para criar seu usuário no Supabase.</p>
      </section>
    </main>
  );
}
