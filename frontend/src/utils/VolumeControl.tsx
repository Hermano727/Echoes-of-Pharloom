import React, { useMemo, useRef } from 'react';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  disabled?: boolean;
}

const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  onVolumeChange,
  disabled = false,
}) => {
  const lastNonZeroRef = useRef<number>(Math.max(0.7, volume || 0));

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (newVolume > 0) lastNonZeroRef.current = newVolume;
    onVolumeChange(newVolume);
  };

  const toggleMute = () => {
    if (disabled) return;
    if (volume === 0) {
      const restore = Math.max(0.1, Math.min(1, lastNonZeroRef.current || 0.7));
      onVolumeChange(restore);
    } else {
      onVolumeChange(0);
    }
  };

  const getVolumeIcon = (vol: number) => {
    if (vol === 0) return '🔇';
    if (vol < 0.3) return '🔈';
    if (vol < 0.7) return '🔉';
    return '🔊';
  };

  const volumePercentage = Math.round(volume * 100);

  const sliderStyle: React.CSSProperties = useMemo(() => ({
    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volumePercentage}%, #e5e7eb ${volumePercentage}%, #e5e7eb 100%)`,
  }), [volumePercentage]);

  return (
    <>
      <style>{`
        .volume-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 10px;
          border-radius: 5px;
          outline: none;
          transition: all 0.2s ease;
        }
        
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .volume-slider::-webkit-slider-thumb:hover {
          background: #2563eb;
          transform: scale(1.1);
          box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        }
        
        .volume-slider::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .volume-slider::-moz-range-thumb:hover {
          background: #2563eb;
          transform: scale(1.1);
          box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        }
        
        .volume-slider:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .volume-slider:disabled::-webkit-slider-thumb {
          cursor: not-allowed;
        }
        
        .volume-slider:disabled::-moz-range-thumb {
          cursor: not-allowed;
        }
      `}</style>
      
      <div className="volume-control flex items-center space-x-3 p-3 bg-gray-50 rounded-lg shadow-sm min-w-[12rem] w-full">
        <button
          type="button"
          onClick={toggleMute}
          disabled={disabled}
          aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          title={volume === 0 ? 'Unmute' : 'Mute'}
          className={`text-lg select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {getVolumeIcon(volume)}
        </button>
        
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            disabled={disabled}
            className="w-full volume-slider cursor-pointer"
            style={sliderStyle}
            aria-label="Volume"
          />
        </div>
        
        <span className="text-sm font-medium text-gray-600 w-12 text-right">
          {volumePercentage}%
        </span>
      </div>
    </>
  );
};

export default VolumeControl;
