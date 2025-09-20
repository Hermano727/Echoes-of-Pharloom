# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project scope and layout
- This repo currently contains a React + TypeScript frontend under frontend/ (bootstrapped with Create React App). The root README mentions a future backend, but there is no backend code yet.

Common commands (run in frontend/)
- Install deps
```bash path=null start=null
npm ci
```
- Start dev server (http://localhost:3000)
```bash path=null start=null
npm start
```
- Type-check (no emit)
```bash path=null start=null
npx tsc --noEmit
```
- Build production bundle (outputs to frontend/build)
```bash path=null start=null
npm run build
```

Testing
- Run all tests (watch mode)
```bash path=null start=null
npm test
```
- Run tests once (disable watch) in PowerShell
```powershell path=null start=null
$env:CI = 'true'; npm test -- --watchAll=false
```
- Run a single test file or pattern (examples)
```bash path=null start=null
# by file name substring or path
npm test -- TimerControls
npm test -- src/components/TimerControls.test.tsx

# by test name pattern
npm test -- -t "renders timer"
```

Linting
- ESLint is integrated via react-scripts; lint errors surface during npm start and npm run build. There is no standalone lint script in package.json.

Styling
- TailwindCSS is configured (tailwind.config.js) with content globs for ./src/**/*.{js,jsx,ts,tsx}. Utility classes are used directly in JSX.

High-level architecture
- Application shell: frontend/src/App.tsx orchestrates the study timer, area selection, audio and video playback, and UI toggles (collapse/debug). It persists basic timer state in localStorage under the studyTimerState key.
- Areas/config: frontend/src/config/areas.ts defines StudyArea and the STUDY_AREAS map, which provides display names and asset paths for audio and background video. App uses this to load the current area’s media.
- Media management: AudioManager and VideoManager (defined in App.tsx and/or utils) wrap HTMLAudioElement/HTMLVideoElement, subscribe to media events (loadeddata, play, pause, error, timeupdate, volumechange), and expose play/pause/load/reset and volume control. App holds them in useRef and initializes them once, updating React state via callbacks.
- UI components: TimerControls (frontend/src/components/TimerControls.tsx) renders Play/Pause, Reset, Collapse/Expand, Debug toggle, and a VolumeControl. It consumes AudioState and callbacks from App. The layout uses Tailwind utility classes.
- State and timing: App maintains a TimerState { timeLeft, isRunning, selectedAreaName } and drives a 1-second interval when running. formatTime renders mm:ss. Changing areas resets the timer and reloads media for the selected area.
- Assets contract: Code references assets under /assets/... (e.g., /assets/sounds/..., /assets/videos/..., and overlay images). Ensure the dev server serves these from public/assets/.

Important notes from README
- Purpose: “Echoes of Pharloom” is a Hollow Knight: Silksong–inspired study timer with immersive audio/video. Frontend is React + TypeScript; backend and Docker deployment are planned but not present.
