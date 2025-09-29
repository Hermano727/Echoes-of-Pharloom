import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/db";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!TABLE_NAME) throw new Error("TABLE_NAME not set");

    const sessionId = event.pathParameters?.id;
    if (!sessionId) {
      return {
        statusCode: 400,
        headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing session id" }),
      };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const type: string = body.type;
    if (!type) {
      return {
        statusCode: 400,
        headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing event type" }),
      };
    }

    const ts = Date.now();

    // Insert event under PK=SESSION#sessionId
    const evtItem = {
      PK: `SESSION#${sessionId}`,
      SK: `EVT#${ts}`,
      entity: "SESSION_EVENT",
      type,
      ts,
      data: body.data ?? {},
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: evtItem }));

    // If Completed, mark session as completed using index lookup
    if (type === "Completed") {
      const idx = await ddb.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: `SESSION#${sessionId}`, SK: `META` },
        })
      );

      const meta = idx.Item as any;
      if (meta && meta.userId && meta.startedAt) {
        const pk = `USER#${meta.userId}`;
        const sk = `SESSION#${meta.startedAt}#${sessionId}`;
        await ddb.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: pk, SK: sk },
            UpdateExpression: "SET completed = :c, completedAt = :t",
            ExpressionAttributeValues: { ":c": true, ":t": ts },
          })
        );
      }
    }

    return {
      statusCode: 200,
      headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
      body: JSON.stringify({ ok: true, ts }),
    };
  } catch (err: any) {
    console.error("appendEvent error", err);
    return {
      statusCode: 500,
      headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
      body: JSON.stringify({ message: "Internal error" }),
    };
  }
};
