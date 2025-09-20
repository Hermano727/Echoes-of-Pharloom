import React, { useState, useEffect, useRef, useCallback } from "react";
import TimerControls from "./components/TimerControls";
import BottomCredits from "./components/BottomCredits";
import { STUDY_AREAS, getAreaByName } from "./config/areas";
import { AudioManager, AudioState } from "./utils/audioManager";
import { VideoManager, VideoState } from "./utils/videoManager";
import { DEFAULT_TIMER_CONFIG, formatTime } from "./utils/timerUtils";


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
  const [timerState, setTimerState] = useState<TimerState>(() => {
    const storedState = getStoredTimerState();
    return storedState || {
      timeLeft: DEFAULT_TIMER_CONFIG.defaultDuration,
      isRunning: false,
      selectedAreaName: 'choralchambers',
    };
  });

  const [audioState, setAudioState] = useState<AudioState>({
    isLoaded: false,
    isPlaying: false,
    error: null,
    volume: 0.7,
    currentTime: 0,
    duration: 0,
  });
  const lastNonZeroVolumeRef = useRef<number>(0.7);

  const [videoState, setVideoState] = useState<VideoState>({
    isLoaded: false,
    isPlaying: false,
    error: null,
  });
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const hideTimeoutRef = useRef<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [minuteFlash, setMinuteFlash] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const wasRunningBeforeResetRef = useRef<boolean>(false);

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

  useEffect(() => {
    if (audioRef.current && !audioManagerRef.current) {
      audioManagerRef.current = new AudioManager(audioRef.current, setAudioState);
    }
    if (videoRef.current && !videoManagerRef.current) {
      videoManagerRef.current = new VideoManager(videoRef.current, setVideoState);
    }
  }, []);

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
        setTimerState(prevState => {
          const newTime = prevState.timeLeft - 1;
          if (newTime <= 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return { ...prevState, timeLeft: 0, isRunning: false };
          }
          return { ...prevState, timeLeft: newTime };
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning]);

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

  const onStart = useCallback(() => {
    setTimerState(prevState => ({ ...prevState, isRunning: true }));
    audioManagerRef.current?.play().catch(e => console.error("Audio play error:", e));
    videoManagerRef.current?.play().catch(e => console.error("Video play error:", e));
    triggerActionOverlay('play');
  }, [triggerActionOverlay]);

  const onPause = useCallback(() => {
    setTimerState(prevState => ({ ...prevState, isRunning: false }));
    audioManagerRef.current?.pause();
    videoManagerRef.current?.pause();
    triggerActionOverlay('pause');
  }, [triggerActionOverlay]);

  // Request to reset: pause everything and ask for confirmation
  const onReset = useCallback(() => {
    wasRunningBeforeResetRef.current = timerState.isRunning;
    setTimerState(prev => ({ ...prev, isRunning: false }));
    audioManagerRef.current?.pause();
    videoManagerRef.current?.pause();
    setShowConfirmReset(true);
  }, [timerState.isRunning]);

  const confirmReset = useCallback(() => {
    setTimerState(prev => ({ ...prev, timeLeft: DEFAULT_TIMER_CONFIG.defaultDuration, isRunning: false }));
    audioManagerRef.current?.reset();
    videoManagerRef.current?.reset();
    setShowConfirmReset(false);
    triggerActionOverlay('reset');
  }, [triggerActionOverlay]);

  const cancelReset = useCallback(() => {
    setShowConfirmReset(false);
    if (wasRunningBeforeResetRef.current) {
      setTimerState(prev => ({ ...prev, isRunning: true }));
      audioManagerRef.current?.play().catch(() => {});
      videoManagerRef.current?.play().catch(() => {});
    }
  }, []);

  const onVolumeChange = useCallback((newVolume: number) => {
    setAudioState(prev => ({ ...prev, volume: newVolume }));
    audioManagerRef.current?.setVolume(newVolume);
  }, []);

  // keep track of last non-zero volume
  useEffect(() => {
    if (audioState.volume > 0) {
      lastNonZeroVolumeRef.current = audioState.volume;
    }
  }, [audioState.volume]);

  const onAreaChange = useCallback((newAreaName: string) => {
    setTimerState(prevState => ({
      ...prevState,
      selectedAreaName: newAreaName,
      timeLeft: DEFAULT_TIMER_CONFIG.defaultDuration,
      isRunning: false
    }));
  }, []);

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
  
  const onToggleDebugInfo = useCallback(() => {
    setShowDebugInfo(prev => !prev);
  }, []);

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
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target as HTMLElement)?.isContentEditable) {
        return; // avoid interfering with typing
      }
      const key = e.key.toLowerCase();
      const inc = () => onVolumeChange(Math.min(1, audioState.volume + 0.05));
      const dec = () => onVolumeChange(Math.max(0, audioState.volume - 0.05));

      if (key === 'k' || key === ' ') {
        e.preventDefault();
        timerState.isRunning ? onPause() : onStart();
      } else if (key === 'f') {
        e.preventDefault();
        onToggleCollapse();
      } else if (key === 'm') {
        e.preventDefault();
        if (audioState.volume === 0) {
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
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [audioState.volume, onPause, onStart, onToggleCollapse, onVolumeChange, onReset, timerState.isRunning]);

  // minute change subtle fade
  useEffect(() => {
    if (timerState.isRunning && timerState.timeLeft % 60 === 0) {
      setMinuteFlash(true);
      const id = window.setTimeout(() => setMinuteFlash(false), 400);
      return () => window.clearTimeout(id);
    }
  }, [timerState.timeLeft, timerState.isRunning]);

  return (
    <div
      ref={rootRef}
      className="relative w-screen h-screen overflow-hidden text-white bg-black font-trajan"
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

      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-4 md:p-8">

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
          <p className={`relative z-10 font-trajan timer-glow timer-stroke text-white text-[4.6rem] md:text-[6.2rem] lg:text-[6rem] font-normal tracking-wide text-center select-none ${minuteFlash ? 'minute-fade' : ''}`}>
            {formatTime(timerState.timeLeft)}
          </p>
        </div>
        
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
              selectedAreaName={timerState.selectedAreaName}
              onAreaChange={onAreaChange}
              volume={audioState.volume}
              onVolumeChange={onVolumeChange}
              volumeEnabled={audioState.isLoaded}
              onVolumeAction={(a) => triggerActionOverlay(a === 'mute' ? 'mute' : 'unmute')}
            />
          </div>
        )}


        {( !isCollapsed || showUi ) && (
          <button
            onClick={onToggleDebugInfo}
            className={`absolute top-4 right-4 z-20 p-2 text-white rounded-full transition-colors ${showDebugInfo ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-white/20 hover:bg-white/40'}`}
            aria-label="Toggle Debug Info"
            title="Toggle Debug Info"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bug"><path d="M10 20h4"/><path d="M10 20a5 5 0 0 1-5-5V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a5 5 0 0 1-5 5Z"/><path d="M13 10h-2"/><path d="M12 17v-4"/><path d="M20 7l-4.2 4.2"/><path d="M4 7l4.2 4.2"/></svg>
          </button>
        )}
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
        <div className="debug-info absolute bottom-20 left-4 p-4 bg-black bg-opacity-50 text-white rounded text-sm max-w-sm overflow-auto">
          <p className="font-bold mb-2">Debug Info:</p>
          <p>Audio Source: {getAreaByName(timerState.selectedAreaName)?.audioPath}</p>
          <p>Audio Loaded: {audioState.isLoaded ? 'Yes' : 'No'}</p>
          <p>Audio Playing: {audioState.isPlaying ? 'Yes' : 'No'}</p>
          <p>Timer Running: {timerState.isRunning ? 'Yes' : 'No'}</p>
          <p>Audio Duration: {audioState.duration ? `${audioState.duration.toFixed(1)}s` : 'Unknown'}</p>
          <p>Audio Current Time: {audioState.currentTime.toFixed(1)}s</p>
          <p>Volume: {Math.round(audioState.volume * 100)}%</p>
          <p>Video Source: {getAreaByName(timerState.selectedAreaName)?.videoPath}</p>
          <p>Video Loaded: {videoState.isLoaded ? 'Yes' : 'No'}</p>
          <p>Video Playing: {videoState.isPlaying ? 'Yes' : 'No'}</p>
          {audioState.error && (
            <p className="text-red-400 mt-2">Error: {audioState.error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
