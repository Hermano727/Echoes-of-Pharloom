import React from 'react';
import { useNavigate } from 'react-router';
import HomeButton from '../components/HomeButton';
import FloatingFeedback from '../components/FloatingFeedback';
import FeedbackModal from '../components/FeedbackModal';

const Info: React.FC = () => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState<'feedback' | 'bug' | null>(null);
  return (
    <div className="relative w-screen min-h-screen overflow-y-auto text-white bg-black font-trajan">
      <img
        src="/assets/images/home_bg.jpg"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover opacity-65"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto p-6 md:p-10">
        <HomeButton />

        <h1 className="text-3xl md:text-4xl mb-6 tracking-wide">About Echoes of Pharloom</h1>

        <div className="space-y-4 bg-black/40 border border-white/15 rounded-xl p-6">
          <section>
            <h2 className="text-xl mb-2">DISCLAIMER: Unofficial fan project</h2>
            <p className="opacity-90">A Silksong‑inspired study timer with ambient zones, simple streaks, and a clean, video‑backed focus mode.</p>
          </section>
          <section>
            <h2 className="text-xl mb-2">Streaks</h2>
            <ul className="list-disc pl-5 opacity-90 space-y-1">
              <li><strong>Daily</strong>: days in a row with a completed study session.</li>
              <li><strong>Focus</strong>: sessions in a row where you reached the first break without losing focus.</li>
              <li><strong>Total Sessions</strong>: total completed sessions. In the future, this will become the HP “No‑Death” feature.</li>
            </ul>
          </section>
          <section className="opacity-70 text-sm">
            <p>Unofficial fan project. Not affiliated with Team Cherry. For demo and educational purposes only.</p>
          </section>
        </div>
        <FloatingFeedback onOpen={(t) => { setModalType(t); setModalOpen(true); }} />
        <FeedbackModal open={modalOpen} type={modalType} onClose={() => setModalOpen(false)} />
      </div>
    </div>
  );
};

export default Info;