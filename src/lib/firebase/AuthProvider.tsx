import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { ensureUserDoc, getAccessDoc, requestAccess, type AccessDoc } from '@/services/db';

export type AccessStatus = 'loading' | 'signed-out' | 'no-access-doc' | 'pending' | 'approved';

interface AuthState {
  user: User | null;
  status: AccessStatus;
  accessDoc: AccessDoc | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AccessStatus>('loading');
  const [accessDoc, setAccessDoc] = useState<AccessDoc | null>(null);

  async function evaluateAccess(u: User) {
    let doc: AccessDoc | null = null;
    try {
      doc = await getAccessDoc();
    } catch {
      doc = null;
    }
    setAccessDoc(doc);

    if (!doc) {
      setStatus('no-access-doc');
      return;
    }
    if (doc.allowedUids.includes(u.uid)) {
      await ensureUserDoc(u.uid, u.displayName ?? 'Chef').catch(console.error);
      setStatus('approved');
      return;
    }
    if (!doc.pendingRequests?.[u.uid]) {
      await requestAccess(u.uid, u.displayName ?? '', u.email ?? '').catch(console.error);
    }
    setStatus('pending');
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setStatus('signed-out');
        setAccessDoc(null);
        return;
      }
      setStatus('loading');
      await evaluateAccess(u);
    });
    return unsub;
  }, []);

  async function login() {
    await signInWithPopup(auth, googleProvider);
  }
  async function logout() {
    await signOut(auth);
  }
  async function refreshAccess() {
    if (user) await evaluateAccess(user);
  }

  return (
    <AuthContext.Provider value={{ user, status, accessDoc, login, logout, refreshAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
