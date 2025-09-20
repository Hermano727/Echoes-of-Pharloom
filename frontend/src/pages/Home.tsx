import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white bg-black font-trajan">
      <img
        src="/assets/ui/home_bg.jpg"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl md:text-6xl mb-6 tracking-wide">Echoes of Pharloom</h1>
        <p className="text-lg md:text-xl mb-10 opacity-90 max-w-2xl">
          A Silksong-inspired focus timer with ambient zones and music.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/study')}
            className="px-6 py-3 rounded-full bg-white/20 hover:bg-white/35 transition-colors"
          >
            Start Focus Session
          </button>
          <button
            onClick={() => navigate('/settings', { replace: false })}
            className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            Settings (soon)
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;