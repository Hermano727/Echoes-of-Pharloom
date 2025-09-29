// src/utils/audioManager.ts

export interface AudioArea {
  name: string;
  displayName: string;
  audioPath: string;
}

export interface AudioState {
  isLoaded: boolean;
  isPlaying: boolean;
  error: string | null;
  volume: number;
  currentTime: number;
  duration: number;
}

export class AudioManager {
  private audioElement: HTMLAudioElement;
  private onStateChange: (state: AudioState) => void;
  private state: AudioState = {
    isLoaded: false,
    isPlaying: false,
    error: null,
    volume: 0.7,
    currentTime: 0,
    duration: 0,
  };

  constructor(
    audioElement: HTMLAudioElement,
    onStateChange: (state: AudioState) => void
  ) {
    this.audioElement = audioElement;
    this.onStateChange = onStateChange;
    this.setupEventListeners();
    
    // Set initial volume
    this.audioElement.volume = 0.7;
  }

  private setupEventListeners(): void {
    const audio = this.audioElement;

    // Clear any existing listeners first
    const events = ['loadstart', 'canplay', 'canplaythrough', 'error', 'play', 'pause', 'timeupdate', 'volumechange', 'waiting', 'loadedmetadata'];
    events.forEach(event => {
      audio.removeEventListener(event, this.handleEvent);
    });

    // Add single event handler for all events
    events.forEach(event => {
      audio.addEventListener(event, this.handleEvent);
    });
  }

  private handleEvent = (event: Event): void => {
    const audio = this.audioElement;
    
    switch (event.type) {
      case 'loadstart':
        this.updateState({
          isLoaded: false,
          error: null,
          duration: 0,
          currentTime: 0,
        });
        break;
        
      case 'loadedmetadata':
      case 'canplay':
        this.updateState({
          duration: audio.duration || 0,
        });
        break;
        
      case 'canplaythrough':
        this.updateState({
          isLoaded: true,
          error: null,
          duration: audio.duration || 0,
        });
        break;
        
      case 'error':
        const target = event.target as HTMLAudioElement;
        let errorMessage = 'Failed to load audio file';
        
        if (target.error) {
          switch (target.error.code) {
            case target.error.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error loading audio';
              break;
            case target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Audio format not supported';
              break;
            default:
              errorMessage = `Audio error (code: ${target.error.code})`;
          }
        }
        
        this.updateState({
          isLoaded: false,
          error: errorMessage,
          isPlaying: false,
        });
        break;
        
      case 'play':
        this.updateState({ 
          isPlaying: true, 
          error: null 
        });
        break;
        
      case 'pause':
        this.updateState({ 
          isPlaying: false 
        });
        break;
        
      case 'timeupdate':
        this.updateState({ 
          currentTime: audio.currentTime 
        });
        break;
        
      case 'volumechange':
        this.updateState({ 
          volume: audio.volume 
        });
        break;
        
      case 'waiting':
        this.updateState({ 
          error: 'Buffering...' 
        });
        break;
    }
  };

  private updateState(partialState: Partial<AudioState>): void {
    this.state = { ...this.state, ...partialState };
    this.onStateChange(this.state);
  }

  public async loadArea(area: AudioArea): Promise<void> {
    // Set the new source first.
    // The path is now relative to the public folder.
    this.audioElement.src = area.audioPath.startsWith('/') ? area.audioPath : `/${area.audioPath}`;

    // Reset state before loading
    this.updateState({
    isLoaded: false,
    error: null,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    });
    
    // Stop and load
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    
    // Force reload
    this.audioElement.load();
  }

  public async play(): Promise<void> {
    try {
      // Clear any previous error
      if (this.state.error && this.state.error.includes('prevented')) {
        this.updateState({ error: null });
      }
      
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (error: any) {
      let errorMessage = 'Failed to play audio';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Autoplay prevented. Click to enable audio.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Playback interrupted. Try again.';
      }
      
      this.updateState({ error: errorMessage });
      throw error;
    }
  }

  public pause(): void {
    this.audioElement.pause();
  }

  public reset(): void {
    this.audioElement.currentTime = 0;
    this.updateState({ currentTime: 0 });
  }

  public setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.audioElement.volume = clampedVolume;
  }

  public async loadAndPlayArea(area: AudioArea): Promise<void> {
    await this.loadArea(area);
    await this.waitForCanPlay();
    await this.play();
  }

  private waitForCanPlay(): Promise<void> {
    return new Promise(resolve => {
      const audio = this.audioElement;
      if (audio.readyState >= 3) {
        resolve();
        return;
      }
      const onReady = () => {
        audio.removeEventListener('canplay', onReady);
        audio.removeEventListener('canplaythrough', onReady);
        resolve();
      };
      audio.addEventListener('canplay', onReady, { once: true } as any);
      audio.addEventListener('canplaythrough', onReady, { once: true } as any);
    });
  }

  public async crossfadeTo(area: AudioArea, durationMs = 800): Promise<void> {
    // Simple fade-out then fade-in using single element
    const startVol = this.audioElement.volume;
    const fadeOutMs = Math.max(150, Math.floor(durationMs / 2));
    const fadeInMs = Math.max(150, durationMs - fadeOutMs);

    await this.fadeVolume(startVol, 0, fadeOutMs);
    await this.loadArea(area);
    // Start playback at zero volume then fade in
    this.audioElement.volume = 0;
    try { await this.play(); } catch {}
    await this.fadeVolume(0, startVol, fadeInMs);
  }

  private async fadeVolume(from: number, to: number, durationMs: number): Promise<void> {
    return new Promise(resolve => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const v = from + (to - from) * t;
        this.audioElement.volume = Math.max(0, Math.min(1, v));
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  public getState(): AudioState {
    return { ...this.state };
  }

  public cleanup(): void {
    const events = ['loadstart', 'canplay', 'canplaythrough', 'error', 'play', 'pause', 'timeupdate', 'volumechange', 'waiting', 'loadedmetadata'];
    events.forEach(event => {
      this.audioElement.removeEventListener(event, this.handleEvent);
    });
  }
}