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

  const [videoState, setVideoState] = useState<VideoState>({
    isLoaded: false,
    isPlaying: false,
    error: null,
  });
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const hideTimeoutRef = useRef<number | null>(null);

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

  useEffect(() => {
    const currentArea = getAreaByName(timerState.selectedAreaName);
    if (currentArea) {
      audioManagerRef.current?.loadArea(currentArea);
      videoManagerRef.current?.load(currentArea.videoPath);
    }
  }, [timerState.selectedAreaName]);

  useEffect(() => {
    saveTimerState(timerState);

    if (timerState.isRunning) {
      intervalRef.current = setInterval(() => {
        setTimerState(prevState => {
          const newTime = prevState.timeLeft - 1;
          if (newTime <= 0) {
            clearInterval(intervalRef.current!);
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
  }, [timerState.isRunning, timerState.timeLeft]);

  const onStart = useCallback(() => {
    setTimerState(prevState => ({ ...prevState, isRunning: true }));
    audioManagerRef.current?.play().catch(e => console.error("Audio play error:", e));
    videoManagerRef.current?.play().catch(e => console.error("Video play error:", e));
  }, []);

  const onPause = useCallback(() => {
    setTimerState(prevState => ({ ...prevState, isRunning: false }));
    audioManagerRef.current?.pause();
    videoManagerRef.current?.pause();
  }, []);

  const onReset = useCallback(() => {
    setTimerState({
      ...timerState,
      timeLeft: DEFAULT_TIMER_CONFIG.defaultDuration,
      isRunning: false
    });
    audioManagerRef.current?.reset();
    videoManagerRef.current?.reset();
  }, [timerState]);

  const onVolumeChange = useCallback((newVolume: number) => {
    setAudioState(prev => ({ ...prev, volume: newVolume }));
    audioManagerRef.current?.setVolume(newVolume);
  }, []);

  const onAreaChange = useCallback((newAreaName: string) => {
    setTimerState(prevState => ({
      ...prevState,
      selectedAreaName: newAreaName,
      timeLeft: DEFAULT_TIMER_CONFIG.defaultDuration,
      isRunning: false
    }));
  }, []);

  const onToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
    setShowUi(true);
  }, []);
  
  const onToggleDebugInfo = useCallback(() => {
    setShowDebugInfo(prev => !prev);
  }, []);

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

  return (
    <div
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
      {!isCollapsed && (
        <div className="absolute inset-0 bg-black opacity-30 z-10" />
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
          <p className="relative z-10 font-trajan timer-glow timer-stroke text-white text-[4.6rem] md:text-[6.4rem] lg:text-[7rem] font-normal tracking-wide text-center select-none">
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
              audioState={audioState}
              onVolumeChange={onVolumeChange}
              isCollapsed={isCollapsed}
              onToggleCollapse={onToggleCollapse}
              onToggleDebugInfo={onToggleDebugInfo}
              showDebugInfo={showDebugInfo}
              selectedAreaName={timerState.selectedAreaName}
              onAreaChange={onAreaChange}
            />
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        loop
        preload="auto"
      />

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
