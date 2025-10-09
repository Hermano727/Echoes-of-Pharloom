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

  // Use CSS variable for track fill so it applies to ::-webkit-slider-runnable-track and ::-moz-range-track
  const sliderStyle: React.CSSProperties = useMemo(() => ({
    ['--fill' as any]: `${volumePercentage}%`,
  }), [volumePercentage]);

  const vertical = orientation === 'vertical';
  const compact = variant === 'compact';

  const [anchorHover, setAnchorHover] = React.useState(false);
  const [popoverHover, setPopoverHover] = React.useState(false);
  const hideTimerRef = React.useRef<number | null>(null);

  const setAnchorHoverSafe = (val: boolean) => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (!val) {
      // small delay to allow moving into popover without flicker
      hideTimerRef.current = window.setTimeout(() => {
        setAnchorHover(false);
      }, 120);
    } else {
      setAnchorHover(true);
    }
  };

  const visible = vertical && revealOnHover && placement === 'popover' ? (anchorHover || popoverHover) : undefined;

  return (
    <>
      <style>{`
        @keyframes vc-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .volume-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 14px; /* fallback for engines that honor element height */
          border-radius: 8px;
          outline: none;
          background: transparent; /* track background set on runnable track */
          transition: all 0.2s ease;
        }
        /* WebKit/Blink track */
        .volume-slider::-webkit-slider-runnable-track {
          height: 14px;
          border-radius: 8px;
          background: linear-gradient(to right,
            #e5dfd3 0%,
            #e5dfd3 var(--fill, 50%),
            rgba(229,231,235,0.4) var(--fill, 50%),
            rgba(229,231,235,0.4) 100%);
        }
        /* Gecko track */
        .volume-slider::-moz-range-track {
          height: 14px;
          border-radius: 8px;
          background: linear-gradient(to right,
            #e5dfd3 0%,
            #e5dfd3 var(--fill, 50%),
            rgba(229,231,235,0.4) var(--fill, 50%),
            rgba(229,231,235,0.4) 100%);
        }
        
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 22px;
          width: 22px;
          margin-top: -4px; /* visually center on taller track */
          border-radius: 50%;
          background: #d6d3d1;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.35);
        }
        
        .volume-slider::-webkit-slider-thumb:hover {
          background: #e7e2dc;
          transform: scale(1.06);
          box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        }
        
        .volume-slider::-moz-range-thumb {
          height: 22px;
          width: 22px;
          border-radius: 50%;
          background: #d6d3d1;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.35);
        }
        
        .volume-slider::-moz-range-thumb:hover {
          background: #e7e2dc;
          transform: scale(1.06);
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
          vertical ? 'w-auto px-2 py-2' : 'min-w-[12rem] w-full',
          'group'
        ].join(' ')}
        onMouseEnter={() => setAnchorHoverSafe(true)}
        onMouseLeave={() => setAnchorHoverSafe(false)}
      >
        {/* Slider */}
        {vertical && (!revealOnHover || anchorHover) && placement === 'inline' && (
          <div className='relative flex items-center justify-center w-9 h-44'>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              disabled={disabled}
              className='volume-slider cursor-pointer absolute'
              style={{ ...(sliderStyle as any), width: '176px', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
              aria-label="Volume"
            />
          </div>
        )}

        {vertical && revealOnHover && placement === 'popover' && visible && (
          <div
            className='absolute bottom-full right-0 mb-2 w-12 h-56 bg-black/55 rounded-full backdrop-blur-sm shadow-lg flex items-center justify-center pointer-events-auto z-30'
            onMouseEnter={() => setPopoverHover(true)}
            onMouseLeave={() => setPopoverHover(false)}
            style={{ animation: 'vc-fade 180ms ease-out' }}
          >
            <div className='relative w-12 h-56'>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                disabled={disabled}
                className='volume-slider cursor-pointer absolute'
                style={{ ...(sliderStyle as any), width: '224px', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
                aria-label="Volume"
              />
            </div>
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
