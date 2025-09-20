import React, { useEffect, useRef, useState } from 'react';
import { STUDY_AREAS } from '../config/areas';

interface AreaSelectorProps {
  selectedAreaName: string;
  onAreaChange: (areaName: string) => void;
}

const AreaSelector: React.FC<AreaSelectorProps> = ({ selectedAreaName, onAreaChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const selected = STUDY_AREAS[selectedAreaName];

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onEsc);
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onEsc); };
  }, []);

  return (
    <div ref={ref} className="relative select-none">
      <button
        onClick={() => setOpen(o => !o)}
        className="px-4 py-2 rounded-full bg-black/45 hover:bg-black/60 text-white border border-white/25 shadow-sm transition flex items-center gap-2"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Choose area"
      >
        <span className="tracking-wide">{selected?.displayName ?? 'Select Area'}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>

      {open && (
        <div role="listbox" className="absolute left-0 bottom-full mb-2 w-56 bg-black/80 backdrop-blur-md border border-white/20 rounded-md shadow-lg overflow-hidden">
          {Object.values(STUDY_AREAS).map(area => {
            const active = area.name === selectedAreaName;
            return (
              <div
                key={area.name}
                role="option"
                aria-selected={active}
                onClick={() => { onAreaChange(area.name); setOpen(false); }}
                className={`px-4 py-2 cursor-pointer transition ${active ? 'bg-blue-700/60 text-white' : 'hover:bg-white/10 text-white/90'}`}
              >
                <span className="tracking-wide">{area.displayName}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AreaSelector;
