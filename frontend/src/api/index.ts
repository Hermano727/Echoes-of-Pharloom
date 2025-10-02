import { API_BASE } from "../config/api";
import { computeStreaks, getRecentSessions } from "../local/data";

function getIdToken(): string | null {
  try {
    const raw = localStorage.getItem('authTokens');
    if (!raw) return null;
    const t = JSON.parse(raw);
    return t?.id_token || null;
  } catch { return null; }
}

async function apiFetch(path: string, opts: RequestInit = {}, authOptional = true) {
  if (!API_BASE) throw new Error('API not configured');
  const headers = new Headers(opts.headers || {});
  const idToken = getIdToken();
  if (idToken) headers.set('Authorization', `Bearer ${idToken}`);
  else if (!authOptional) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${path} failed: ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export async function fetchAreas(): Promise<{ areas: { id: string; name: string }[] }> {
  if (!API_BASE) {
    return {
      areas: [
        { id: "bonebottom", name: "Bonebottom" },
        { id: "far-fields", name: "Far Fields" },
        { id: "hunters-path", name: "Hunter's Path" },
      ],
    };
  }
  return apiFetch('/areas');
}

export async function fetchHome(): Promise<{
  user: { isGuest: boolean; userId?: string };
  streaks: { daily: number; focus: number; noDeath: number };
  recentSessions: any[];
}> {
  if (!API_BASE) {
    return {
      user: { isGuest: true },
      streaks: computeStreaks(),
      recentSessions: getRecentSessions(5),
    };
  }
  // After we secure /home, this will include Authorization. For now, it's fine either way.
  return apiFetch('/home', {}, true);
}

export async function createSession(plan: any): Promise<{ sessionId: string; startedAt?: number }>{
  if (!API_BASE) throw new Error('API not configured');
  return apiFetch('/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan }) }, false);
}

export async function appendEvent(sessionId: string, type: string, data?: any): Promise<any> {
  if (!API_BASE) throw new Error('API not configured');
  return apiFetch(`/sessions/${sessionId}/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type, data }) }, false);
}
