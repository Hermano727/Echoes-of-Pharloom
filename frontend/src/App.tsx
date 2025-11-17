import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TimerControls from "./components/TimerControls";
import BottomCredits from "./components/BottomCredits";
import { STUDY_AREAS, getAreaByName } from "./config/areas";
import { AudioManager, AudioState } from "./utils/audioManager";
import { VideoManager, VideoState } from "./utils/videoManager";
import { DEFAULT_TIMER_CONFIG, formatTime } from "./utils/timerUtils";
import { startSession, appendEvent as appendLocalEvent, completeSession } from './local/data';
import type { SessionPlan } from './local/data';
import { API_BASE } from './config/api';
import { useAuth } from './auth/AuthContext';
import FeedbackModal from './components/FeedbackModal';


interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  selectedAreaName: string;
}

type ActionOverlayType = 'play' | 'pause' | 'expand' | 'collapse' | 'mute' | 'unmute' | 'reset' | null;

// Helper: fullscreen utils
const requestFullscreen = async (el: HTMLElement) => {
  const anyEl = el as any;
  if (el.requestFullscreen) return el.requestFullscreen();
  if (anyEl.webkitRequestFullscreen) return anyEl.webkitRequestFullscreen();
  if (anyEl.msRequestFullscreen) return anyEl.msRequestFullscreen();
};

const exitFullscreen = async () => {
  const doc: any = document;
  if (document.exitFullscreen) return document.exitFullscreen();
  if (doc.webkitExitFullscreen) return doc.webkitExitFullscreen();
  if (doc.msExitFullscreen) return doc.msExitFullscreen();
};

const getStoredTimerState = (): TimerState | null => {
  try {
    const storedState = localStorage.getItem('studyTimerState'); 
    if (storedState) {
      return JSON.parse(storedState);
    }
  } catch (e) {
    console.error("Failed to parse stored timer state:", e);
  }
  return null;
};

