import { APIGatewayProxyEventV2 } from 'aws-lambda';

export interface CognitoUser {
  userId: string;
  email?: string;
  username?: string;
}

// Extract Cognito user info from HTTP API JWT authorizer claims
// No extra dependencies required when API Gateway performs JWT validation
export function extractUserFromEvent(event: APIGatewayProxyEventV2): CognitoUser {
  const claims = (event.requestContext as any)?.authorizer?.jwt?.claims as any | undefined;
  if (!claims || !claims.sub) {
    throw new Error('Missing or invalid JWT claims');
  }
  return {
    userId: String(claims.sub),
    email: claims.email ? String(claims.email) : undefined,
    username: claims['cognito:username'] ? String(claims['cognito:username']) : undefined,
  };
}
