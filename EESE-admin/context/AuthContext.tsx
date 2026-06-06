import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/router';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebase';
import { loginWithEmail, loginWithSso, logout as clearToken, getStoredToken } from '../lib/apiClient';
import { AuthUser, Role } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Rehydrate user from the stored JWT cookie on first load
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload && payload.uid && payload.email && payload.role) {
          setUser({ uid: payload.uid, email: payload.email, role: payload.role as Role, displayName: payload.displayName });
        }
      } catch {
        // Token malformed — ignore, user stays null and will be redirected to login
      }
    }
    setLoading(false);
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      // Authenticate with Firebase, then exchange idToken for our app JWT
      const auth = getFirebaseAuth();
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();
      const { role, displayName } = await loginWithSso(idToken);
      setUser({ uid: result.user.uid, email: result.user.email!, role: role as Role, displayName: displayName ?? result.user.displayName ?? undefined });
      await router.push(dashboardByRole(role as Role));
    } finally {
      setLoading(false);
    }
  }, [router]);

  const signInGoogle = useCallback(async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(getFirebaseAuth(), provider);
      const idToken = await result.user.getIdToken();
      const { role, displayName } = await loginWithSso(idToken);
      setUser({ uid: result.user.uid, email: result.user.email!, role: role as Role, displayName: displayName ?? result.user.displayName ?? undefined });
      await router.push(dashboardByRole(role as Role));
    } finally {
      setLoading(false);
    }
  }, [router]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth());
    clearToken();
    setUser(null);
    await router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, signInEmail, signInGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

function dashboardByRole(_role: Role): string {
  return '/dashboard';
}
