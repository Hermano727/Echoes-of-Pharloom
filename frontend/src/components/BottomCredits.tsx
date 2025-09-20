import React, { useEffect, useState } from 'react';
import { getAreaByName } from '../config/areas';

interface BottomCreditsProps {
  areaName: string;
}

const BottomCredits: React.FC<BottomCreditsProps> = ({ areaName }) => {
  const area = getAreaByName(areaName);
  const [entered, setEntered] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setEntered(false);
    setSettled(false);
    const t1 = setTimeout(() => setEntered(true), 50);
    const t2 = setTimeout(() => setSettled(true), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [areaName]);

  if (!area) return null;

  return (
    <div className={`absolute left-4 bottom-24 md:bottom-24 text-white text-sm md:text-base px-3 py-2 rounded shadow pointer-events-none select-none transition-all duration-700 ${entered ? 'bg-black/45 opacity-100 translate-y-0' : 'bg-black/45 opacity-0 translate-y-2'} ${settled ? 'opacity-75' : ''}`}>
      <div className="flex items-center space-x-2">
        <span className="inline-block w-5 h-5 rounded-sm bg-white bg-opacity-20 text-center leading-5">♪</span>
        <div className="leading-tight">
          <div className="font-semibold tracking-wide">{area.displayName}</div>
          <div className="opacity-80">Music: Christopher Larkin</div>
        </div>
      </div>
    </div>
  );
};

export default BottomCredits;
