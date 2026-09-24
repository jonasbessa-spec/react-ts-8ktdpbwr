import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';

export type AppRole = 'admin' | 'developer' | 'viewer';
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: AppRole;
  loading: boolean;
  canWrite: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readRole = (user: User | null): AppRole => {
  const value = user?.app_metadata?.role || user?.user_metadata?.role;
  return value === 'admin' || value === 'developer' ? value : 'viewer';
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [role, setRole] = useState<AppRole>('viewer');

  useEffect(() => {
    if (!supabaseConfigured) return;
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).maybeSingle();
        if (active && (profile?.role === 'admin' || profile?.role === 'developer')) setRole(profile.role);
      }
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setRole('viewer');
      else {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', nextSession.user.id).maybeSingle();
        setRole(profile?.role === 'admin' || profile?.role === 'developer' ? profile.role : 'viewer');
      }
      setLoading(false);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    role,
    loading,
    canWrite: role !== 'viewer',
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      return { error: error ? new Error(error.message) : null };
    }
  }), [loading, role, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
