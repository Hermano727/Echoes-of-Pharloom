import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAuthConfig, isCognitoConfigured } from '../config/auth';

const AuthCallback: React.FC = () => {
  const [msg, setMsg] = useState('Completing sign-in...');
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const hasCognito = isCognitoConfigured();
    const code = params.get('code');
    const error = params.get('error');
    if (error) {
      setMsg(`Auth error: ${error}`);
      setTimeout(() => navigate('/'), 1200);
      return;
    }
    if (hasCognito && code) {
      // TODO: Exchange code for tokens against Cognito token endpoint (requires proper CORS and public client)
      // For now, show a placeholder and return to home.
      setMsg('Auth configured — token exchange to be implemented after AWS setup. Redirecting...');
      setTimeout(() => navigate('/'), 1200);
      return;
    }
    // If no Cognito configured, just go home
    setMsg('Auth not configured, returning home...');
    setTimeout(() => navigate('/'), 800);
  }, [navigate, params]);

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white bg-black font-trajan flex items-center justify-center">
      <div className="bg-black/40 border border-white/15 p-6 rounded-xl">{msg}</div>
    </div>
  );
};

export default AuthCallback;