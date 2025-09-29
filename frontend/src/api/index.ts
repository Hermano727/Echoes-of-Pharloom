import { API_BASE } from "../config/api";
import { computeStreaks, getRecentSessions } from "../local/data";

export async function fetchAreas(): Promise<{ areas: { id: string; name: string }[] }> {
  // Fallback for local dev if API_BASE is not set yet
  if (!API_BASE) {
    return {
      areas: [
        { id: "bonebottom", name: "Bonebottom" },
        { id: "far-fields", name: "Far Fields" },
        { id: "hunters-path", name: "Hunter's Path" },
      ],
    };
  }
  const res = await fetch(`${API_BASE}/areas`);
  if (!res.ok) throw new Error("Failed to fetch areas");
  return res.json();
}

export async function fetchHome(): Promise<{
  user: { isGuest: boolean; userId?: string };
  streaks: { daily: number; focus: number; noDeath: number };
  recentSessions: any[];
}> {
  if (!API_BASE) {
    // Use local data engine in dev when API is not configured
    return {
      user: { isGuest: true },
      streaks: computeStreaks(),
      recentSessions: getRecentSessions(5),
    };
  }
  const res = await fetch(`${API_BASE}/home`);
  if (!res.ok) throw new Error("Failed to fetch home");
  return res.json();
}
