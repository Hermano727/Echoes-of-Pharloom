import React from 'react';

type FloatingFeedbackProps = {
  bottomOffset?: number; // px offset from bottom if needed
  onOpen?: (type: 'feedback' | 'bug') => void;
};

const FloatingFeedback: React.FC<FloatingFeedbackProps> = ({ bottomOffset = 16, onOpen }) => {
  const style: React.CSSProperties = { bottom: bottomOffset };
  return (
    <div className="fixed right-4 z-40 flex flex-col gap-2 pointer-events-auto" style={style}>
      {onOpen ? (
        <>
          <button onClick={() => onOpen('feedback')} className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/30 text-xs tracking-wide">Feedback</button>
          <button onClick={() => onOpen('bug')} className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/30 text-xs tracking-wide">Report a bug</button>
        </>
      ) : (
        <>
          <a href={`mailto:echoesofpharloom@gmail.com?subject=Echoes%20Feedback`} className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/30 text-xs tracking-wide">Feedback</a>
          <a href={`mailto:echoesofpharloom@gmail.com?subject=Echoes%20Bug%20Report`} className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/30 text-xs tracking-wide">Report a bug</a>
        </>
      )}
    </div>
  );
};

export default FloatingFeedback;