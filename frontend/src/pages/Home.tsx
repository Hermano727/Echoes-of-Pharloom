import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAreas, fetchHome } from '../api';
import { useAuth } from '../auth/AuthContext';

interface Area { id: string; name: string }

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signIn, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [streaks, setStreaks] = useState<{ daily: number; focus: number; noDeath: number }>({ daily: 0, focus: 0, noDeath: 0 });
  const [recentSessions, setRecentSessions] = useState<Array<{ sessionId: string; startedAt: string; durationMin: number; completed: boolean; areas: string[] }>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [areasRes, homeRes] = await Promise.all([fetchAreas(), fetchHome()]);
        if (!mounted) return;
        setAreas(areasRes.areas || []);
        setStreaks(homeRes.streaks || { daily: 0, focus: 0, noDeath: 0 });
        setRecentSessions(homeRes.recentSessions || []);
      } catch (e) {
        console.error(e);
        if (mounted) setError('Failed to load home data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white bg-black font-trajan">
      <img
        src="/assets/ui/home_bg.jpg"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center p-6 text-center">
        {/* Auth action top-right */}
        <div className="absolute top-4 right-4">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/20 hover:bg-white/35 transition-colors"
              >
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/80 text-black font-semibold">
                  {user?.name?.[0]?.toUpperCase() || user?.id?.[0]?.toUpperCase() || 'U'}
                </span>
                <span className="hidden sm:block">{user?.name || 'Account'}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-lg bg-black/80 border border-white/15 shadow-lg overflow-hidden">
                  <button
                    onClick={() => { setMenuOpen(false); signOut(); }}
                    className="w-full text-left px-4 py-2 hover:bg-white/10"
                  >Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={signIn} className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/35 transition-colors">Sign in</button>
          )}
        </div>
        <h1 className="text-4xl md:text-6xl mb-6 tracking-wide">Echoes of Pharloom</h1>
        <p className="text-lg md:text-xl mb-6 opacity-90 max-w-2xl">
          A Silksong-inspired focus timer with ambient zones and music.
        </p>

        {/* Streaks summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 w-full max-w-2xl">
          <div className="rounded-xl bg-white/10 border border-white/15 p-4">
            <div className="text-sm opacity-80">Daily Streak</div>
            <div className="text-3xl mt-1">{streaks.daily}</div>
          </div>
          <div className="rounded-xl bg-white/10 border border-white/15 p-4">
            <div className="text-sm opacity-80">Focus Streak</div>
            <div className="text-3xl mt-1">{streaks.focus}</div>
          </div>
          <div className="rounded-xl bg-white/10 border border-white/15 p-4">
            <div className="text-sm opacity-80">No-Death Streak</div>
            <div className="text-3xl mt-1">{streaks.noDeath}</div>
          </div>
        </div>

        {error && <div className="mb-4 text-red-300">{error}</div>}

        <div className="flex gap-4">
          <button
            onClick={() => { try { localStorage.removeItem('studyTimerState'); localStorage.removeItem('sessionPlan'); } catch {}; navigate('/study'); }}
            className="px-6 py-3 rounded-full bg-white/20 hover:bg-white/35 transition-colors"
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Start Focus Session'}
          </button>
          <button
            onClick={() => navigate('/create')}
            className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            Create Session
          </button>
          <button
            onClick={() => navigate('/settings', { replace: false })}
            className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            Settings (soon)
          </button>
        </div>

        {/* Areas quick view */}
        {areas.length > 0 && (
          <div className="mt-8 text-sm opacity-90">
            Available areas: {areas.map(a => a.name).join(', ')}
          </div>
        )}

        {/* Recent sessions (mocked while backend is pending) */}
        {recentSessions.length > 0 && (
          <div className="mt-6 w-full max-w-2xl text-left">
            <h2 className="text-xl mb-2 tracking-wide">Recent Sessions</h2>
            <ul className="space-y-2">
              {recentSessions.map(s => (
                <li key={s.sessionId} className="flex justify-between items-center bg-white/10 border border-white/15 rounded-lg p-3">
                  <div>
                    <div className="text-sm opacity-80">{new Date(s.startedAt).toLocaleString()}</div>
                    <div className="text-sm">{s.durationMin} min • {s.areas.join(' → ')}</div>
                  </div>
                  <div className={`text-sm px-3 py-1 rounded-full ${s.completed ? 'bg-green-700/60' : 'bg-red-700/60'}`}>{s.completed ? 'Completed' : 'Incomplete'}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
