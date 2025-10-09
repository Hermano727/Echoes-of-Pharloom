import React, { useState } from 'react';

type Props = {
  open: boolean;
  type: 'feedback' | 'bug' | null;
  onClose: () => void;
  onSubmit?: (payload: { type: 'feedback' | 'bug'; email?: string; subject: string; message: string }) => void;
};

const FeedbackModal: React.FC<Props> = ({ open, type, onClose, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  if (!open || !type) return null;

  const title = type === 'bug' ? 'Report a bug' : 'Send feedback';

  const submit = () => {
    const payload = { type, email: email || undefined, subject: subject || (type === 'bug' ? 'Bug report' : 'Feedback'), message };
    onSubmit?.(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-black/70 border border-white/20 rounded-xl p-5 w-full max-w-md text-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg tracking-wide">{title}</h2>
          <button onClick={onClose} className="px-2 py-1 rounded bg-white/15 hover:bg-white/25">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm opacity-80 mb-1">Your email (optional)</label>
            <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm opacity-80 mb-1">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20" placeholder={type === 'bug' ? 'Describe the issue' : 'Your suggestion'} />
          </div>
          <div>
            <label className="block text-sm opacity-80 mb-1">Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 min-h-[120px]" placeholder={type === 'bug' ? 'Steps to reproduce, expected vs actual...' : 'What would you improve?'} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20">Cancel</button>
          <button onClick={submit} className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/35">Submit</button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;