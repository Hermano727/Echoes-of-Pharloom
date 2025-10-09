import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomeButton: React.FC = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/')}
      className="fixed top-4 left-4 z-40 p-2 rounded-full bg-white/15 hover:bg-white/30 transition"
      aria-label="Home"
      title="Home"
    >
      <img src="/assets/ui/home.svg" alt="Home" className="w-6 h-6" />
    </button>
  );
};

export default HomeButton;