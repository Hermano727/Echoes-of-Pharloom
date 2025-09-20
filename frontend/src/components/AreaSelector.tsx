import React from 'react';
import { STUDY_AREAS } from '../config/areas';

interface AreaSelectorProps {
  selectedAreaName: string;
  onAreaChange: (areaName: string) => void;
}

const AreaSelector: React.FC<AreaSelectorProps> = ({ selectedAreaName, onAreaChange }) => (
  <div className="relative">
    <select
      value={selectedAreaName}
      onChange={(e) => onAreaChange(e.target.value)}
      className="bg-white bg-opacity-20 rounded-full px-4 py-2 text-white appearance-none cursor-pointer pr-10 transition-colors hover:bg-opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {Object.values(STUDY_AREAS).map(area => (
        <option key={area.name} value={area.name} className="bg-black text-white">
          {area.displayName}
        </option>
      ))}
    </select>
  </div>
);

export default AreaSelector;