const saveTimerState = (state: TimerState) => {
  try {
    localStorage.setItem('studyTimerState', JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save timer state to localStorage:", e);
  }
};

const App: React.FC = () => {
  // Read pending session plan synchronously (if coming from /create)
  const location = useLocation() as any;
  const bootPlanRef = useRef<SessionPlan | null>(null);
  if (bootPlanRef.current === null) {
    try {
      if (location && location.state && location.state.plan) {
        bootPlanRef.current = location.state.plan as SessionPlan;
      } else {
        const raw = localStorage.getItem('sessionPlan');
        if (raw) bootPlanRef.current = JSON.parse(raw) as SessionPlan;
      }
    } catch { bootPlanRef.current = null; }
  }

  // Seed refs early so initializer can access them safely
  const segmentsRef = useRef<{ area: string; durationSec: number }[]>([]);
  const breakDurationRef = useRef<number>(0);
  const lastPlanRef = useRef<SessionPlan | null>(null);

  const computeSeconds = (plan: SessionPlan | null): number | null => {
    if (!plan) return null;
    // Segmented plan total
    if (Array.isArray((plan as any).segments) && (plan as any).segments.length > 0) {
      const segs = (plan as any).segments as { durationSec: number }[];
      const total = segs.reduce((acc, s) => acc + Math.max(0, Math.floor(s.durationSec || 0)), 0);
      return total > 0 ? total : null;
    }
    // Legacy totals
    if (typeof plan.totalDurationSec === 'number') return Math.max(1, Math.floor(plan.totalDurationSec));
    if (typeof plan.totalDurationMin === 'number') return Math.max(60, Math.floor(plan.totalDurationMin * 60));
    return null;
  };
  const initialArea = (() => {
    const p = bootPlanRef.current as any;
    if (p && Array.isArray(p.segments) && p.segments.length > 0) return p.segments[0].area;
    if (bootPlanRef.current && Array.isArray((bootPlanRef.current as any).areas) && (bootPlanRef.current as any).areas.length > 0) return (bootPlanRef.current as any).areas[0];
    return 'choralchambers';
  })();

  const [timerState, setTimerState] = useState<TimerState>(() => {
    // If a boot plan exists with segments, set refs and start at first segment duration
    const p = bootPlanRef.current as any;
    if (p && Array.isArray(p.segments) && p.segments.length > 0) {
      const segs = p.segments as { area: string; durationSec: number }[];
      // seed refs for first render so Start uses correct plan immediately
      segmentsRef.current = segs.map(s => ({ area: s.area, durationSec: Math.max(1, Math.floor(s.durationSec || 0)) }));
      breakDurationRef.current = Math.max(0, Math.floor(p.breakDurationSec || 0));
      lastPlanRef.current = p as SessionPlan;
      return {
        timeLeft: Math.max(1, Math.floor(segs[0].durationSec || 0)),
        isRunning: false,
        selectedAreaName: segs[0].area || initialArea,
      };
    }

    const sec = computeSeconds(bootPlanRef.current);
    if (sec !== null) {
      return {
        timeLeft: sec,
        isRunning: false,
        selectedAreaName: initialArea,
      };
    }

    const storedState = getStoredTimerState();
    if (storedState) return storedState;
    return {
      timeLeft: DEFAULT_TIMER_CONFIG.defaultDuration,
      isRunning: false,
      selectedAreaName: initialArea,
    };
  });

  const [audioState, setAudioState] = useState<AudioState>({
    isLoaded: false,
    isPlaying: false,
    error: null,
    volume: 0.05, // actual output volume
    currentTime: 0,
    duration: 0,
  });
  // UI volume separate from actual output (we apply a 0.5 gain curve)
  const [uiVolume, setUiVolume] = useState<number>(0.1); // 10% UI -> 5% output
  const lastNonZeroVolumeRef = useRef<number>(0.1);

  const [videoState, setVideoState] = useState<VideoState>({
    isLoaded: false,
    isPlaying: false,
    error: null,
  });
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const { isAuthenticated, signIn, user } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const hideTimeoutRef = useRef<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [minuteFlash, setMinuteFlash] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const wasRunningBeforeResetRef = useRef<boolean>(false);

  // Study phases and break state
  type Phase = 'running' | 'break' | 'completed';
  const [phase, setPhase] = useState<Phase>('running');
  const [breakRemaining, setBreakRemaining] = useState<number>(0);
  const [segmentIndex, setSegmentIndex] = useState<number>(0);
  // segmentsRef, breakDurationRef, lastPlanRef declared earlier for initializer
  const [segmentRemaining, setSegmentRemaining] = useState<number>(0);

  const initializeFromPlan = useCallback((plan: SessionPlan) => {
    // Convert legacy plan to segments if needed
    let normalized: SessionPlan = plan;
    if ((!plan.segments || plan.segments.length === 0) && (plan.totalDurationSec || plan.totalDurationMin)) {
      const total = typeof plan.totalDurationSec === 'number'
        ? Math.max(1, Math.floor(plan.totalDurationSec))
        : Math.max(60, Math.floor((plan.totalDurationMin ?? DEFAULT_TIMER_CONFIG.defaultDuration / 60) * 60));
      const areas = (plan.areas && plan.areas.length > 0) ? plan.areas : [timerState.selectedAreaName];
      const per = Math.floor(total / Math.max(1, areas.length));
      const segments = areas.map(a => ({ area: a, durationSec: per }));
      const remainder = total - per * areas.length;
      if (segments.length > 0) segments[segments.length - 1].durationSec += remainder;
      normalized = { segments, breakDurationSec: plan.breakDurationSec ?? Math.floor((plan.breakDurationMin ?? 0) * 60) } as SessionPlan;
    }
    console.log('[init] plan', normalized);
    lastPlanRef.current = normalized;
    try { localStorage.setItem('activePlan', JSON.stringify(normalized)); } catch {}
    // Build segments from plan.segments or legacy
    let segments: { area: string; durationSec: number }[] = [];
    if (plan.segments && plan.segments.length > 0) {
      segments = plan.segments.map(s => ({ area: s.area, durationSec: Math.max(1, Math.floor(s.durationSec)) }));
    } else {
      const total = typeof plan.totalDurationSec === 'number'
        ? Math.max(1, Math.floor(plan.totalDurationSec))
        : Math.max(60, Math.floor((plan.totalDurationMin ?? DEFAULT_TIMER_CONFIG.defaultDuration / 60) * 60));
      const areas = (plan.areas && plan.areas.length > 0) ? plan.areas : [timerState.selectedAreaName];
      const per = Math.floor(total / Math.max(1, areas.length));
      segments = areas.map(a => ({ area: a, durationSec: per }));
      // adjust last segment to absorb remainder
      const remainder = total - per * areas.length;
      if (segments.length > 0) segments[segments.length - 1].durationSec += remainder;
    }

    const breakSec = typeof plan.breakDurationSec === 'number'
      ? Math.max(0, Math.floor(plan.breakDurationSec))
      : Math.max(0, Math.floor((plan.breakDurationMin ?? (DEFAULT_TIMER_CONFIG.breakDuration ?? 300) / 60) * 60));

    segmentsRef.current = segments;
    breakDurationRef.current = breakSec;

    setSegmentIndex(0);
    setPhase('running');
    setBreakRemaining(0);
    setSegmentRemaining(segments[0]?.durationSec ?? 0);
    setTimerState(prev => ({
      ...prev,
      timeLeft: segments[0]?.durationSec ?? prev.timeLeft,
      selectedAreaName: segments[0]?.area ?? prev.selectedAreaName,
      isRunning: false,
    }));
    try { localStorage.removeItem('studyTimerState'); } catch {}
  }, [timerState.selectedAreaName]);

  // transient center-screen indicator for actions (YouTube-like)
  const [actionOverlay, setActionOverlay] = useState<ActionOverlayType>(null);
  const [showActionOverlay, setShowActionOverlay] = useState(false);
  const actionTimeoutRef = useRef<number | null>(null);

  // root container ref (for fullscreen)
  const rootRef = useRef<HTMLDivElement | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const audioManagerRef = useRef<AudioManager | null>(null);
  const videoManagerRef = useRef<VideoManager | null>(null);
  const ctrlPressRef = useRef<number[]>([]);

  useEffect(() => {
    if (audioRef.current && !audioManagerRef.current) {
      audioManagerRef.current = new AudioManager(audioRef.current, setAudioState);
      // apply initial UI volume mapping to actual output
      try { audioManagerRef.current.setVolume(uiVolume * 0.5); } catch {}
    }
    if (videoRef.current && !videoManagerRef.current) {
      videoManagerRef.current = new VideoManager(videoRef.current, setVideoState);
    }
  }, [uiVolume]);

  // Apply session plan from localStorage if present
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    try {
      let plan: SessionPlan | null = null;
      if (bootPlanRef.current) {
        console.log('[boot] using plan from bootPlanRef (state or localStorage)');
        plan = bootPlanRef.current;
      }
      // If still null, try localStorage directly (in case boot ref missed)
      if (!plan) {
        try {
          const raw = localStorage.getItem('sessionPlan');
          if (raw) plan = JSON.parse(raw) as SessionPlan;
        } catch {}
      }
      // If still null, build minimal fallback once
      if (!plan) {
        console.log('[boot] building fallback plan from current UI');
        plan = { segments: [{ area: timerState.selectedAreaName, durationSec: timerState.timeLeft }], breakDurationSec: DEFAULT_TIMER_CONFIG.breakDuration ?? 300 } as SessionPlan;
      }
      initializeFromPlan(plan);
      try { localStorage.removeItem('sessionPlan'); } catch {}
      didInitRef.current = true;
    } catch (e) {
      console.warn('init failed', e);
    }
  }, [initializeFromPlan, timerState.selectedAreaName, timerState.timeLeft]);

  // cleanup for transient overlay timeout on unmount
  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) {
        window.clearTimeout(actionTimeoutRef.current);
      }
    };
  }, []);


  useEffect(() => {
    const currentArea = getAreaByName(timerState.selectedAreaName);
    if (currentArea) {
      audioManagerRef.current?.loadArea(currentArea);
      videoManagerRef.current?.load(currentArea.videoPath);
    }
  }, [timerState.selectedAreaName]);

  // Persist the whole timer state whenever it changes
  useEffect(() => {
    saveTimerState(timerState);
  }, [timerState]);

  // Handle ticking logic separately to satisfy eslint hook rules
  useEffect(() => {
    if (timerState.isRunning) {
      intervalRef.current = setInterval(() => {
        if (phase === 'running') {
          setSegmentRemaining(prev => {
            if (prev <= 1) {
              const nextIdx = segmentIndex + 1;
              const hasNext = nextIdx < segmentsRef.current.length;
              if (hasNext) {
                if (breakDurationRef.current > 0) {
                  console.log('[segment end] idx', segmentIndex, '-> break', breakDurationRef.current);
                  audioManagerRef.current?.pause();
                  videoManagerRef.current?.pause();
                  setPhase('break');
                  setBreakRemaining(breakDurationRef.current);
                  try { if (sessionIdRef.current) appendLocalEvent(sessionIdRef.current, { type: 'BreakReached', ts: Date.now() }); } catch {}
                  try { new Audio('/assets/sounds/break_start.mp3').play().catch(() => {}); } catch {}
                  // Keep isRunning=true so break autoplay countdown proceeds
                  setTimerState(p => ({ ...p, isRunning: true, timeLeft: breakDurationRef.current }));
                  return 0;
                } else {
                  console.log('[segment switch] immediate to idx', nextIdx);
                  setSegmentIndex(nextIdx);
                  const seg = segmentsRef.current[nextIdx];
                  // Prefer crossfade but ensure playback with fallback retry
                  const areaCfg = STUDY_AREAS[seg.area];
                  if (areaCfg && audioManagerRef.current) {
                    audioManagerRef.current.crossfadeTo({ name: areaCfg.name, displayName: areaCfg.displayName, audioPath: areaCfg.audioPath }).catch(() => {
                      audioManagerRef.current?.loadAndPlayArea({ name: areaCfg.name, displayName: areaCfg.displayName, audioPath: areaCfg.audioPath }).catch(() => {});
                    });
                    setTimeout(() => { audioManagerRef.current?.play().catch(() => {}); }, 600);
                  }
                  setNowPlaying(areaCfg?.displayName || seg.area);
                  scheduleHideNowPlaying();
                  setSegmentRemaining(seg.durationSec);
                  setTimerState(p => ({ ...p, selectedAreaName: seg.area, timeLeft: seg.durationSec }));
                  return seg.durationSec;
                }
              } else {
                console.log('[complete]');
                if (intervalRef.current) clearInterval(intervalRef.current);
                try { if (sessionIdRef.current) { completeSession(sessionIdRef.current, true); } } catch {}
                try { sendEvent('Completed').catch(() => {}); } catch {}
                sessionIdRef.current = null;
                audioManagerRef.current?.pause();
                videoManagerRef.current?.pause();
                try { new Audio('/assets/sounds/session_complete.mp3').play().catch(() => {}); } catch {}
                setPhase('completed');
                setCompleteBanner(true);
                setTimeout(() => setCompleteBanner(false), 1800);
                setTimerState(p => ({ ...p, timeLeft: 0, isRunning: false }));
                return 0;
              }
            }
            setTimerState(p => ({ ...p, timeLeft: prev - 1 }));
            return prev - 1;
          });
        } else if (phase === 'break') {
          setBreakRemaining(prev => {
            if (prev <= 1) {
              const nextIdx = segmentIndex + 1;
              if (nextIdx < segmentsRef.current.length) {
                setSegmentIndex(nextIdx);
                const seg = segmentsRef.current[nextIdx];
                console.log('[break end] -> start segment idx', nextIdx, seg);
                startSegment(seg);
                return 0;
              } else {
                setPhase('completed');
                return 0;
              }
            }
            setTimerState(p => ({ ...p, timeLeft: prev - 1 }));
            return prev - 1;
          });
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerState.isRunning, phase]);

  const triggerActionOverlay = useCallback((type: ActionOverlayType) => {
    if (!type) return;
    setActionOverlay(type);
    setShowActionOverlay(true);
    if (actionTimeoutRef.current) {
      window.clearTimeout(actionTimeoutRef.current);
    }
    actionTimeoutRef.current = window.setTimeout(() => {
      setShowActionOverlay(false);
    }, 650);
  }, []);

  // Session/event engine wiring
  const sessionIdRef = useRef<string | null>(null); // local-only session id
  const backendSessionIdRef = useRef<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [completeBanner, setCompleteBanner] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'feedback' | 'bug' | null>(null);
  const addToast = useCallback((text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(t => [...t, { id, text }]);
    window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2400);
  }, []);

  const waitForIdToken = useCallback(async (timeoutMs = 1500): Promise<string | null> => {
    const start = Date.now();
    const read = () => {
      try {
        const raw = localStorage.getItem('authTokens');
        if (!raw) return null;
        const t = JSON.parse(raw);
        return t?.id_token || null;
      } catch { return null; }
    };
    let tok = read();
    while (!tok && Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 150));
      tok = read();
    }
    return tok;
  }, []);

  const ensureBackendSession = useCallback(async (plan: SessionPlan) => {
    if (!API_BASE) return null;
    if (backendSessionIdRef.current) return backendSessionIdRef.current;
    // pick up any pre-created session id from Create page
    try {
      const cached = localStorage.getItem('currentSessionId');
      if (cached) {
        backendSessionIdRef.current = cached;
        return cached;
      }
    } catch {}
    const tok = await waitForIdToken();
    if (!tok) return null;
    try {
      const api = await import('./api');
      const res = await api.createSession(plan);
      if (res?.sessionId) {
        backendSessionIdRef.current = res.sessionId;
        try { localStorage.setItem('currentSessionId', res.sessionId); } catch {}
        return res.sessionId;
      }
    } catch (e) {
      console.warn('Failed to create backend session', e);
    }
    return null;
  }, [waitForIdToken]);

  const sendEvent = useCallback(async (type: string, data?: any) => {
    try {
      if (sessionIdRef.current) appendLocalEvent(sessionIdRef.current, { type: type as any, ts: Date.now() });
    } catch {}
    if (!API_BASE) return;
    // try send to backend
    try {
      const tok = await waitForIdToken();
      if (!tok) return;
      const backendId = backendSessionIdRef.current || undefined;
      if (!backendId) return;
      const api = await import('./api');
      await api.appendEvent(backendId, type, data);
    } catch (e) {
      console.warn('appendEvent (backend) failed', e);
    }
  }, [waitForIdToken]);

  const onStart = useCallback(async () => {
    // If session previously completed, fully re-initialize from last plan
    if (phase === 'completed' && lastPlanRef.current) {
      initializeFromPlan(lastPlanRef.current);
      // reset media to ensure fresh start
      audioManagerRef.current?.reset();
      videoManagerRef.current?.reset();
      setTimeout(async () => {
        // new local session
        try {
          const { sessionId } = startSession(lastPlanRef.current!);
          sessionIdRef.current = sessionId;
        } catch {}
        // ensure backend session too if possible
        try { await ensureBackendSession(lastPlanRef.current!); } catch {}
        setTimerState(prev => ({ ...prev, isRunning: true }));
        audioManagerRef.current?.play().catch(() => {});
        videoManagerRef.current?.play().catch(() => {});
      }, 100);
      triggerActionOverlay('play');
      return;
    } else {
      // start local session if not already started
      if (!sessionIdRef.current) {
        try {
          const plan: SessionPlan = lastPlanRef.current ?? {
            segments: (segmentsRef.current && segmentsRef.current.length > 0)
              ? segmentsRef.current.map(s => ({ area: s.area, durationSec: s.durationSec }))
              : [{ area: timerState.selectedAreaName, durationSec: timerState.timeLeft }],
            breakDurationSec: breakDurationRef.current,
          };
          // if we just constructed a plan, initialize refs too
          if (!lastPlanRef.current) initializeFromPlan(plan);
          const { sessionId } = startSession(plan);
          sessionIdRef.current = sessionId;
          // ensure backend session too if possible
          try { await ensureBackendSession(plan); } catch {}
        } catch (e) {
          console.warn('Failed to start local session', e);
        }
      } else {
        // session already exists locally, still ensure backend
        try {
          const plan: SessionPlan = lastPlanRef.current ?? { segments: segmentsRef.current.map(s => ({ area: s.area, durationSec: s.durationSec })), breakDurationSec: breakDurationRef.current } as SessionPlan;
          await ensureBackendSession(plan);
        } catch {}
      }
    }

    setTimerState(prevState => ({ ...prevState, isRunning: true }));
    // slight delay to let media load if area changed during init
    setTimeout(() => {
      audioManagerRef.current?.play().catch(e => console.error("Audio play error:", e));
      videoManagerRef.current?.play().catch(e => console.error("Video play error:", e));
    }, 150);
    triggerActionOverlay('play');
  }, [phase, initializeFromPlan, triggerActionOverlay, timerState.timeLeft, timerState.selectedAreaName, ensureBackendSession]);

  // Auto-start if coming from Quick Start or Create with a fresh plan
  const didAutoStartRef = useRef(false);
  useEffect(() => {
    if (didAutoStartRef.current) return;
    try {
      const auto = localStorage.getItem('autostart');
      if (auto && (lastPlanRef.current || (segmentsRef.current && segmentsRef.current.length > 0))) {
        didAutoStartRef.current = true;
        localStorage.removeItem('autostart');
        setTimeout(() => { onStart(); }, 200);
      }
    } catch {}
  }, [onStart]);

  const onPause = useCallback(() => {
    setTimerState(prevState => ({ ...prevState, isRunning: false }));
    audioManagerRef.current?.pause();
    videoManagerRef.current?.pause();
    triggerActionOverlay('pause');
  }, [triggerActionOverlay]);

  // Now playing overlay
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const nowPlayingTimer = useRef<number | null>(null);
  const scheduleHideNowPlaying = useCallback(() => {
    if (nowPlayingTimer.current) window.clearTimeout(nowPlayingTimer.current);
    nowPlayingTimer.current = window.setTimeout(() => setNowPlaying(null), 1500);
  }, []);

  // Start a segment reliably: set times, area, ensure audio plays (with retries), and resume video
  const startSegment = useCallback((seg: { area: string; durationSec: number }) => {
    setSegmentRemaining(seg.durationSec);
    const areaCfg = STUDY_AREAS[seg.area];
    if (areaCfg && audioManagerRef.current) {
      audioManagerRef.current.loadAndPlayArea({ name: areaCfg.name, displayName: areaCfg.displayName, audioPath: areaCfg.audioPath }).catch(() => {});
      // Fallback retries to overcome any autoplay races
      setTimeout(() => { audioManagerRef.current?.play().catch(() => {}); }, 200);
      setTimeout(() => { audioManagerRef.current?.play().catch(() => {}); }, 600);
    }
    setNowPlaying(areaCfg?.displayName || seg.area);
    scheduleHideNowPlaying();
    setTimerState(p => ({ ...p, selectedAreaName: seg.area, timeLeft: seg.durationSec, isRunning: true }));
    setPhase('running');
    setTimeout(() => {
      videoManagerRef.current?.play().catch(() => {});
    }, 120);
  }, [scheduleHideNowPlaying]);

  // Request to reset: pause everything and ask for confirmation
  const onReset = useCallback(() => {
    wasRunningBeforeResetRef.current = timerState.isRunning;
    setTimerState(prev => ({ ...prev, isRunning: false }));
    audioManagerRef.current?.pause();
    videoManagerRef.current?.pause();
    setShowConfirmReset(true);
  }, [timerState.isRunning]);

  // Removed separate break countdown effects; handled in main interval

  // Focus lost detection -> append event + toast
  useEffect(() => {
    const onBlur = () => {
      if (!timerState.isRunning) return;
      try {
        if (sessionIdRef.current) {
          appendLocalEvent(sessionIdRef.current, { type: 'FocusLost', ts: Date.now() });
        }
      } catch {}
      try { sendEvent('FocusLost'); } catch {}
      addToast('Focus lost detected');
    };
    const onVisibility = () => {
      if (document.hidden) onBlur();
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [timerState.isRunning, addToast, sendEvent]);

  const confirmReset = useCallback(() => {
    // Re-initialize using remembered plan if available
    let p: SessionPlan | null = lastPlanRef.current || null;
    if (!p) {
      try { const raw = localStorage.getItem('activePlan'); if (raw) p = JSON.parse(raw) as SessionPlan; } catch {}
    }
    if (p) {
      initializeFromPlan(p);
    } else {
      // minimal fallback
      initializeFromPlan({ segments: [{ area: timerState.selectedAreaName, durationSec: timerState.timeLeft }], breakDurationSec: breakDurationRef.current } as SessionPlan);
    }
    audioManagerRef.current?.reset();
    videoManagerRef.current?.reset();
    setShowConfirmReset(false);
    triggerActionOverlay('reset');
  }, [initializeFromPlan, triggerActionOverlay, timerState.selectedAreaName, timerState.timeLeft]);

  const cancelReset = useCallback(() => {
    setShowConfirmReset(false);
    if (wasRunningBeforeResetRef.current) {
      setTimerState(prev => ({ ...prev, isRunning: true }));
      audioManagerRef.current?.play().catch(() => {});
      videoManagerRef.current?.play().catch(() => {});
    }
  }, []);

  const onVolumeChange = useCallback((newUiVolume: number) => {
    setUiVolume(newUiVolume);
    audioManagerRef.current?.setVolume(Math.max(0, Math.min(1, newUiVolume * 0.5)));
  }, []);

  // keep track of last non-zero UI volume
  useEffect(() => {
    if (uiVolume > 0) {
      lastNonZeroVolumeRef.current = uiVolume;
    }
  }, [uiVolume]);


  const onToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev; // true means entering focus/fullscreen, false exiting
      if (next) {
        if (rootRef.current) {
          requestFullscreen(rootRef.current).catch(() => {});
        }
        triggerActionOverlay('expand');
      } else {
        exitFullscreen().catch(() => {});
        triggerActionOverlay('collapse');
      }
      return next;
    });
    setShowUi(true);
  }, [triggerActionOverlay]);
  
  

  // Revert to simple inactivity auto-hide (works reliably outside fullscreen)
  useEffect(() => {
    if (!isCollapsed) return;
    if (!showUi) return;

    const id = window.setTimeout(() => setShowUi(false), 2500);
    hideTimeoutRef.current = id;
    return () => {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [isCollapsed, showUi]);

  // keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Special debug toggle sequence: double Ctrl then F, or F5
      if (e.key === 'Control') {
        const now = Date.now();
        const arr = ctrlPressRef.current;
        arr.push(now);
        if (arr.length > 2) arr.shift();
        return;
      }
      if (e.key === 'F5') {
        e.preventDefault();
        setShowDebugInfo(v => !v);
        ctrlPressRef.current = [];
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target as HTMLElement)?.isContentEditable) {
        return; // avoid interfering with typing
      }
      const key = e.key.toLowerCase();
      // If user pressed 'f' and recently pressed Ctrl twice, toggle debug
      if (key === 'f') {
        const arr = ctrlPressRef.current;
        if (arr.length >= 2 && (arr[1] - arr[0]) < 800 && (Date.now() - arr[1]) < 1200) {
          e.preventDefault();
          setShowDebugInfo(v => !v);
          ctrlPressRef.current = [];
          return;
        }
      }
      const inc = () => onVolumeChange(Math.min(1, uiVolume + 0.05));
      const dec = () => onVolumeChange(Math.max(0, uiVolume - 0.05));

      if (key === 'k' || key === ' ') {
        e.preventDefault();
        timerState.isRunning ? onPause() : onStart();
      } else if (key === 'f') {
        e.preventDefault();
        onToggleCollapse();
      } else if (key === 'm') {
        e.preventDefault();
        if (uiVolume === 0) {
          onVolumeChange(Math.max(0.1, lastNonZeroVolumeRef.current));
        } else {
          onVolumeChange(0);
        }
      } else if (key === '+' || key === '=') {
        e.preventDefault();
        inc();
      } else if (key === '-' || key === '_') {
        e.preventDefault();
        dec();
      } else if (key === 'arrowup') {
        inc();
      } else if (key === 'arrowdown') {
        dec();
      } else if (key === 'r') {
        onReset();
      } else if (key === '?') {
        e.preventDefault();
        setShowHelp(prev => !prev);
      } else if (key === 'escape') {
        if (showHelp) {
          e.preventDefault();
          setShowHelp(false);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [audioState.volume, onPause, onStart, onToggleCollapse, onVolumeChange, onReset, timerState.isRunning, showHelp, uiVolume]);

  // minute change subtle fade
  useEffect(() => {
    if (timerState.isRunning && timerState.timeLeft % 60 === 0) {
      setMinuteFlash(true);
      const id = window.setTimeout(() => setMinuteFlash(false), 400);
      return () => window.clearTimeout(id);
    }
  }, [timerState.timeLeft, timerState.isRunning]);

  const navigate = useNavigate();

  return (
      <div
        ref={rootRef}
        className="relative w-screen h-[100dvh] overflow-hidden text-white bg-black font-trajan"
        onMouseMove={() => {
        if (!isCollapsed) return;
        setShowUi(true);
      }}
    >
      <video
        ref={videoRef}
        src={STUDY_AREAS[timerState.selectedAreaName]?.videoPath}
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectFit: 'cover' }}
      />
      {/* Top-left mask to cover game HUD (health bar) area */}
      <div className="absolute top-0 left-0 z-10 pointer-events-none" style={{ width: '280px', height: '120px', background: 'linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%)' }} />

      {/* Center action overlay (YouTube-like) */}
      {showActionOverlay && actionOverlay && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-300">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-black/45 flex items-center justify-center text-white">
            {actionOverlay === 'play' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            )}
            {actionOverlay === 'pause' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg>
            )}
            {actionOverlay === 'expand' && (
              <img src="/assets/ui/fullscreen.svg" alt="Fullscreen" className="w-10 h-10 opacity-95" />
            )}
            {actionOverlay === 'collapse' && (
              <img src="/assets/ui/collapse.svg" alt="Collapsed" className="w-10 h-10 opacity-95" />
            )}
            {actionOverlay === 'mute' && (
              <img src="/assets/ui/mute.svg" alt="Muted" className="w-10 h-10 opacity-95" />
            )}
            {actionOverlay === 'unmute' && (
              <img src="/assets/ui/unmute.svg" alt="Unmuted" className="w-10 h-10 opacity-95" />
            )}
            {actionOverlay === 'reset' && (
              <img src="/assets/ui/reset.png" alt="Reset" className="w-10 h-10 opacity-95" />
            )}
          </div>
        </div>
      )}

      {/* Toasts (focus lost) */}
      {toasts.length > 0 && (
        <div className="absolute top-4 right-4 z-30 space-y-2">
          {toasts.map(t => (
            <div key={t.id} className="px-4 py-2 rounded-md bg-red-700/80 border border-white/20 text-sm shadow">
              {t.text}
            </div>
          ))}
        </div>
      )}

      {/* Center completion banner */}
      {completeBanner && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="px-6 py-3 rounded-full bg-black/50 border border-white/30 text-white text-2xl tracking-wider font-trajan">
            Session Completed
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-4 md:p-8">

        {/* Now Playing overlay */}
        {nowPlaying && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-black/55 border border-white/20 text-white/90 tracking-wide">
            Now playing: {nowPlaying}
          </div>
        )}

        <div
