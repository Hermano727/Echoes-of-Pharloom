import type { APIGatewayProxyResultV2, APIGatewayProxyEventV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from '../lib/db';

type Streaks = {
  daily: number;
  focus: number;
  noDeath: number;
};

type HomeSummary = {
  user: { isGuest: boolean; userId?: string };
  streaks: Streaks;
  recentSessions: Array<{
    sessionId: string;
    startedAt: number;
    durationMin: number;
    completed: boolean;
    areas: string[];
  }>;
};

function ymdUTC(ts: number): string {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!TABLE_NAME) throw new Error('TABLE_NAME not set');

    // Identity: use Cognito sub if present; otherwise allow guest
    const claims = (event.requestContext as any)?.authorizer?.jwt?.claims || {};
    const userId: string = claims.sub || 'GUEST';
    const isGuest = !claims.sub;


    // 1) Recent sessions for user (latest first)
    const recentLimit = 10;
    const sessionsRes = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'SESSION#',
      },
      ScanIndexForward: false, // latest first
      Limit: recentLimit,
      ConsistentRead: true,
    }));


    const sessions = (sessionsRes.Items || []).map((it: any) => {
      const startedAt: number = it.startedAt ?? 0;
      const sessionId: string = it.sessionId ?? (typeof it.SK === 'string' ? (it.SK.split('#')[2] || '') : '');
      const plan = it.plan || {};
      let durationSec = 0;
      if (plan.segments && Array.isArray(plan.segments)) {
        durationSec = plan.segments.reduce((acc: number, s: any) => acc + Math.max(0, s.durationSec || 0), 0);
      } else if (typeof plan.totalDurationSec === 'number') {
        durationSec = Math.max(0, plan.totalDurationSec);
      }
      const areas: string[] = plan.segments && Array.isArray(plan.segments) ? plan.segments.map((s: any) => s.area) : (plan.areas || []);
      return {
        sessionId,
        startedAt,
        durationMin: durationSec > 0 ? Math.round(durationSec / 60) : 0,
        completed: !!it.completed,
        areas,
      };
    });

    // 2) Compute streaks from recent sessions/events
    // Daily streak: consecutive days (by completion day) starting from the most recent completed session day
    const completedSessions = sessions.filter(s => s.completed && s.startedAt);
    let daily = 0;
    if (completedSessions.length > 0) {
      // We may not have completedAt in the session projection; use startedAt if missing (approximation)
      const days = completedSessions
        .map(s => ymdUTC((s as any).completedAt ?? s.startedAt))
        .filter(Boolean);
      // Count consecutive days from the most recent day backwards
      const set = new Set(days);
      // Find the most recent day in UTC among completed sessions
      const mostRecentTs = Math.max(...completedSessions.map(s => (s as any).completedAt ?? s.startedAt));
      let cursor = new Date(mostRecentTs);
      cursor.setUTCHours(0,0,0,0);
      while (true) {
        const key = `${cursor.getUTCFullYear()}-${cursor.getUTCMonth()+1}-${cursor.getUTCDate()}`;
        if (set.has(key)) {
          daily += 1;
          cursor.setUTCDate(cursor.getUTCDate() - 1);
        } else {
          break;
        }
      }
    }

    // Focus streak and No-Death streak: consecutive completed sessions (latest backwards) with no FocusLost / no Died events
    let focus = 0;
    let noDeath = 0;
    for (const s of sessions) {
      // Only consider completed sessions for streaks
      if (!s.completed) break;
      const evRes = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `SESSION#${s.sessionId}`,
          ':sk': 'EVT#',
        },
        ScanIndexForward: true,
        Limit: 100,
        ConsistentRead: true,
      }));
      const evts = (evRes.Items || []) as any[];
      const hadFocusLost = evts.some(e => e.type === 'FocusLost');
      const hadDied = evts.some(e => e.type === 'Died');
      if (!hadFocusLost) focus += 1; else break;
    }
    // For now, noDeath mirrors focus unless we start emitting Died
    noDeath = focus; // or recompute similarly using hadDied if you start sending Died events

    // Count total sessions for this user (paginated)
    let totalSessions = 0;
    let lek: any = undefined;
    do {
      const cRes = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'SESSION#' },
        Select: 'COUNT',
        ExclusiveStartKey: lek,
      }));
      totalSessions += cRes.Count || 0;
      lek = cRes.LastEvaluatedKey;
    } while (lek);

    const payload: any = {
      user: { isGuest, ...(claims.sub ? { userId: claims.sub } : {}) },
      streaks: { daily, focus, noDeath },
      totalSessions,
      recentSessions: sessions.slice(0, 5),
    };

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      },
      body: JSON.stringify(payload),
    };
  } catch (err: any) {
    console.error('getHome error', err);
    return {
      statusCode: 500,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      },
      body: JSON.stringify({ message: 'Internal error' }),
    };
  }
};
