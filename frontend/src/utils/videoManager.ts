import { Dispatch, SetStateAction } from "react";

export interface VideoState {
    isLoaded: boolean;
    isPlaying: boolean;
    error: string | null;
}

export class VideoManager {
    private videoElement: HTMLVideoElement;
    private setVideoState: Dispatch<SetStateAction<VideoState>>;
    private currentVideoUrl: string | null = null;

    constructor(videoElement: HTMLVideoElement, setVideoState: Dispatch<SetStateAction<VideoState>>) {
        this.videoElement = videoElement;
        this.setVideoState = setVideoState;
        this.addEventListeners();
    }

    private addEventListeners(): void {
        this.videoElement.addEventListener('loadeddata', this.handleLoadedData);
        this.videoElement.addEventListener('error', this.handleError);
        this.videoElement.addEventListener('play', this.handlePlay);
        this.videoElement.addEventListener('pause', this.handlePause);
    }

    private removeEventListeners(): void {
        this.videoElement.removeEventListener('loadeddata', this.handleLoadedData);
        this.videoElement.removeEventListener('error', this.handleError);
        this.videoElement.removeEventListener('play', this.handlePlay);
        this.videoElement.removeEventListener('pause', this.handlePause);
    }

    private handleLoadedData = (): void => {
        console.log("Video loaded successfully.");
        this.setVideoState(prevState => ({
            ...prevState,
            isLoaded: true,
            error: null,
        }));
    };

    private handleError = (e: Event): void => {
        console.error("Video loading failed:", e);
        this.setVideoState(prevState => ({
            ...prevState,
            isLoaded: false,
            error: "Failed to load video. Please try again or check the URL.",
        }));
    };

    private handlePlay = (): void => {
        this.setVideoState(prevState => ({ ...prevState, isPlaying: true }));
    };

    private handlePause = (): void => {
        this.setVideoState(prevState => ({ ...prevState, isPlaying: false }));
    };

    public load(videoUrl: string): void {
        if (this.currentVideoUrl === videoUrl) {
            console.log("Video is already loaded, skipping.");
            return;
        }

        this.setVideoState({
            isLoaded: false,
            isPlaying: false,
            error: null,
        });

        this.currentVideoUrl = videoUrl;
        this.videoElement.src = videoUrl;
        this.videoElement.load();
    }

    public play(): Promise<void> {
        return this.videoElement.play();
    }

    public pause(): void {
        this.videoElement.pause();
    }

    public reset(): void {
        this.pause();
        this.videoElement.currentTime = 0;
    }

    public cleanup(): void {
        this.pause();
        this.videoElement.src = ''; // Clear source to stop fetching
        this.removeEventListeners();
        console.log("VideoManager cleaned up.");
    }
}
