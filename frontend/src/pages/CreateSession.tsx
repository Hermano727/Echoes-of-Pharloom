import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STUDY_AREAS } from '../config/areas';
import HomeButton from '../components/HomeButton';
import FloatingFeedback from '../components/FloatingFeedback';
import FeedbackModal from '../components/FeedbackModal';

import type { SessionPlan } from '../local/data';

interface UiSegment { area: string; duration: number }

const MAX_DURATION_MIN = 120;
const MAX_BREAK_MIN = 15;

const MAX_DURATION_SEC = 1800; // 30 minutes upper bound for test mode
const MAX_BREAK_SEC = 600; // 10 minutes break max in test mode

const CreateSession: React.FC = () => {
  const navigate = useNavigate();
  const [testMode, setTestMode] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'feedback' | 'bug' | null>(null);
  const [randomize, setRandomize] = useState<boolean>(false);
  const [totalDuration, setTotalDuration] = useState<number>(60);
  const [segmentsCount, setSegmentsCount] = useState<number>(2);

  // Toggle test mode via '?' (Shift + /)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?') {
        e.preventDefault();
        setTestMode(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    if (testMode) return v >= 1 && v <= MAX_DURATION_SEC;
    return v >= 1 && v <= MAX_DURATION_MIN;
  });
  const hasInvalidSegments = !(segments.length >= 1 && segments.every(s => (testMode ? s.duration >= 1 : s.duration >= 1)));

  const canStart = validSegments && (!testMode ? !tooLongBreakMin : !tooLongBreakSec);

  const onStart = async () => {
    let plan: SessionPlan;

    if (randomize) {
      // Build randomized segments from available areas
      const areaKeys = Object.keys(STUDY_AREAS);
      const totalSec = testMode ? Math.max(1, Math.floor(totalDuration)) : Math.max(60, Math.floor(totalDuration * 60));
      const allowDupes = totalSec > 3600;
      const chosen: string[] = [];
      const pool = [...areaKeys];
      const pickUnique = () => {
        const i = Math.floor(Math.random() * pool.length);
        const a = pool.splice(i, 1)[0];
        chosen.push(a);
      };
      const pickAny = () => {
        const i = Math.floor(Math.random() * areaKeys.length);
        chosen.push(areaKeys[i]);
      };
      for (let i = 0; i < segmentsCount; i++) {
        if (!allowDupes) {
          if (pool.length === 0) break;
          pickUnique();
        } else {
          pickAny();
        }
      }
      const actualN = chosen.length || 1;
      const per = Math.floor(totalSec / actualN);
      const remainder = totalSec - per * actualN;
      const segs = chosen.map((a, idx) => ({ area: a, durationSec: per + (idx === actualN - 1 ? remainder : 0) }));
      plan = { segments: segs, breakDurationSec: testMode ? Math.max(0, Math.floor(breakDurationSec)) : Math.max(0, Math.floor(breakDurationMin * 60)) };
    } else {
      plan = {
        segments: segments.map(s => ({ area: s.area, durationSec: testMode ? s.duration : s.duration * 60 })),
        breakDurationSec: testMode ? Math.max(0, Math.floor(breakDurationSec)) : Math.max(0, Math.floor(breakDurationMin * 60)),
      };
    }
    console.log('[create plan]', plan);
    try { localStorage.removeItem('studyTimerState'); } catch {}
    try { localStorage.setItem('sessionPlan', JSON.stringify(plan)); } catch {}

    // If authenticated and API configured, create a session in backend now
    try {
      const rawTok = localStorage.getItem('authTokens');
      const hasAuth = !!rawTok;
      if (hasAuth) {
        const mod = await import('../api');
        const res = await mod.createSession(plan);
        if (res?.sessionId) localStorage.setItem('currentSessionId', res.sessionId);
      }
    } catch (e) {
      console.warn('Backend create session failed or not authenticated; continuing local-only', e);
    }

    try { localStorage.setItem('autostart', '1'); } catch {}
    navigate('/study', { state: { plan } });
  };

  return (
    <div className="relative w-screen min-h-screen overflow-y-auto text-white bg-black font-trajan">
      <img
        src="/assets/images/home_bg.jpg"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover opacity-65"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-xl mx-auto p-6 md:p-10">
        {/* Global Home button */}
        <HomeButton />

        <style>{`
          select option { background: #0b0b0b; color: #f1f1f1; }
        `}</style>

        <div className="space-y-6 bg-black/40 border border-white/15 rounded-xl p-6 mt-8">

          {/* Randomize session */}
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={randomize} onChange={(e) => setRandomize(e.target.checked)} />
              <span>Randomize areas</span>
            </label>
            <div className="text-xs italic opacity-80">This will create a session with length of your choice with randomized areas.</div>
            {randomize && (
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div>
                  <label className="block text-xs opacity-80 mb-1">Total length ({testMode ? 'seconds' : 'minutes'})</label>
                  <input type="number" className="w-full px-3 py-2 bg-black/50 text-white border border-white/25 rounded-md" value={totalDuration} onChange={(e)=> setTotalDuration(Math.max(1, Number(e.target.value)))} />
                </div>
                <div>
                  <label className="block text-xs opacity-80 mb-1">Number of segments</label>
                  <input type="number" className="w-full px-3 py-2 bg-black/50 text-white border border-white/25 rounded-md" value={segmentsCount} onChange={(e)=> setSegmentsCount(Math.max(1, Math.min(Object.keys(STUDY_AREAS).length, Number(e.target.value))))} />
                </div>
                <div className="col-span-2 text-xs opacity-80">
                  Length per segment: {(() => {
                    const totalSec = testMode ? Math.max(1, Math.floor(totalDuration)) : Math.max(60, Math.floor(totalDuration * 60));
                    const n = Math.max(1, segmentsCount);
                    const per = Math.floor(totalSec / n);
                    return testMode ? `${per} s` : `${Math.floor(per/60)} min ${per%60 ? `${per%60}s` : ''}`;
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Segments list */}
          {!randomize && (
          <div className="space-y-3">
            <div className="opacity-80">Segments</div>
            {segments.map((seg, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_96px_auto_auto] items-center gap-2">
                <select
                  value={seg.area}
                  onChange={(e) => setSegments(prev => prev.map((s, i) => i === idx ? { ...s, area: e.target.value } : s))}
                  className="px-3 py-2 bg-black/50 text-white border border-white/25 rounded-md focus:bg-black/70 focus:outline-none"
                >
                  {areaOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={seg.duration}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (/^0\d+$/.test(raw)) {
                      const normalized = String(parseInt(raw, 10));
                      (e.target as HTMLInputElement).value = normalized;
                    }
                    const v = Number((e.target as HTMLInputElement).value);
                    setSegments(prev => prev.map((s, i) => i === idx ? { ...s, duration: isNaN(v) ? 0 : v } : s));
                  }}
                  className="w-24 px-3 py-2 bg-black/50 text-white border border-white/25 rounded-md focus:bg-black/70 focus:outline-none"
                />
                <span className="opacity-80 w-10 text-center">{testMode ? 's' : 'min'}</span>
                {segments.length > 1 && (
                  <button
                    onClick={() => setSegments(prev => prev.filter((_, i) => i !== idx))}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                    aria-label="Remove segment"
                    title="Remove segment"
                  >
                    <img src="/assets/ui/trash.svg" alt="Remove" className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            {segments.length < 6 && (
              <button onClick={() => setSegments(prev => [...prev, { area: areaOptions[0]?.value || 'choralchambers', duration: testMode ? 60 : 30 }])} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">+ Add segment</button>
            )}
          </div>
          )}

          {/* Global validation warning (if any) */}
          {hasInvalidSegments && (
            <div className="text-sm text-red-300">Warning! Improper session found — each segment must be at least {testMode ? '1 second' : '1 minute'}.</div>
          )}

          {/* Break duration */}
          <div>
            <label className="block mb-2 opacity-80">Break Duration ({testMode ? 'seconds' : 'minutes'})</label>
            <input
              type="number"
              min={testMode ? 0 : 1}
              max={testMode ? MAX_BREAK_SEC : MAX_BREAK_MIN}
              value={testMode ? breakDurationSec : breakDurationMin}
              onChange={(e) => {
                const minVal = testMode ? 0 : 1;
                const v = Math.max(minVal, Number(e.target.value));
                if (testMode) setBreakDurationSec(v); else setBreakDurationMin(v);
              }}
              className="w-32 px-3 py-2 bg-white/10 border border-white/20 rounded-md"
            />
            {!testMode && tooLongBreakMin && (
              <div className="text-sm text-red-300 mt-1">{sillyMessage}</div>
            )}
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

        {testMode && (
          <div className="mt-2 ml-1 text-xs tracking-wide text-amber-200/90">Test Mode</div>
        )}

        <FloatingFeedback onOpen={(t) => { setModalType(t); setModalOpen(true); }} />
        <FeedbackModal open={modalOpen} type={modalType} onClose={() => setModalOpen(false)} />
      </div>
    </div>
  );
};

export default CreateSession;
