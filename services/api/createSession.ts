import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/db";

function uuid() {
  return (globalThis as any).crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now();
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!TABLE_NAME) throw new Error("TABLE_NAME not set");

    const body = event.body ? JSON.parse(event.body) : {};
    const now = Date.now();
    const sessionId: string = body.sessionId || uuid();

    // In dev, allow guest; with Cognito this comes from JWT claims
    const claims = (event.requestContext as any)?.authorizer?.jwt?.claims || {};
const userId: string = claims.sub || body.userId || "GUEST";

    const plan = body.plan || {};

    const sessionItem = {
      PK: `USER#${userId}`,
      SK: `SESSION#${now}#${sessionId}`,
      entity: "SESSION",
      sessionId,
      userId,
      startedAt: now,
      plan,
      completed: false,
    };

    const indexItem = {
      PK: `SESSION#${sessionId}`,
      SK: `META`,
      entity: "SESSION_INDEX",
      userId,
      startedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: sessionItem }));
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: indexItem }));

    return {
      statusCode: 201,
      headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
      body: JSON.stringify({ sessionId, startedAt: now }),
    };
  } catch (err: any) {
    console.error("createSession error", err);
    return {
      statusCode: 500,
      headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
      body: JSON.stringify({ message: "Internal error" }),
    };
  }
};
