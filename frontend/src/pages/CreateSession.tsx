import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STUDY_AREAS } from '../config/areas';

import type { SessionPlan } from '../local/data';

interface UiSegment { area: string; duration: number }

const MIN_DURATION_MIN = 5;
const MAX_DURATION_MIN = 120;
const MAX_BREAK_MIN = 15;

const MIN_DURATION_SEC = 5;
const MAX_DURATION_SEC = 1800; // 30 minutes upper bound for test mode
const MAX_BREAK_SEC = 600; // 10 minutes break max in test mode

const CreateSession: React.FC = () => {
  const navigate = useNavigate();
  const [testMode, setTestMode] = useState<boolean>(false);

  // Uniform break
  const [breakDurationMin, setBreakDurationMin] = useState<number>(5);
  const [breakDurationSec, setBreakDurationSec] = useState<number>(10);

  // Segments
  const [segments, setSegments] = useState<UiSegment[]>([
    { area: 'choralchambers', duration: testMode ? 60 : 30 },
    { area: 'farfields', duration: testMode ? 60 : 30 },
  ]);

  const areaOptions = useMemo(() => Object.values(STUDY_AREAS).map(a => ({ value: a.name, label: a.displayName })), []);


  const tooLongBreakMin = breakDurationMin > MAX_BREAK_MIN;
  const sillyMessage = !testMode && tooLongBreakMin ? `Seriously? ${breakDurationMin} min break? Get back to studying! (Max ${MAX_BREAK_MIN}m)` : '';

  const tooLongBreakSec = breakDurationSec > MAX_BREAK_SEC;

  const validSegments = segments.length >= 1 && segments.every(s => {
    const v = s.duration;
    if (testMode) return v >= MIN_DURATION_SEC && v <= MAX_DURATION_SEC;
    return v >= MIN_DURATION_MIN && v <= MAX_DURATION_MIN;
  });

  const canStart = validSegments && (!testMode ? !tooLongBreakMin : !tooLongBreakSec);

  const onStart = async () => {
    const plan: SessionPlan = {
      segments: segments.map(s => ({ area: s.area, durationSec: testMode ? s.duration : s.duration * 60 })),
      breakDurationSec: testMode ? Math.max(0, Math.floor(breakDurationSec)) : Math.max(0, Math.floor(breakDurationMin * 60)),
    };
    console.log('[create plan]', plan);
    try { localStorage.removeItem('studyTimerState'); } catch {}
    try { localStorage.setItem('sessionPlan', JSON.stringify(plan)); } catch {}

    // If authenticated and API configured, create a session in backend now
    try {
      const rawTok = localStorage.getItem('authTokens');
      const hasAuth = !!rawTok;
      const base = (window as any).API_BASE || undefined; // optional global
      if (hasAuth) {
        const mod = await import('../api');
        const res = await mod.createSession(plan);
        if (res?.sessionId) localStorage.setItem('currentSessionId', res.sessionId);
      }
    } catch (e) {
      console.warn('Backend create session failed or not authenticated; continuing local-only', e);
    }

    navigate('/study', { state: { plan } });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white bg-black font-trajan">
      <img
        src="/assets/ui/home_bg.jpg"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover opacity-50"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-xl mx-auto p-6 md:p-10">
        <button
          onClick={() => navigate('/')}
          className="mb-4 px-4 py-2 rounded-full bg-white/20 hover:bg-white/35 transition"
        >
          ← Home
        </button>

        <h1 className="text-3xl md:text-4xl mb-6 tracking-wide">Create Study Session</h1>

        <div className="space-y-6 bg-black/40 border border-white/15 rounded-xl p-6">
          {/* Test mode toggle */}
          <div className="flex items-center gap-2">
            <input id="test-mode" type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
            <label htmlFor="test-mode" className="opacity-90">Test mode (seconds)</label>
          </div>

          {/* Segments list */}
          <div className="space-y-3">
            <div className="opacity-80">Segments</div>
            {segments.map((seg, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={seg.area}
                  onChange={(e) => setSegments(prev => prev.map((s, i) => i === idx ? { ...s, area: e.target.value } : s))}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-md"
                >
                  {areaOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={testMode ? MIN_DURATION_SEC : MIN_DURATION_MIN}
                  max={testMode ? MAX_DURATION_SEC : MAX_DURATION_MIN}
                  value={seg.duration}
                  onChange={(e) => {
                    const v = Math.max(testMode ? MIN_DURATION_SEC : MIN_DURATION_MIN, Math.min(testMode ? MAX_DURATION_SEC : MAX_DURATION_MIN, Number(e.target.value)));
                    setSegments(prev => prev.map((s, i) => i === idx ? { ...s, duration: v } : s));
                  }}
                  className="w-28 px-3 py-2 bg-white/10 border border-white/20 rounded-md"
                />
                {segments.length > 1 && (
                  <button onClick={() => setSegments(prev => prev.filter((_, i) => i !== idx))} className="px-3 py-2 rounded bg-white/20 hover:bg-white/35">Remove</button>
                )}
              </div>
            ))}
            {segments.length < 5 && (
              <button onClick={() => setSegments(prev => [...prev, { area: areaOptions[0]?.value || 'choralchambers', duration: testMode ? 60 : 30 }])} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">+ Add segment</button>
            )}
          </div>

          {/* Break duration */}
          <div>
            <label className="block mb-2 opacity-80">Break Duration ({testMode ? 'seconds' : 'minutes'})</label>
            <input
              type="number"
              min={0}
              max={testMode ? MAX_BREAK_SEC : MAX_BREAK_MIN}
              value={testMode ? breakDurationSec : breakDurationMin}
              onChange={(e) => {
                const v = Math.max(0, Number(e.target.value));
                if (testMode) setBreakDurationSec(v); else setBreakDurationMin(v);
              }}
              className="w-32 px-3 py-2 bg-white/10 border border-white/20 rounded-md"
            />
            {!testMode && (tooLongBreakMin ? (
              <div className="text-sm text-red-300 mt-1">{sillyMessage}</div>
            ) : (
              <div className="text-sm opacity-70 mt-1">Max {MAX_BREAK_MIN} (we'll be nice)</div>
            ))}
            {testMode && (
              <div className="text-sm opacity-70 mt-1">Test mode — quick breaks up to {MAX_BREAK_SEC}s</div>
            )}
          </div>

          <div className="pt-2">
            <button
              disabled={!canStart}
              onClick={onStart}
              className="px-6 py-3 rounded-full bg-white/20 hover:bg-white/35 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Start Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSession;
