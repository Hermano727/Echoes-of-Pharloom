import React from 'react';
import VolumeControl from '../utils/VolumeControl';
import { AudioState } from '../utils/audioManager';
import AreaSelector from './AreaSelector';

interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  audioState: AudioState;
  onVolumeChange: (newVolume: number) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleDebugInfo: () => void;
  showDebugInfo: boolean;
  selectedAreaName: string;
  onAreaChange: (areaName: string) => void;
}

const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  onStart,
  onPause,
  onReset,
  audioState,
  onVolumeChange,
  isCollapsed,
  onToggleCollapse,
  onToggleDebugInfo,
  showDebugInfo,
  selectedAreaName,
  onAreaChange,
}) => {
  return (
    <div className="w-full p-4 flex justify-between items-center pointer-events-auto bg-gradient-to-t from-black via-transparent to-transparent">
      <div className="flex items-center space-x-2">
        {isRunning ? (
          <button 
            onClick={onPause}
            className="p-2 text-white bg-white bg-opacity-20 rounded-full hover:bg-opacity-40 transition-colors"
            aria-label="Pause"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pause"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg>
          </button>
        ) : (
          <button 
            onClick={onStart} 
            disabled={!audioState.isLoaded}
            className="p-2 text-white bg-white bg-opacity-20 rounded-full hover:bg-opacity-40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Play"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
        )}
        <button
          onClick={onReset}
          className="p-2 text-white bg-white bg-opacity-20 rounded-full hover:bg-opacity-40 transition-colors"
          aria-label="Reset"
        >
          <img src="/assets/ui/reset.png" alt="Reset" className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <AreaSelector selectedAreaName={selectedAreaName} onAreaChange={onAreaChange} />
        <div className="w-56 sm:w-64 md:w-72">
          <VolumeControl
            volume={audioState.volume}
            onVolumeChange={onVolumeChange}
            disabled={!audioState.isLoaded}
          />
        </div>
        <button 
          onClick={onToggleCollapse}
          className="p-2 text-white bg-white bg-opacity-20 rounded-full hover:bg-opacity-40 transition-colors"
          aria-label={isCollapsed ? "Expand" : "Collapse"}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? (
            <img src="/assets/ui/expand.svg" alt="Expand" className="w-6 h-6" />
          ) : (
            <img src="/assets/ui/collapse.svg" alt="Collapse" className="w-6 h-6" />
          )}
        </button>
        <button
          onClick={onToggleDebugInfo}
          className={`p-2 text-white rounded-full transition-colors ${showDebugInfo ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-white bg-opacity-20 hover:bg-opacity-40'}`}
          aria-label="Toggle Debug Info"
          title="Toggle Debug Info"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bug"><path d="M10 20h4"/><path d="M10 20a5 5 0 0 1-5-5V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a5 5 0 0 1-5 5Z"/><path d="M13 10h-2"/><path d="M12 17v-4"/><path d="M20 7l-4.2 4.2"/><path d="M4 7l4.2 4.2"/></svg>
        </button>
      </div>
    </div>
  );
};

export default TimerControls;
