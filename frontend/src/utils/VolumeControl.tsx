import React, { useMemo, useRef } from 'react';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'compact';
  onAction?: (action: 'mute' | 'unmute') => void;
  revealOnHover?: boolean; // when true (vertical+compact), only show slider on hover
  placement?: 'inline' | 'popover';
}

const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  onVolumeChange,
  disabled = false,
  orientation = 'horizontal',
  variant = 'default',
  onAction,
  revealOnHover = false,
  placement = 'inline',
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
      onAction?.('unmute');
    } else {
      onVolumeChange(0);
      onAction?.('mute');
    }
  };

  const getVolumeIcon = (vol: number) => {
    const src = vol === 0 ? '/assets/ui/mute.svg' : '/assets/ui/unmute.svg';
    const alt = vol === 0 ? 'Muted' : 'Unmuted';
    return <img src={src} alt={alt} className="w-5 h-5" />;
  };

  const volumePercentage = Math.round(volume * 100);

  const sliderStyle: React.CSSProperties = useMemo(() => ({
    background: `linear-gradient(to right, #e5dfd3 0%, #e5dfd3 ${volumePercentage}%, rgba(229, 231, 235, 0.4) ${volumePercentage}%, rgba(229, 231, 235, 0.4) 100%)`,
  }), [volumePercentage]);

  const vertical = orientation === 'vertical';
  const compact = variant === 'compact';

  const [hovered, setHovered] = React.useState(false);

  return (
    <>
      <style>{`
        .volume-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          border-radius: 6px;
          outline: none;
          transition: all 0.2s ease;
        }
        
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #d6d3d1;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.35);
        }
        
        .volume-slider::-webkit-slider-thumb:hover {
          background: #e7e2dc;
          transform: scale(1.07);
          box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        }
        
        .volume-slider::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #d6d3d1;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.35);
        }
        
        .volume-slider::-moz-range-thumb:hover {
          background: #e7e2dc;
          transform: scale(1.07);
          box-shadow: 0 3px 6px rgba(0,0,0,0.4);
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
      
      <div
        className={[
          'volume-control relative',
          vertical ? 'flex flex-col items-center' : 'flex items-center space-x-3',
          compact ? 'bg-black/40 rounded-full backdrop-blur-sm' : 'p-3 bg-gray-50 rounded-lg shadow-sm',
          vertical ? 'w-auto' : 'min-w-[12rem] w-full',
          'group'
        ].join(' ')}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Slider */}
        {vertical && (!revealOnHover || hovered) && placement === 'inline' && (
          <div className='flex items-center justify-center w-9 h-44 pt-2 pb-1'>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              disabled={disabled}
              className={[
                'volume-slider cursor-pointer',
                vertical ? 'w-44 rotate-[-90deg]' : 'w-full',
              ].join(' ')}
              style={sliderStyle}
              aria-label="Volume"
            />
          </div>
        )}

        {vertical && revealOnHover && placement === 'popover' && hovered && (
<div className='absolute bottom-full right-0 mb-2 w-10 h-48 bg-black/55 rounded-full backdrop-blur-sm shadow-lg flex items-center justify-center pointer-events-auto z-30'>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              disabled={disabled}
              className='volume-slider cursor-pointer w-44 rotate-[-90deg]'
              style={sliderStyle}
              aria-label="Volume"
            />
          </div>
        )}

        {/* Mute button at bottom for vertical */}
        <button
          type="button"
          onClick={toggleMute}
          disabled={disabled}
          aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          title={volume === 0 ? 'Unmute' : 'Mute'}
          className={`text-lg select-none m-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {getVolumeIcon(volume)}
        </button>
      </div>
      </>
  );
};

export default VolumeControl;
