import React, { useState, useEffect, useRef, useCallback } from "react";
import VolumeControl from './VolumeControl';
import { AudioManager, AudioState } from '../utils/audioManager';
import { STUDY_AREAS, getAreaByName } from '../config/areas';
import { formatTime, DEFAULT_TIMER_CONFIG } from '../utils/timerUtils';

interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  selectedAreaName: string;
}

function StudyTimer() {
  // Timer State
  const [timerState, setTimerState] = useState<TimerState>({
    timeLeft: DEFAULT_TIMER_CONFIG.defaultDuration,
    isRunning: false,
    selectedAreaName: 'bonebottom',
  });

  // Audio State
  const [audioState, setAudioState] = useState<AudioState>({
    isLoaded: false,
    isPlaying: false,
    error: null,
    volume: 0.7,
    currentTime: 0,
    duration: 0,
  });

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);

  // Initialize AudioManager
  useEffect(() => {
    // Only initialize the AudioManager instance once.
    if (!audioManagerRef.current) {
      if (audioRef.current) {
        audioManagerRef.current = new AudioManager(
          audioRef.current,
          setAudioState
        );
      }
    }

    const currentArea = getAreaByName(timerState.selectedAreaName);
    if (currentArea && audioManagerRef.current) {
      audioManagerRef.current.loadArea(currentArea);
    }
    
    return () => {
      if (audioManagerRef.current) {
        audioManagerRef.current.cleanup();
        // Nullify the ref so it can be re-initialized on component unmount/remount
        audioManagerRef.current = null;
      }
    };
  }, [timerState.selectedAreaName]); // Re-run effect only when area changes

  // Timer logic
  useEffect(() => {
    if (timerState.isRunning) {
      intervalRef.current = setInterval(() => {
        setTimerState(prev => {
          if (prev.timeLeft > 0) {
            return { ...prev, timeLeft: prev.timeLeft - 1 };
          } else {
            // Timer finished
            clearInterval(intervalRef.current!);
            audioManagerRef.current?.pause();
            return { ...prev, isRunning: false, timeLeft: 0 };
          }
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning]);

  // Handle audio play/pause when timer starts/stops
  useEffect(() => {
    if (audioManagerRef.current && audioState.isLoaded) {
      if (timerState.isRunning) {
        audioManagerRef.current.play().catch((error: unknown) => {
          console.warn("Audio autoplay prevented:", error);
        });
      } else {
        audioManagerRef.current.pause();
      }
    }
  }, [timerState.isRunning, audioState.isLoaded]);

  // Event handlers
  const handleStart = useCallback(() => {
    setTimerState(prev => ({ ...prev, isRunning: true }));
  }, []);

  const handlePause = useCallback(() => {
    setTimerState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const handleReset = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      timeLeft: DEFAULT_TIMER_CONFIG.defaultDuration,
      isRunning: false,
    }));
    
    // Reset audio to beginning
    if (audioManagerRef.current) {
      audioManagerRef.current.reset();
    }
  }, []);

  const handleAreaChange = useCallback(async (areaName: string) => {
    const area = getAreaByName(areaName);
    if (area && audioManagerRef.current) {
      setTimerState(prev => ({ ...prev, selectedAreaName: areaName }));
      await audioManagerRef.current.loadArea(area);
    }
  }, []);

  const handleVolumeChange = useCallback((volume: number) => {
    if (audioManagerRef.current) {
      audioManagerRef.current.setVolume(volume);
    }
  }, []);

  const handleManualAudioPlay = useCallback(async () => {
    if (audioManagerRef.current) {
      try {
        await audioManagerRef.current.play();
        console.log('Manual audio play successful');
      } catch (error) {
        console.error('Manual audio play failed:', error);
      }
    }
  }, []);

  const handleForceReload = useCallback(async () => {
    const area = getAreaByName(timerState.selectedAreaName);
    if (area && audioManagerRef.current) {
      console.log('Force reloading audio...');
      await audioManagerRef.current.loadArea(area);
    }
  }, [timerState.selectedAreaName]);

  const selectedArea = getAreaByName(timerState.selectedAreaName);

  return (
    <div className="study-timer max-w-2xl mx-auto p-8">
      {/* Timer Display */}
      <div className="timer-display text-center mb-8">
        <h1 className="text-8xl font-bold mb-4 font-mono">
          {formatTime(timerState.timeLeft)}
        </h1>
        {timerState.timeLeft === 0 && (
          <p className="text-2xl text-green-600 font-semibold">
            🎉 Study session complete! Great work! 🎉
          </p>
        )}
      </div>

      {/* Area Selection */}
      <div className="area-selection mb-6 bg-white rounded-lg p-6 shadow-md">
        <label className="block mb-3 text-lg font-semibold text-gray-700">
          Choose Study Area:
        </label>
        <select
          value={timerState.selectedAreaName}
          onChange={(e) => handleAreaChange(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
          disabled={timerState.isRunning}
        >
          {Object.values(STUDY_AREAS).map((area) => (
            <option key={area.name} value={area.name}>
              {area.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Volume Control */}
      <div className="volume-section mb-6">
        <label className="block mb-2 text-lg font-semibold text-gray-700">
          Volume Control:
        </label>
        <VolumeControl
          volume={audioState.volume}
          onVolumeChange={handleVolumeChange}
          disabled={!audioState.isLoaded}
        />
      </div>

      {/* Audio Status */}
      <div className="audio-status mb-6 p-4 rounded-lg bg-gray-50">
        {audioState.error && (
          <div className="text-red-600 mb-3">
            <p className="font-medium">⚠️ {audioState.error}</p>
            <div className="space-x-2 mt-2">
              <button
                onClick={handleManualAudioPlay}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm transition-colors"
              >
                Enable Audio
              </button>
              <button
                onClick={handleForceReload}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm transition-colors"
              >
                Reload Audio
              </button>
            </div>
          </div>
        )}
        {!audioState.isLoaded && !audioState.error && (
          <div className="text-yellow-600">
            <p className="flex items-center">
              <span className="animate-spin mr-2">⏳</span>
              Loading audio for {selectedArea?.displayName}...
            </p>
            <button
              onClick={handleForceReload}
              className="mt-2 px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
            >
              Force Reload
            </button>
          </div>
        )}
        {audioState.isLoaded && !audioState.error && (
          <div className="text-green-600">
            <p className="font-medium">
              ✓ Audio ready for {selectedArea?.displayName}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Duration: {formatTime(Math.floor(audioState.duration))}
            </p>
          </div>
        )}
      </div>

      {/* Timer Controls */}
      <div className="timer-controls flex justify-center space-x-4 mb-8">
        <button
          onClick={handleStart}
          disabled={timerState.isRunning || timerState.timeLeft === 0 || !audioState.isLoaded}
          className="px-8 py-4 bg-green-500 text-white text-lg font-semibold rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          ▶️ Start
        </button>
        
        <button
          onClick={handlePause}
          disabled={!timerState.isRunning}
          className="px-8 py-4 bg-yellow-500 text-white text-lg font-semibold rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          ⏸️ Pause
        </button>
        
        <button
          onClick={handleReset}
          className="px-8 py-4 bg-red-500 text-white text-lg font-semibold rounded-lg hover:bg-red-600 transition-colors shadow-lg"
        >
          🔄 Reset
        </button>
      </div>

      {/* Audio Progress */}
      {audioState.isLoaded && audioState.duration > 0 && (
        <div className="audio-progress mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Audio Progress</span>
            <span>{formatTime(Math.floor(audioState.currentTime))} / {formatTime(Math.floor(audioState.duration))}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(audioState.currentTime / audioState.duration) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Audio Element */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
      />

      {/* Debug Info */}
      <div className="debug-info mt-8 p-4 bg-gray-100 rounded text-sm">
        <p className="font-bold mb-2">Debug Info:</p>
        <p>Audio Source: {STUDY_AREAS[timerState.selectedAreaName]?.audioPath}</p>
        <p>Audio Loaded: {audioState.isLoaded ? 'Yes' : 'No'}</p>
        <p>Audio Playing: {audioState.isPlaying ? 'Yes' : 'No'}</p>
        <p>Timer Running: {timerState.isRunning ? 'Yes' : 'No'}</p>
        <p>Audio Duration: {audioState.duration ? `${audioState.duration.toFixed(1)}s` : 'Unknown'}</p>
        <p>Audio Current Time: {audioState.currentTime.toFixed(1)}s</p>
        <p>Volume: {Math.round(audioState.volume * 100)}%</p>
        {audioState.error && (
          <p className="text-red-600 font-medium">Error: {audioState.error}</p>
        )}
      </div>
    </div>
  );
}

export default StudyTimer;