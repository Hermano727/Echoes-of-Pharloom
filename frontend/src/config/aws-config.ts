export type AwsCognitoConfig = {
  region?: string;
  userPoolId?: string;
  clientId?: string;
  domain?: string; // Cognito Hosted UI domain (without https://) or full domain
  redirectUri?: string;
};

export const getAwsCognitoConfig = (): AwsCognitoConfig => ({
  region: process.env.REACT_APP_COGNITO_REGION,
  userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
  clientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
  domain: process.env.REACT_APP_COGNITO_DOMAIN,
  redirectUri:
    process.env.REACT_APP_COGNITO_REDIRECT_URI ??
    (typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : undefined),
});

export const isAwsCognitoConfigured = (): boolean => {
  const cfg = getAwsCognitoConfig();
  return !!(cfg.region && cfg.userPoolId && cfg.clientId);
};