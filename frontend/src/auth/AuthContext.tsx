import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAuthConfig, isCognitoConfigured, buildAuthorizeUrl } from '../config/auth';
import { createPkcePair } from './pkce';

export type AuthUser = { id: string; email?: string; name?: string };

export type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_KEY = 'mockUser';
const PKCE_VERIFIER_KEY = 'pkce_verifier';
const STATE_KEY = 'oauth_state';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  // load mock user from localStorage (dev mode)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const signIn = useCallback(async () => {
    const cognito = isCognitoConfigured();
    if (!cognito) {
      // Mock sign-in (dev)
      const mock: AuthUser = { id: 'mock-user', name: 'Echoes Dev', email: 'echoes@example.com' };
      setUser(mock);
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(mock)); } catch {}
      return;
    }
    const cfg = getAuthConfig();
    if (!cfg.cognitoDomain || !cfg.clientId || !cfg.redirectUri) return;
    const { verifier, challenge } = await createPkcePair();
    const state = crypto.randomUUID();
    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    const url = buildAuthorizeUrl({
      domain: cfg.cognitoDomain,
      clientId: cfg.clientId,
      redirectUri: cfg.redirectUri,
      scope: cfg.scope ?? 'openid+email+profile',
      state,
      codeChallenge: challenge,
    });
    window.location.assign(url);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    try { localStorage.removeItem(LOCAL_KEY); } catch {}
    // Optional: if Cognito configured, redirect to logout endpoint later
  }, []);

  const value = useMemo<AuthContextType>(() => ({ user, isAuthenticated: !!user, signIn, signOut }), [user, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};