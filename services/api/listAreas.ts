import type { APIGatewayProxyResultV2, APIGatewayProxyEventV2 } from 'aws-lambda';

const AREAS = [
  { id: 'bonebottom', name: 'Bonebottom' },
  { id: 'far-fields', name: 'Far Fields' },
  { id: 'hunters-path', name: "Hunter's Path" },
];

export const handler = async (_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    },
    body: JSON.stringify({ areas: AREAS }),
  };
};
