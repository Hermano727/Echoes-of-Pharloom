// src/config/areas.ts

import type { AudioArea } from '../utils/audioManager';

export const STUDY_AREAS: Record<string, AudioArea> = {
  boneBottom: {
    name: 'boneBottom',
    displayName: 'Bone Bottom',
    audioPath: '/assets/sounds/bone_bottom.mp3',
  },
  choralChambers: {
    name: 'choralChambers',
    displayName: 'Choral Chambers',
    audioPath: '/assets/sounds/choral_chambers.mp3',
  },
  farFields: {
    name: 'farFields',
    displayName: 'Far Fields',
    audioPath: '/sounds/farfields.mp3',
  },
  huntersPath: {
    name: 'huntersPath',
    displayName: "Hunter's Path",
    audioPath: '/sounds/hunters_path.mp3',
  },
};

export const getAreaByName = (name: string): AudioArea | undefined => {
  return STUDY_AREAS[name as keyof typeof STUDY_AREAS];
};

export const getAllAreas = (): AudioArea[] => {
  return Object.values(STUDY_AREAS);
};