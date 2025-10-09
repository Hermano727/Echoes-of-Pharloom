import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAreas, fetchHome } from '../api';
import { useAuth } from '../auth/AuthContext';
import FloatingFeedback from '../components/FloatingFeedback';
import FeedbackModal from '../components/FeedbackModal';

interface Area { id: string; name: string }

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signIn, signOut } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'feedback' | 'bug' | null>(null);
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
        src="/assets/images/home_bg.jpg"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center p-6 text-center">
        {/* Profile top-right */}
        <div className="absolute top-4 right-4">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/15 hover:bg-white/30 transition-colors"
                aria-label="Account"
                title="Account"
              >
                {(() => { try { const p = localStorage.getItem('profilePhoto'); if (p) return <img src={p} alt="Avatar" className="w-7 h-7 rounded-full object-cover" /> } catch {} return <div className="w-7 h-7 rounded-full bg-white/30 text-black flex items-center justify-center text-sm">{(user?.name||user?.email||'U').slice(0,1).toUpperCase()}</div>; })()}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg bg-black/80 border border-white/15 shadow-lg overflow-hidden">
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                    className="w-full text-left px-4 py-2 hover:bg-white/10"
                  >My profile</button>
                  <button
                    onClick={() => { setMenuOpen(false); signOut(); }}
                    className="w-full text-left px-4 py-2 hover:bg-white/10"
                  >Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={signIn} className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/30 transition-colors">Sign in</button>
          )}
        </div>

        {/* Title image at top (replaces text). Taller asset, shift up slightly and add spacing below */}
        <img
          src="/assets/ui/pharloom_study.png"
          alt="Echoes of Pharloom"
          className="w-[68%] max-w-[860px] mb-8 -mt-8 select-none pointer-events-none opacity-85"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />

        {/* Main menu */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <button
            onClick={() => {
              try {
                // Default quick plan: 30m Bonebottom, 5m break, 30m Bonebottom
                const plan = { segments: [ { area: 'bonebottom', durationSec: 1800 }, { area: 'bonebottom', durationSec: 1800 } ], breakDurationSec: 300 };
                localStorage.setItem('sessionPlan', JSON.stringify(plan));
                localStorage.setItem('autostart', '1');
                localStorage.removeItem('studyTimerState');
              } catch {}
              navigate('/study');
            }}
className="px-10 py-3 rounded-full bg-white/15 hover:bg-white/30 transition-colors text-lg soft-glow transform hover:scale-[1.04]"
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Quick Start'}
          </button>
          <button
            onClick={() => { if (isAuthenticated) navigate('/create'); else signIn(); }}
className="px-10 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-lg soft-glow transform hover:scale-[1.04]"
          >
            Create Session
          </button>
          <button
            onClick={() => navigate('/info')}
className="px-10 py-2 rounded-full bg-white/5 hover:bg-white/15 transition-colors text-sm opacity-90 transform hover:scale-[1.03]"
          >
            Info
          </button>
        </div>

        {/* Optional streaks summary below menu */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 w-full max-w-2xl opacity-95">
          <div className="rounded-xl bg-white/10 border border-white/15 p-4 hover:bg-white/15 transition-transform hover:scale-[1.02]">
            <div className="text-sm opacity-80">Daily Streak</div>
            <div className="text-3xl mt-1 drop-shadow-md">{streaks.daily}</div>
          </div>
          <div className="rounded-xl bg-white/10 border border-white/15 p-4 hover:bg-white/15 transition-transform hover:scale-[1.02]">
            <div className="text-sm opacity-80">Focus Streak</div>
            <div className="text-3xl mt-1 drop-shadow-md">{streaks.focus}</div>
          </div>
          <div className="rounded-xl bg-white/10 border border-white/15 p-4 hover:bg-white/15 transition-transform hover:scale-[1.02]">
            <div className="text-sm opacity-80">Total Sessions</div>
            <div className="text-3xl mt-1 drop-shadow-md">{streaks.noDeath}</div>
          </div>
        </div>

        {error && <div className="mb-4 text-red-300">{error}</div>}

        <FloatingFeedback onOpen={(t) => { setModalType(t); setModalOpen(true); }} />
        <FeedbackModal open={modalOpen} type={modalType} onClose={() => setModalOpen(false)} />
      </div>
    </div>
  );
};

export default Home;
