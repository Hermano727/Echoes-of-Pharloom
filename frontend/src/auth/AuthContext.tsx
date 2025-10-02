import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAuthConfig, isCognitoConfigured, buildAuthorizeUrl } from '../config/auth';
import { createPkcePair } from './pkce';

export type AuthUser = { id: string; email?: string; name?: string };

export type AuthTokens = {
  id_token: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number; // epoch ms
};

export type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  tokens: AuthTokens | null;
  signIn: () => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USER_KEY = 'mockUser';
const TOKENS_KEY = 'authTokens';
export const PKCE_VERIFIER_KEY = 'pkce_verifier';
export const STATE_KEY = 'oauth_state';

function decodeJwtPayload<T = any>(jwt: string): T | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);

  // Initialize from stored tokens or mock user
  useEffect(() => {
    try {
      const rawTok = localStorage.getItem(TOKENS_KEY);
      if (rawTok) {
        const t: AuthTokens = JSON.parse(rawTok);
        if (t.id_token) {
          const payload = decodeJwtPayload<any>(t.id_token);
          if (payload && (!t.expires_at || Date.now() < t.expires_at)) {
            setTokens(t);
            setUser({ id: payload.sub, email: payload.email, name: payload.name });
            return;
          }
        }
      }
      const rawMock = localStorage.getItem(MOCK_USER_KEY);
      if (rawMock) setUser(JSON.parse(rawMock));
    } catch {}
  }, []);

  const signIn = useCallback(async () => {
    const cognito = isCognitoConfigured();
    if (!cognito) {
      const mock: AuthUser = { id: 'mock-user', name: 'Echoes Dev', email: 'echoes@example.com' };
      setUser(mock);
      try { localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mock)); } catch {}
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
    setTokens(null);
    try {
      localStorage.removeItem(TOKENS_KEY);
      localStorage.removeItem(MOCK_USER_KEY);
    } catch {}
    // Optional: if Cognito configured, redirect to hosted UI logout endpoint
  }, []);

  const value = useMemo<AuthContextType>(() => ({ user, isAuthenticated: !!user, tokens, signIn, signOut }), [user, tokens, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};