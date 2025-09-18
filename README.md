# Echoes of Pharloom

Echoes of Pharloom is a study and productivity app inspired by *Hollow Knight: Silksong*.  
It combines the Pomodoro technique with immersive soundscapes and game-inspired mechanics to make studying more engaging.

## Features (MVP)
- Select Pharloom area soundtracks as your study background  
- Customizable study timer (default: 30 + 30 with a short break)  
- Focus mode: leaving the app reduces Hornet’s masks (stay focused to survive)  
- Session streaks: track consecutive days and focus sessions  
- Notes per session (takeaways, accomplishments)

## Planned Features
- Two-area sessions (auto-switch soundtracks halfway through)  
- User accounts with saved history  
- Steam account linking for achievement integration  
- Custom start animations and interactive study scenes  

## Tech Stack
- **Frontend:** React + TypeScript  
- **State Management:** React hooks (later Redux if needed)  
- **Backend (planned):** Python/FastAPI or Node.js (to be decided)  
- **Database:** Firebase / MongoDB (for auth + session storage)  
- **Deployment:** Dockerized for dev and deployment flexibility  

## Credits and Disclaimer
This project is a fan-made study tool inspired by *Hollow Knight: Silksong*.  
All credit for music and assets belongs to **Team Cherry** and **Christopher Larkin** (composer of the soundtrack).  
This project is non-commercial and claims no ownership of any original assets.

## Project Setup
```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/echoes-of-pharloom.git

# Install dependencies
cd echoes-of-pharloom
npm install

# Run dev server
npm start
