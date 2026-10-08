import { useEffect } from 'react';
import { Anchor, Loader2 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { supabaseConfigured } from './lib/supabase';
import { initializeLocalCollaborators, isLocalDemoEnvironment } from './lib/localCollaborators';
import ConfigScreen from './components/ConfigScreen';
import LoginScreen from './components/LoginScreen';
import AppShell from './components/layout/AppShell';

function Splash() {
  return (
    <main className="auth-backdrop flex min-h-screen flex-col items-center justify-center gap-4 text-slate-400">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950"><Anchor size={24} /></span>
      <span className="flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" /> Verificando sessão...</span>
    </main>
  );
}

export function App() {
  const { session, loading } = useAuth();
  const localDemoMode = isLocalDemoEnvironment();

  useEffect(() => {
    if (localDemoMode) initializeLocalCollaborators();
  }, [localDemoMode]);

  if (localDemoMode) return <AppShell demoMode />;
  if (!supabaseConfigured) return <ConfigScreen />;
  if (loading) return <Splash />;
  if (!session) return <LoginScreen />;
  return <AppShell />;
}

export default App;
