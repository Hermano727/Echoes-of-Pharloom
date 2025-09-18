import React from 'react';

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
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    onVolumeChange(newVolume);
  };

  const getVolumeIcon = (vol: number) => {
    if (vol === 0) return '🔇';
    if (vol < 0.3) return '🔈';
    if (vol < 0.7) return '🔉';
    return '🔊';
  };

  const volumePercentage = Math.round(volume * 100);

  const sliderStyle: React.CSSProperties = {
    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volumePercentage}%, #e5e7eb ${volumePercentage}%, #e5e7eb 100%)`,
  };

  return (
    <>
      <style>{`
        .volume-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          border-radius: 4px;
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
          transform: scale(1.15);
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
          transform: scale(1.15);
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
      
      <div className="volume-control flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
        <span className="text-lg" title={`Volume: ${volumePercentage}%`}>
          {getVolumeIcon(volume)}
        </span>
        
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
          />
        </div>
        
        <span className="text-sm font-medium text-gray-600 w-10 text-right">
          {volumePercentage}%
        </span>
      </div>
    </>
  );
};

export default VolumeControl;