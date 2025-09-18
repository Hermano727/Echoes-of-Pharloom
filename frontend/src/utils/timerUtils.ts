// src/utils/timerUtils.ts

export interface TimerConfig {
  defaultDuration: number;
  breakDuration?: number;
  maxBreakDuration?: number;
}

export interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
}

export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  defaultDuration: 1800, // 30 minutes
  breakDuration: 300, // 5 minutes
  maxBreakDuration: 900, // 15 minutes max
};

export const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const formatTimeDetailed = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

export const validateTimerDuration = (duration: number): { isValid: boolean; message?: string } => {
  if (duration < 60) {
    return { isValid: false, message: 'Timer must be at least 1 minute' };
  }
  if (duration > 7200) { // 2 hours max
    return { isValid: false, message: 'Timer cannot exceed 2 hours' };
  }
  return { isValid: true };
};

export const validateBreakDuration = (duration: number, maxDuration: number = 900): { isValid: boolean; message?: string } => {
  if (duration < 60) {
    return { isValid: false, message: 'Break must be at least 1 minute' };
  }
  if (duration > maxDuration) {
    return { 
      isValid: false, 
      message: `Seriously? ${formatTimeDetailed(duration)} break? Get back to studying! 📚 (Max: ${formatTimeDetailed(maxDuration)})` 
    };
  }
  return { isValid: true };
};