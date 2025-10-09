import React from 'react';
import VolumeControl from '../utils/VolumeControl';
import { STUDY_AREAS } from '../config/areas';

interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  canStart: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentAreaName: string;
  volume: number;
  onVolumeChange: (v: number) => void;
  volumeEnabled: boolean;
  onVolumeAction: (a: 'mute' | 'unmute') => void;
  leftExtra?: React.ReactNode; // content to render to the right of Reset button
}

const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  onStart,
  onPause,
  onReset,
  canStart,
  isCollapsed,
  onToggleCollapse,
  currentAreaName,
  volume,
  onVolumeChange,
  volumeEnabled,
  onVolumeAction,
  leftExtra,
}) => {
  const displayName = STUDY_AREAS[currentAreaName]?.displayName ?? currentAreaName;
  return (
    <div className="w-full p-4 flex justify-between items-center pointer-events-auto bg-gradient-to-t from-black via-transparent to-transparent">
      <div className="flex items-center space-x-3">
        {isRunning ? (
          <button 
            onClick={onPause}
            className="p-2 text-white bg-white bg-opacity-20 rounded-full hover:bg-opacity-40 transition-colors"
            aria-label="Pause"
            title="Pause"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pause"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg>
          </button>
        ) : (
          <button 
            onClick={onStart} 
            disabled={!canStart}
            className="p-2 text-white bg-white bg-opacity-20 rounded-full hover:bg-opacity-40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Play"
            title="Play"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
        )}
        <button
          onClick={onReset}
          className="p-2 text-white bg-white bg-opacity-20 rounded-full hover:bg-opacity-40 transition-colors"
          aria-label="Reset"
          title="Reset"
        >
          <img src="/assets/ui/reset.png" alt="Reset" className="w-6 h-6" />
        </button>
        {leftExtra && (
          <div className="ml-2 pl-2 border-l border-white/15 flex items-center gap-3 text-sm">
            {leftExtra}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="px-3 py-2 rounded-full bg-black/45 border border-white/20 text-white/90 tracking-wide">
          {displayName}
        </div>
        <div className="relative">
          <VolumeControl
            volume={volume}
            onVolumeChange={onVolumeChange}
            disabled={!volumeEnabled}
            orientation="vertical"
            variant="compact"
            revealOnHover={true}
            placement="popover"
            onAction={onVolumeAction}
          />
        </div>
        <button 
          onClick={onToggleCollapse}
          className="p-2 text-white bg-white bg-opacity-20 rounded-full hover:bg-opacity-40 transition-colors"
          aria-label={isCollapsed ? "Collapse" : "Expand"}
          title={isCollapsed ? "Collapse" : "Expand"}
        >
          {!isCollapsed ? (
            <img src="/assets/ui/fullscreen.svg" alt="Fullscreen" className="w-6 h-6" />
          ) : (
            <img src="/assets/ui/collapse.svg" alt="Collapse" className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  );
};

export default TimerControls;
