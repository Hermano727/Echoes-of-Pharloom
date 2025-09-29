import { v4 as uuidv4 } from 'uuid';

export type SessionEventType = 'SessionStarted' | 'FocusLost' | 'BreakReached' | 'SessionCompleted' | 'Died';
export type SessionEvent = { type: SessionEventType; ts: number };

export type Segment = { area: string; durationSec: number };

export type SessionPlan = {
  // New segmented model
  segments?: Segment[]; // if present, use this
  breakDurationSec?: number;

  // Legacy fields (backward compatibility)
  unit?: 'minutes' | 'seconds';
  totalDurationMin?: number;
  breakDurationMin?: number;
  totalDurationSec?: number;
  // breakDurationSec already above
  areas?: string[]; // legacy two-area model
};

export type StoredSession = {
  sessionId: string;
  startedAt: number; // epoch ms
  completedAt?: number; // epoch ms
  completed: boolean;
  plan: SessionPlan;
  events: SessionEvent[];
};

const KEY = 'eop.sessions.v1';

function readAll(): StoredSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as StoredSession[];
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

function writeAll(sessions: StoredSession[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch {}
}

export function startSession(plan: SessionPlan): { sessionId: string } {
  const sessions = readAll();
  const sessionId = uuidv4();
  sessions.push({ sessionId, startedAt: Date.now(), completed: false, plan, events: [{ type: 'SessionStarted', ts: Date.now() }] });
  writeAll(sessions);
  return { sessionId };
}

export function appendEvent(sessionId: string, event: SessionEvent) {
  const sessions = readAll();
  const s = sessions.find(x => x.sessionId === sessionId);
  if (!s) return;
  s.events.push(event);
  writeAll(sessions);
}

export function completeSession(sessionId: string, completed: boolean) {
  const sessions = readAll();
  const s = sessions.find(x => x.sessionId === sessionId);
  if (!s) return;
  s.completed = completed;
  s.completedAt = Date.now();
  s.events.push({ type: 'SessionCompleted', ts: s.completedAt });
  writeAll(sessions);
}

export function getRecentSessions(limit = 5): Array<{ sessionId: string; startedAt: string; durationMin: number; completed: boolean; areas: string[] }>{
  const sessions = readAll();
  const sorted = sessions
    .slice()
    .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))
    .slice(0, limit);
  return sorted.map(s => {
    let totalSec = 0;
    let areas: string[] = [];
    if (s.plan.segments && s.plan.segments.length > 0) {
      totalSec = s.plan.segments.reduce((acc, seg) => acc + Math.max(0, seg.durationSec || 0), 0);
      areas = s.plan.segments.map(seg => seg.area);
    } else {
      totalSec = (s.plan.totalDurationSec ?? (s.plan.totalDurationMin ?? 0) * 60) || 0;
      areas = s.plan.areas ?? [];
    }
    return {
      sessionId: s.sessionId,
      startedAt: new Date(s.startedAt).toISOString(),
      durationMin: Math.round(totalSec / 60),
      completed: s.completed,
      areas,
    };
  });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayMinus(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - days);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function computeStreaks(): { daily: number; focus: number; noDeath: number } {
  const sessions = readAll();
  const completed = sessions.filter(s => s.completed && s.completedAt);
  if (completed.length === 0) return { daily: 0, focus: 0, noDeath: 0 };

  // Daily streak: consecutive days ending today (or most recent day with a completion)
  const byDay = new Map<string, StoredSession[]>();
  for (const s of completed) {
    const d = new Date(s.completedAt!);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(s);
  }
  const today = new Date(); today.setHours(0,0,0,0);
  // find the most recent day with a completion (could be today or past)
  const daysKeys = Array.from(byDay.keys()).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
  const mostRecentDate = daysKeys.length > 0 ? new Date(daysKeys[0]) : today;
  let streak = 0;
  let cursor = new Date(mostRecentDate);
  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (byDay.has(key)) {
      streak += 1;
      cursor = dayMinus(cursor, 1);
    } else {
      break;
    }
  }

  // Focus streak: consecutive completed sessions (most recent backwards) with zero FocusLost events
  const sortedCompleted = completed.slice().sort((a,b) => (b.completedAt! - a.completedAt!));
  let focusStreak = 0;
  for (const s of sortedCompleted) {
    const lost = s.events.some(e => e.type === 'FocusLost');
    if (!lost) focusStreak += 1; else break;
  }

  // No-death streak: consecutive completed sessions without 'Died' event (currently same as focus if we never emit Died)
  let noDeathStreak = 0;
  for (const s of sortedCompleted) {
    const died = s.events.some(e => e.type === 'Died');
    if (!died) noDeathStreak += 1; else break;
  }

  return { daily: streak, focus: focusStreak, noDeath: noDeathStreak };
}