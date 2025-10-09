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
  // Daily streak uses completed sessions only (no time minimum). Focus can be based on reaching break.
  const completed = sessions.filter(s => s.completed && s.completedAt);
  // Build day-key map with epoch midnight keys to avoid parsing issues
  const byDay = new Map<number, number>();
  for (const s of completed) {
    const d = new Date(s.completedAt!);
    const k = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    byDay.set(k, (byDay.get(k) || 0) + 1);
  }
  let daily = 0;
  if (byDay.size > 0) {
    const today = new Date();
    const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    // Find most recent day key with completions (could be today or earlier)
    const keys = Array.from(byDay.keys()).sort((a, b) => b - a);
    let cursor = keys[0];
    while (byDay.has(cursor)) {
      daily += 1;
      cursor = cursor - 24 * 60 * 60 * 1000;
    }
  }

  // Focus streak: consecutive sessions (most recent backwards) where:
  // - Either BreakReached occurred, or session completed, and
  // - No FocusLost occurred.
  // Sort by the most relevant timestamp: BreakReached ts if present, otherwise completedAt.
  type WithFocusKey = { keyTs: number; s: StoredSession };
  const withFocusCandidates: WithFocusKey[] = sessions
    .map(s => {
      const breakEvt = s.events.slice().reverse().find(e => e.type === 'BreakReached');
      const keyTs = breakEvt?.ts || s.completedAt || 0;
      return { keyTs, s } as WithFocusKey;
    })
    .filter(x => x.keyTs > 0)
    .sort((a, b) => b.keyTs - a.keyTs);

  let focus = 0;
  for (const { s } of withFocusCandidates) {
    const lost = s.events.some(e => e.type === 'FocusLost');
    if (!lost) focus += 1; else break;
  }

  // No-death streak: consecutive sessions without 'Died' event, ordered by completedAt (fall back to startedAt)
  const completedOrRecent = sessions
    .map(s => ({ ts: s.completedAt || s.startedAt, s }))
    .sort((a, b) => b.ts - a.ts)
    .map(x => x.s);
  let noDeath = 0;
  for (const s of completedOrRecent) {
    const died = s.events.some(e => e.type === 'Died');
    if (!died) noDeath += 1; else break;
  }

  return { daily, focus, noDeath };
}
