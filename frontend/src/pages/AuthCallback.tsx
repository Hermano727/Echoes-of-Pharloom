import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAuthConfig, isCognitoConfigured } from '../config/auth';
import { PKCE_VERIFIER_KEY } from '../auth/AuthContext';

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

const AuthCallback: React.FC = () => {
  const [msg, setMsg] = useState('Completing sign-in...');
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const hasCognito = isCognitoConfigured();
      const code = params.get('code');
      const error = params.get('error');
      if (error) {
        setMsg(`Auth error: ${error}`);
        setTimeout(() => navigate('/'), 1200);
        return;
      }
      if (hasCognito && code) {
        try {
          const cfg = getAuthConfig();
          if (!cfg.cognitoDomain || !cfg.clientId || !cfg.redirectUri) throw new Error('Missing auth config');
          const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY) || '';
          if (!verifier) {
            console.warn('No PKCE verifier found; start sign-in from the app again.');
            setMsg('Session expired. Please sign in again.');
            setTimeout(() => navigate('/'), 1200);
            return;
          }
          const tokenUrl = (cfg.cognitoDomain.startsWith('http') ? `${cfg.cognitoDomain.replace(/\/$/, '')}` : `https://${cfg.cognitoDomain}`) + '/oauth2/token';
          const form = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: cfg.clientId,
            code,
            redirect_uri: cfg.redirectUri,
            code_verifier: verifier,
          });
          const res = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: form.toString(),
          });
          if (!res.ok) {
            let detail = '';
            try { detail = await res.text(); } catch {}
            console.error('Token exchange failed', { status: res.status, detail });
            throw new Error('Token exchange failed');
          }
          const tok = await res.json();
          const expires_at = tok.expires_in ? Date.now() + tok.expires_in * 1000 : undefined;
          const tokens = { id_token: tok.id_token, access_token: tok.access_token, refresh_token: tok.refresh_token, expires_at };
          localStorage.setItem('authTokens', JSON.stringify(tokens));
          const payload = decodeJwtPayload<any>(tok.id_token);
          if (payload) localStorage.setItem('mockUser', JSON.stringify({ id: payload.sub, email: payload.email, name: payload.name }));
          // Notify the app in the same tab so AuthProvider rehydrates immediately
          try { window.dispatchEvent(new Event('authTokensUpdated')); } catch {}
          setMsg('Signed in. Redirecting...');
          // Redirect back to the page the user initiated sign-in from
          try {
            const ret = sessionStorage.getItem('post_login_redirect');
            if (ret) sessionStorage.removeItem('post_login_redirect');
            let target = '/';
            if (ret) {
              try {
                const u = new URL(ret, window.location.origin);
                if (u.origin === window.location.origin) {
                  target = `${u.pathname}${u.search}${u.hash}`;
                }
              } catch {}
            }
            setTimeout(() => navigate(target, { replace: true }), 250);
          } catch {
            setTimeout(() => navigate('/'), 400);
          }
          return;
        } catch (e) {
          console.error(e);
          setMsg('Failed to complete sign-in. Returning...');
          setTimeout(() => navigate('/'), 1200);
          return;
        }
      }
      setMsg('Auth not configured, returning home...');
      setTimeout(() => navigate('/'), 800);
    })();
  }, [navigate, params]);

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white bg-black font-trajan flex items-center justify-center">
      <div className="bg-black/40 border border-white/15 p-6 rounded-xl">{msg}</div>
    </div>
  );
};

export default AuthCallback;