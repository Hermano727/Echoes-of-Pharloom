import React from 'react';
import { getAreaByName } from '../config/areas';

interface BottomCreditsProps {
  areaName: string;
}

const BottomCredits: React.FC<BottomCreditsProps> = ({ areaName }) => {
  const area = getAreaByName(areaName);
  if (!area) return null;

  return (
    <div className="absolute left-4 bottom-24 md:bottom-24 text-white text-sm md:text-base bg-black bg-opacity-40 px-3 py-2 rounded shadow pointer-events-none select-none">
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