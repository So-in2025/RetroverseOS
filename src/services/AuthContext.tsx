import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signInAsDeveloper: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const mockSignIn = async (name: string = 'Guest User') => {
    setUser({
      id: 'dev-user-id-' + Math.random().toString(36).substring(7),
      email: 'dev@retroverse.os',
      app_metadata: {},
      user_metadata: { name },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User);
  };

  const mockSignOut = async () => {
    setUser(null);
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('[Auth] Session check timed out. Falling back to unauthenticated state.');
        setLoading(false);
      }
    }, 5000);

    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(err => {
      clearTimeout(timeoutId);
      console.error('[Auth] Session check failed:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      setLoading(false);

      if (newUser) {
        // Trigger profile sync on login
        import('./profileSyncService').then(({ profileSync }) => {
          profileSync.init().then(() => {
            profileSync.pullProfile(newUser.id);
          });
        });
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) {
      console.warn('Supabase not initialized. Using mock sign in.');
      await mockSignIn('Google User');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  };

  const signInAnonymously = async () => {
    if (!supabase) {
      await mockSignIn('Guest User');
      return;
    }
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  };

  const signInAsDeveloper = async () => {
    await mockSignIn('Developer');
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) {
      console.warn('Supabase not initialized. Using mock sign in.');
      await mockSignIn(email.split('@')[0]);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!supabase) {
      console.warn('Supabase not initialized. Using mock sign in.');
      await mockSignIn(email.split('@')[0]);
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) {
      await mockSignOut();
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signInWithGoogle: supabase ? signInWithGoogle : mockSignIn, 
      signInAnonymously,
      signInAsDeveloper,
      signInWithEmail,
      signUpWithEmail,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
