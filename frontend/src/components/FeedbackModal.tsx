import React, { useState } from 'react';
import { sendFeedback } from '../api';

 type Props = {
   open: boolean;
   type: 'feedback' | 'bug' | null;
   onClose: () => void;
 };
 
 const FeedbackModal: React.FC<Props> = ({ open, type, onClose }) => {
   const [name, setName] = useState('');
   const [email, setEmail] = useState('');
   const [message, setMessage] = useState('');
   const [sending, setSending] = useState(false);
   const [human, setHuman] = useState(false);
   const [honeypot, setHoneypot] = useState('');
   const [done, setDone] = useState(false);
 
   if (!open || !type) return null;
 
   const title = type === 'bug' ? 'Report a bug' : 'Send feedback';
 
   const submit = async () => {
     if (!human) return; // simple captcha gate
     try {
       setSending(true);
       const res: any = await sendFeedback({ type, name: name || 'Anonymous', email, message, company: honeypot });
       // Treat HTTP 200 as success
       setDone(true);
       setName(''); setEmail(''); setMessage('');
     } catch (err) {
       // surface a basic error; keep modal open
       alert('Failed to send message. Please try again later.');
     } finally {
       setSending(false);
     }
   };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-black/70 border border-white/20 rounded-xl p-5 w-full max-w-md text-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg tracking-wide">{title}</h2>
            <button onClick={onClose} className="px-2 py-1 rounded bg-white/15 hover:bg-white/25">✕</button>
          </div>
          {done && (
            <div className="mb-3 px-3 py-2 rounded bg-green-700/30 border border-green-600/40 text-sm">Message sent successfully. Thank you!</div>
          )}
        <div className="space-y-3">
           <div>
             <label className="block text-sm opacity-80 mb-1">Your name</label>
             <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20" placeholder="Name" />
           </div>
           <div>
             <label className="block text-sm opacity-80 mb-1">Your email (optional)</label>
             <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20" placeholder="you@example.com" />
           </div>
           <div>
             <label className="block text-sm opacity-80 mb-1">Message</label>
             <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 min-h-[120px]" placeholder={type === 'bug' ? 'Steps to reproduce, expected vs actual...' : 'What would you improve?'} />
           </div>
         </div>
         {/* Honeypot (hidden) */}
         <input type="text" value={honeypot} onChange={e=>setHoneypot(e.target.value)} className="hidden" tabIndex={-1} aria-hidden={true} />
         <div className="mt-3 flex items-center gap-2 text-sm">
           <input id="human" type="checkbox" checked={human} onChange={(e)=>setHuman(e.target.checked)} />
           <label htmlFor="human" className="opacity-80">I’m not a bot</label>
         </div>
         <div className="mt-4 flex justify-end gap-2">
           <button onClick={()=>{ setDone(false); onClose(); }} className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20">{done ? 'Close' : 'Cancel'}</button>
           {!done && (
             <button onClick={submit} disabled={sending || !human} className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/35 disabled:opacity-50">{sending ? 'Sending...' : 'Submit'}</button>
           )}
         </div>
      </div>
    </div>
  );
};

export default FeedbackModal;