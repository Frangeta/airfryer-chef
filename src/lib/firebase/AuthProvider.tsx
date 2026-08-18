import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider, OWNER_UID } from './firebase';
import { ensureUserDoc } from '@/services/db';

interface AuthState {
  user: User | null;
  loading: boolean;
  isOwner: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u && OWNER_UID && u.uid === OWNER_UID) {
        ensureUserDoc(u.uid, u.displayName ?? 'Chef').catch(console.error);
      }
    });
    return unsub;
  }, []);

  async function login() {
    await signInWithPopup(auth, googleProvider);
  }
  async function logout() {
    await signOut(auth);
  }

  const isOwner = !!user && !!OWNER_UID && user.uid === OWNER_UID;

  return <AuthContext.Provider value={{ user, loading, isOwner, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
