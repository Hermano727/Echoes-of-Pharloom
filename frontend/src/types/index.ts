// src/types/index.ts

// Shared types across the application
export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
}

export interface StudySession {
  id: string;
  userId: string;
  areaName: string;
  duration: number; // in seconds
  completedAt: Date;
  label?: string;
  category?: string;
  notes?: string;
}

export interface StudyStreak {
  consecutiveDays: number;
  consecutiveSessions: number;
  lastStudyDate: Date;
}

// For future features
export interface SessionHistory {
  sessions: StudySession[];
  totalTime: number;
  streaks: StudyStreak;
}

// Export everything from other modules for convenience
export type { AudioArea, AudioState } from '../utils/audioManager';
export type { TimerConfig } from '../utils/timerUtils';