import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../lib/db';
import { extractUserFromEvent } from '../lib/auth';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!TABLE_NAME) throw new Error('TABLE_NAME not set');
    const { userId } = extractUserFromEvent(event);
    const body = event.body ? JSON.parse(event.body) : {};
    const name = typeof body.name === 'string' ? body.name : undefined;
    const photoUrl = typeof body.photoUrl === 'string' ? body.photoUrl : undefined;

    const item: any = { PK: `USER#${userId}`, SK: 'PROFILE', updatedAt: Date.now() };
    if (name !== undefined) item.name = name;
    if (photoUrl !== undefined) item.photoUrl = photoUrl;

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return { statusCode: 204, headers: { 'access-control-allow-origin': '*' }, body: '' };
  } catch (e: any) {
    console.error('putProfile error', e);
    return { statusCode: 500, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify({ message: 'Internal error' }) };
  }
};