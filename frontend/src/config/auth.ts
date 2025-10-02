export type AuthConfig = {
  cognitoDomain?: string;
  clientId?: string;
  region?: string;
  redirectUri?: string;
  scope?: string;
};

export const getAuthConfig = (): AuthConfig => ({
  cognitoDomain: process.env.REACT_APP_COGNITO_DOMAIN,
  clientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
  region: process.env.REACT_APP_COGNITO_REGION,
  redirectUri: process.env.REACT_APP_COGNITO_REDIRECT_URI ?? (typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : undefined),
  // Important: use space-delimited scopes (OIDC standard). URLSearchParams will encode spaces as '+'.
  scope: process.env.REACT_APP_COGNITO_SCOPE ?? 'openid email profile',
});

export const isCognitoConfigured = (): boolean => {
  const cfg = getAuthConfig();
  return !!(cfg.cognitoDomain && cfg.clientId && cfg.redirectUri);
};

export const buildAuthorizeUrl = (opts: { domain: string; clientId: string; redirectUri: string; scope: string; state: string; codeChallenge: string; }): string => {
  // Allow either bare domain or fully-qualified
  const base = opts.domain.startsWith('http') ? `${opts.domain.replace(/\/$/, '')}/oauth2/authorize` : `https://${opts.domain}/oauth2/authorize`;
  // Normalize scopes to spaces (Cognito expects space-delimited list)
  const normalizedScope = opts.scope.replace(/[+,]/g, ' ').replace(/\s+/g, ' ').trim();
  const q = new URLSearchParams({
    client_id: opts.clientId,
    response_type: 'code',
    redirect_uri: opts.redirectUri,
    scope: normalizedScope,
    state: opts.state,
    code_challenge_method: 'S256',
    code_challenge: opts.codeChallenge,
  });
  return `${base}?${q.toString()}`;
};
