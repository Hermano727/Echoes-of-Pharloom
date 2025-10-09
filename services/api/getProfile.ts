import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../lib/db';
import { extractUserFromEvent } from '../lib/auth';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!TABLE_NAME) throw new Error('TABLE_NAME not set');
    const { userId } = extractUserFromEvent(event);

    const res = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      ConsistentRead: true,
    }));

    const Item = res.Item || {};
    const payload = {
      name: Item.name || null,
      photoUrl: Item.photoUrl || null,
      updatedAt: Item.updatedAt || null,
    };

    return { statusCode: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify(payload) };
  } catch (e: any) {
    console.error('getProfile error', e);
    return { statusCode: 500, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify({ message: 'Internal error' }) };
  }
};