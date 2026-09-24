import { FormEvent, useState } from 'react';
import { Anchor, LockKeyhole, LogIn, RefreshCw, TriangleAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const { signIn, enterGuestMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return <main className="login-screen"><section className="login-card">
    <div className="login-brand"><span><Anchor size={23} /></span><div><strong>Porto do Pecém</strong><small>Gestão Operacional</small></div></div>
    <h1>Acesso ao painel</h1><p>Entre com sua conta corporativa para consultar o cockpit operacional.</p>
    {error && <div className="login-error" role="alert"><TriangleAlert size={16} />{error}</div>}
    <form onSubmit={handleSubmit}>
      <label>E-mail<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>Senha<div className="login-password"><LockKeyhole size={15} /><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div></label>
      <button type="submit" disabled={submitting}>{submitting ? <RefreshCw size={16} className="animate-spin" /> : <LogIn size={16} />} Entrar</button>
    </form>
    <button type="button" className="guest-access-button" onClick={enterGuestMode}>Acessar sem senha por enquanto</button>
    <small className="guest-access-note">Acesso temporário somente para consulta. Cadastros, edição e sincronização ficam bloqueados.</small>
  </section></main>;
}