className={`absolute left-1/2 -translate-x-1/2 top-[18%] md:top-[14%] lg:top-[12%] flex items-center justify-center p-4 transition-all duration-1000 ${isCollapsed ? '' : ''}`}
          aria-label="Study timer"
        >
          <img
            src="/assets/ui/timer_wrap.png"
            alt="Timer ornament"
            className="pointer-events-none select-none absolute top-1/2 left-1/2 max-w-none opacity-95 z-0"
            style={{ width: 'clamp(350px, 28vw, 2100px)', transform: 'translate(-51.5%, calc(-44% + 12px))' }}
            aria-hidden="true"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />

          {/* Celebrate ring */}
          {phase === 'completed' && (
            <div className="absolute -inset-2 animate-celebrate rounded-full border-2 border-white/70" />
          )}

          {/* Break label */}
          {phase === 'break' && (
            <div className="absolute -top-10 text-2xl tracking-wider bg-white/15 px-4 py-1 rounded-full border border-white/30">Break</div>
          )}

          <p className={`relative z-10 font-trajan timer-glow timer-stroke text-white text-[4.6rem] md:text-[6.2rem] lg:text-[6rem] font-normal tracking-wide text-center select-none ${minuteFlash ? 'minute-fade' : ''}`}>
            {phase === 'break' ? formatTime(breakRemaining) : formatTime(timerState.timeLeft)}
          </p>
        </div>
        {/* Revert: show overlay credits and a separate bottom controls bar */}
        {( !isCollapsed || showUi ) && (
          <BottomCredits areaName={timerState.selectedAreaName} />
        )}

        {( !isCollapsed || showUi ) && (
          <div className="absolute bottom-0 w-full p-4">
            <TimerControls
            isRunning={timerState.isRunning}
            onStart={onStart}
            onPause={onPause}
            onReset={onReset}
            canStart={audioState.isLoaded}
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            currentAreaName={timerState.selectedAreaName}
            volume={uiVolume}
            onVolumeChange={onVolumeChange}
            volumeEnabled={audioState.isLoaded}
            onVolumeAction={(a) => triggerActionOverlay(a === 'mute' ? 'mute' : 'unmute')}
            leftExtra={(
              <div className="flex items-center gap-3">
                <button onClick={() => { setFeedbackType('feedback'); setFeedbackOpen(true); }} className="opacity-85 hover:opacity-100 underline underline-offset-2">Feedback</button>
                <button onClick={() => { setFeedbackType('bug'); setFeedbackOpen(true); }} className="opacity-85 hover:opacity-100 underline underline-offset-2">Report a bug</button>
              </div>
            )}
          />
          </div>
        )}

        <FeedbackModal open={feedbackOpen} type={feedbackType} onClose={() => setFeedbackOpen(false)} />


        {/* Top-left quick actions */}
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-white rounded-full bg-white/20 hover:bg-white/40 transition-colors"
            aria-label="Go Home"
            title="Home"
          >
            <img src="/assets/ui/home.svg" alt="Home" className="w-6 h-6" />
          </button>
          <button
            onClick={() => navigate('/create')}
            className="p-2 text-white rounded-full bg-white/20 hover:bg-white/40 transition-colors"
            aria-label="Create Session"
            title="Create Session"
          >
            <img src="/assets/ui/edit.svg" alt="Create Session" className="w-6 h-6" />
          </button>
          
        </div>

        {/* Profile top-right (account) */}
        <div className="absolute top-4 right-4 z-20">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(v => !v)}
                className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/20 hover:bg-white/35 transition-colors"
                aria-label="Account"
                title="Account"
              >
                {(() => { try { const p = localStorage.getItem('profilePhoto'); if (p) return <img src={p} alt="Avatar" className="w-7 h-7 rounded-full object-cover" /> } catch {} return <div className="w-7 h-7 rounded-full bg-white/30 text-black flex items-center justify-center text-sm">{(user?.name||user?.email||'U').slice(0,1).toUpperCase()}</div>; })()}
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg bg-black/80 border border-white/15 shadow-lg overflow-hidden">
<button onClick={() => { onPause(); try { localStorage.setItem('resumeStudy','1'); } catch {}; navigate('/profile', { state: { fromStudy: true } }); setProfileMenuOpen(false); }} className="block w-full text-left px-4 py-2 hover:bg-white/10">My profile</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={signIn} className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/35 transition-colors">Sign in</button>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        loop
        preload="auto"
      />


      {/* Shortcuts help overlay */}
      {showHelp && (
        <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center p-6">
          <div className="bg-black/60 backdrop-blur-md rounded-lg p-6 text-white max-w-lg w-full shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
              <button onClick={() => setShowHelp(false)} className="p-1 rounded bg-white/20 hover:bg-white/30" aria-label="Close" title="Close">✕</button>
            </div>
            <ul className="grid grid-cols-1 gap-2 text-sm">
              <li><span className="inline-block w-20 opacity-80">Space / K</span> Play/Pause</li>
              <li><span className="inline-block w-20 opacity-80">F</span> Fullscreen</li>
              <li><span className="inline-block w-20 opacity-80">M</span> Mute/Unmute</li>
              <li><span className="inline-block w-20 opacity-80">↑ / +</span> Volume Up</li>
              <li><span className="inline-block w-20 opacity-80">↓ / -</span> Volume Down</li>
              <li><span className="inline-block w-20 opacity-80">R</span> Reset Timer</li>
              <li><span className="inline-block w-20 opacity-80">?</span> Toggle this help</li>
            </ul>
          </div>
        </div>
      )}

      {/* Confirm reset modal */}
      {showConfirmReset && (
        <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center p-6">
          <div className="relative bg-black/60 backdrop-blur-md rounded-xl p-6 text-white max-w-md w-full shadow-2xl text-center border border-white/15">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-1 rounded bg-white/20" />
            <p className="mb-6 text-lg tracking-wide">Are you sure you want to reset this session?</p>
            <div className="flex justify-center gap-4">
              <button onClick={confirmReset} className="px-5 py-2 rounded-full bg-white/25 hover:bg-white/35 transition">Reset</button>
              <button onClick={cancelReset} className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDebugInfo && (
        <div className="debug-info fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 p-3 bg-black/40 backdrop-blur-sm text-white rounded-md text-sm w-[min(520px,90%)] shadow-lg border border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold mb-2">Debug</p>
              <p className="text-xs opacity-90">Audio Source: {getAreaByName(timerState.selectedAreaName)?.audioPath}</p>
              <p className="text-xs opacity-90">Audio Loaded: {audioState.isLoaded ? 'Yes' : 'No'}</p>
              <p className="text-xs opacity-90">Audio Playing: {audioState.isPlaying ? 'Yes' : 'No'}</p>
              <p className="text-xs opacity-90">Timer Running: {timerState.isRunning ? 'Yes' : 'No'}</p>
              <p className="text-xs opacity-90">Segment Remaining: {segmentRemaining}s</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-90">Audio: {audioState.duration ? `${audioState.duration.toFixed(1)}s` : 'Unknown'}</p>
              <p className="text-xs opacity-90">Time: {audioState.currentTime.toFixed(1)}s</p>
              <p className="text-xs opacity-90">Vol: {Math.round(uiVolume * 100)}%</p>
              <p className="text-xs opacity-90">Video: {videoState.isLoaded ? 'Yes' : 'No'}</p>
              {audioState.error && (<p className="text-red-300 text-xs mt-1">Error: {audioState.error}</p>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
