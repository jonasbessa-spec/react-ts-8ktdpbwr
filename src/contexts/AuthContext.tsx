import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { isLocalDemoEnvironment } from '../lib/localCollaborators';

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
    if (!supabaseConfigured || isLocalDemoEnvironment()) return;
    let active = true;
    let hasAuthEvent = false;
    let sessionRevision = 0;

    const applySession = async (nextSession: Session | null) => {
      const revision = ++sessionRevision;
      if (!active) return;
      setSession(nextSession);
      setRole('viewer');
      setLoading(Boolean(nextSession));

      if (!nextSession) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', nextSession.user.id)
          .maybeSingle();
        if (error) throw error;
        if (active && revision === sessionRevision) {
          setRole(profile?.role === 'admin' || profile?.role === 'developer' ? profile.role : 'viewer');
          setLoading(false);
        }
      } catch (cause) {
        console.error('Não foi possível carregar o perfil de acesso; a sessão permanecerá somente leitura.', cause);
        if (active && revision === sessionRevision) {
          setRole('viewer');
          setLoading(false);
        }
      }
    };

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!hasAuthEvent) return applySession(data.session);
      })
      .catch((cause) => {
        console.error('Não foi possível recuperar a sessão Supabase.', cause);
        if (active && !hasAuthEvent) {
          setSession(null);
          setRole('viewer');
          setLoading(false);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Query the profile after Supabase releases its internal auth lock.
      hasAuthEvent = true;
      setTimeout(() => { void applySession(nextSession); }, 0);
    });

    return () => {
      active = false;
      sessionRevision += 1;
      listener.subscription.unsubscribe();
    };
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
