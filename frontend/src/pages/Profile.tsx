import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { computeStreaks, getRecentSessions } from '../local/data';
import FloatingFeedback from '../components/FloatingFeedback';
import FeedbackModal from '../components/FeedbackModal';
import { getAuthConfig } from '../config/auth';
import { updateProfile } from '../api';

// In-app reset (Cognito ForgotPassword + ConfirmForgotPassword)
const InAppReset: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [newPass, setNewPass] = React.useState('');
  const [phase, setPhase] = React.useState<'idle'|'sent'|'done'|'error'>('idle');
  const [msg, setMsg] = React.useState<string>('');
  const cfg = getAuthConfig();

  const call = async (target: string, body: any) => {
    if (!cfg.region) throw new Error('Cognito region not configured');
    if (!cfg.clientId) throw new Error('Cognito clientId not configured');
    const url = `https://cognito-idp.${cfg.region}.amazonaws.com/`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-amz-json-1.1',
        'x-amz-target': `AWSCognitoIdentityProviderService.${target}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(()=>'');
      throw new Error(`Cognito ${target} failed: ${res.status} ${detail}`);
    }
    return res.json().catch(() => ({}));
  };

  const sendCode = async () => {
    try {
      setMsg('Sending code...'); setPhase('idle');
      await call('ForgotPassword', { ClientId: cfg.clientId, Username: email });
      setPhase('sent'); setMsg('Verification code sent. Check your email.');
    } catch (e: any) {
      setPhase('error'); setMsg(e.message || 'Failed to send code');
    }
  };


  const confirm = async () => {
    try {
      // Client-side validation first
      if (!newPass) {
        setPhase('error');
        setMsg('New password cannot be empty');
        return;
      }

      const errors = validatePassword(newPass);
      if (errors.length > 0) {
        setPhase('error');
        setMsg(`Password must contain ${errors.join(', ')}`);
        return;
      }

      setMsg('Confirming...');
      await call('ConfirmForgotPassword', { ClientId: cfg.clientId, Username: email, ConfirmationCode: code, Password: newPass });
      setPhase('done'); setMsg('Password reset. You can sign in with the new password.');
    } catch (e: any) {
      setPhase('error'); setMsg(e.message || 'Failed to reset');
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm opacity-80 mb-1">Email / Username</label>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded" placeholder="you@example.com" />
        </div>
        <div className="flex items-end">
          <button onClick={sendCode} className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25">Send reset code</button>
        </div>
      </div>
      {phase === 'sent' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm opacity-80 mb-1">Verification code</label>
            <input value={code} onChange={(e)=>setCode(e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded" />
          </div>
          <div>
            <label className="block text-sm opacity-80 mb-1">New password</label>
            <input type="password" value={newPass} onChange={(e)=>setNewPass(e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded" />
          </div>
          <div className="flex items-end">
            <button onClick={confirm} className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/35">Confirm reset</button>
          </div>
        </div>
      )}
      {msg && <div className="text-xs opacity-80">{msg}</div>}
    </div>
  );
};

const validatePassword = (pwd: string) => {
  const errors = [];
  if (pwd.length < 8) errors.push('at least 8 characters');
  if (!/[A-Z]/.test(pwd)) errors.push('an uppercase letter');
  if (!/[a-z]/.test(pwd)) errors.push('a lowercase letter');
  if (!/[0-9]/.test(pwd)) errors.push('a number');
  if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('a special character');
  return errors;
}

const ChangePassword: React.FC = () => {
  const [curr, setCurr] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const cfg = getAuthConfig();

  const change = async () => {
    try {
      if (next !== confirm) { setMsg('Passwords do not match'); return; }

      if (!cfg.region) { setMsg('Region not configured'); return; }

      if (!next) { setMsg('New password cannot be empty'); return; }

      const errors = validatePassword(next);
      if (errors.length > 0) {
        setMsg(`Password must contain ${errors.join(', ')}`);
        return;
      }

      const raw = localStorage.getItem('authTokens');
      const tok = raw ? JSON.parse(raw) : null;
      const access = tok?.access_token;

      if (!access) { setMsg('Missing access token; sign in again'); return; }

      const url = `https://cognito-idp.${cfg.region}.amazonaws.com/`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'AWSCognitoIdentityProviderService.ChangePassword' },
        body: JSON.stringify({ PreviousPassword: curr, ProposedPassword: next, AccessToken: access })
      });

      if (!res.ok) { const t = await res.text().catch(()=> ''); throw new Error(`ChangePassword failed: ${res.status} ${t}`); }
      setMsg('Password changed successfully');

    } catch (e: any) { setMsg(e.message || 'Change password failed'); }
  };

  return (
    <div className="bg-black/25 border border-white/10 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-wide">Change password</h3>
        <div className="text-xs text-white/60">Keep your account secure</div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs uppercase tracking-wider text-white/60 mb-1">Current password</label>
          <input
            type="password"
            value={curr}
            onChange={(e) => setCurr(e.target.value)}
            className="w-full bg-transparent border border-white/12 rounded-md px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30"
            placeholder="Enter current password"
            aria-label="Current password"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/60 mb-1">New password</label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="w-full bg-transparent border border-white/12 rounded-md px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30"
            placeholder="Choose a strong password"
            aria-label="New password"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/60 mb-1">Confirm new password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-transparent border border-white/12 rounded-md px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30"
            placeholder="Repeat new password"
            aria-label="Confirm new password"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-xs text-white/60">
          Password must be at least 8 characters and include an uppercase, lowercase, number and symbol.
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setCurr(''); setNext(''); setConfirm(''); setMsg(''); }}
            className="px-4 py-2 rounded-md bg-white/6 hover:bg-white/8 text-sm transition"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={change}
            className="px-4 py-2 rounded-md bg-white/20 hover:bg-white/30 text-sm font-semibold transition"
          >
            Change password
          </button>
        </div>
      </div>

      {msg && <div className="text-sm text-white/70 pt-1">{msg}</div>}
    </div>
  );
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const fromStudy = Boolean(location?.state?.fromStudy || localStorage.getItem('resumeStudy'));
  const { user, isAuthenticated, signOut } = useAuth();
  const streaks = useMemo(() => computeStreaks(), []);
  const sessions = useMemo(() => getRecentSessions(10), []);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState<'feedback' | 'bug' | null>(null);

  const [tab, setTab] = React.useState<'overview' | 'info' | 'privacy'>('overview');
  const [photo, setPhoto] = React.useState<string | null>(() => {
    try { return localStorage.getItem('profilePhoto') || null; } catch { return null; }
  });
  const [nameDraft, setNameDraft] = React.useState<string>(user?.name || '');
  const [savingProfile, setSavingProfile] = React.useState<'idle'|'saving'|'saved'|'error'>('idle');
  const saveProfile = async () => {
    try {
      setSavingProfile('saving');
      try {
        await updateProfile({ name: nameDraft });
      } catch {
        // Fallback to local if API not configured
        localStorage.setItem('profileName', nameDraft);
      }
      setSavingProfile('saved');
      setTimeout(()=>setSavingProfile('idle'), 1200);
    } catch {
      setSavingProfile('error');
      setTimeout(()=>setSavingProfile('idle'), 1600);
    }
  };

  const onUpload = async (file: File) => {
    try {
      // 1) Ask backend for a pre-signed upload URL
      const { getUploadUrl, updateProfile } = await import('../api');
      const { uploadUrl, publicUrl } = await getUploadUrl(file.type || 'image/jpeg');
      // 2) Upload to S3 using the URL
      await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': file.type || 'image/jpeg' }, body: file });
      // 3) Save URL to profile
      await updateProfile({ photoUrl: publicUrl });
      setPhoto(publicUrl);
      try { localStorage.setItem('profilePhoto', publicUrl); } catch {}
    } catch (e) {
      // fallback: still preview locally
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        setPhoto(dataUrl);
        try { localStorage.setItem('profilePhoto', dataUrl); } catch {}
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative w-screen min-h-screen overflow-y-auto text-white bg-black font-trajan no-scrollbar">
      {/* Global top-left: Home or Back depending on context */}
      {fromStudy ? (
        <button
          onClick={() => { try { localStorage.removeItem('resumeStudy'); } catch {}; navigate('/study'); }}
          className="absolute top-4 left-4 z-20 p-2 rounded-full bg-white/15 hover:bg-white/30 transition"
          aria-label="Back to Study"
          title="Back to Study"
        >
          <img src="/assets/ui/arrow-left.png" alt="Back" className="w-6 h-6" />
        </button>
      ) : (
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-20 p-2 rounded-full bg-white/15 hover:bg-white/30 transition"
          aria-label="Home"
          title="Home"
        >
          <img src="/assets/ui/home.svg" alt="Home" className="w-6 h-6" />
        </button>
      )}

      <img
        src="/assets/images/home_bg.jpg"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover opacity-65"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="relative z-10 max-w-5xl mx-auto p-6 md:p-10">
        <h1 className="text-3xl md:text-4xl mb-6 tracking-wide">My Profile</h1>

        {!isAuthenticated ? (
          <div className="bg-black/40 border border-white/15 rounded-xl p-6">
            <p className="opacity-90">You are not signed in.</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar */}
            <aside className="col-span-12 md:col-span-4">
              <div className="bg-black/40 border border-white/15 rounded-xl p-4 sticky top-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/20">
                    {photo ? (
                      <img src={photo} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/70">{(user?.name || 'U').slice(0,1)}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Signed in as</div>
                    <div className="text-sm whitespace-nowrap overflow-hidden text-ellipsis" title={user?.email || ''}>{user?.email || '—'}</div>
                  </div>
                </div>
                <nav className="flex flex-col gap-1">
                  <button onClick={() => setTab('overview')} className={`text-left px-3 py-2 rounded ${tab==='overview'?'bg-white/15':'hover:bg-white/10'}`}>Home</button>
                  <button onClick={() => setTab('info')} className={`text-left px-3 py-2 rounded ${tab==='info'?'bg-white/15':'hover:bg-white/10'}`}>Personal Info</button>
                  <button onClick={() => setTab('privacy')} className={`text-left px-3 py-2 rounded ${tab==='privacy'?'bg-white/15':'hover:bg-white/10'}`}>Data & Privacy</button>
                  <button onClick={() => navigate('/')} className="text-left px-3 py-2 rounded hover:bg-white/10">Go to Home</button>
                  <button onClick={signOut} className="text-left px-3 py-2 rounded hover:bg-white/10">Sign out</button>
                </nav>
              </div>
            </aside>

            {/* Main content */}
            <section className="col-span-12 md:col-span-8 space-y-6">
              {tab === 'overview' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                    <div className="rounded-xl bg-white/10 border border-white/15 p-4 hover:bg-white/15 transition-transform hover:scale-[1.02]">
                      <div className="text-sm opacity-80">Daily Streak</div>
                      <div className="text-3xl mt-1">{streaks.daily}</div>
                    </div>
                    <div className="rounded-xl bg-white/10 border border-white/15 p-4 hover:bg-white/15 transition-transform hover:scale-[1.02]">
                      <div className="text-sm opacity-80">Focus Streak</div>
                      <div className="text-3xl mt-1">{streaks.focus}</div>
                    </div>
                    <div className="rounded-xl bg-white/10 border border-white/15 p-4 hover:bg-white/15 transition-transform hover:scale-[1.02]">
                      <div className="text-sm opacity-80">No‑Death Streak</div>
                      <div className="text-3xl mt-1">{streaks.noDeath}</div>
                    </div>
                  </div>

                  <div className="bg-black/40 border border-white/15 rounded-xl p-4">
                    <h2 className="text-xl mb-2 tracking-wide">Recent Sessions</h2>
                    {sessions.length === 0 ? (
                      <div className="opacity-80">No sessions yet.</div>
                    ) : (
                      <ul className="space-y-2">
                        {sessions.map(s => (
                          <li key={s.sessionId} className="flex justify-between items-center bg-white/10 border border-white/15 rounded-lg p-3 hover:bg-white/15 transition-colors">
                            <div>
                              <div className="text-sm opacity-80">{new Date(s.startedAt).toLocaleString()}</div>
                              <div className="text-sm">{s.durationMin} min • {s.areas.join(' → ')}</div>
                            </div>
                            <div className={`text-sm px-3 py-1 rounded-full ${s.completed ? 'bg-green-700/60' : 'bg-red-700/60'}`}>{s.completed ? 'Completed' : 'Incomplete'}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              {tab === 'info' && (
                <div className="bg-black/40 border border-white/15 rounded-xl p-6">
                  <h2 className="text-xl mb-4 tracking-wide">Personal Info</h2>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-white/10 border border-white/20">
                      {photo ? <img src={photo} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">?</div>}
                    </div>
                    <label className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 cursor-pointer">
                      Upload photo
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm opacity-80 mb-1">Name</label>
                      <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded" placeholder="Your name" />
                    </div>
                    <div>
                      <label className="block text-sm opacity-80 mb-1">Email</label>
                      <input value={user?.email || ''} readOnly className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded opacity-80" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <button onClick={saveProfile} className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/35">{savingProfile==='saving'?'Saving...':savingProfile==='saved'?'Saved':'Save changes'}</button>
                  </div>
                </div>
              )}

              {tab === 'privacy' && (
                <div className="bg-black/40 border border-white/15 rounded-xl p-6 space-y-6">
                  <h2 className="text-xl mb-2 tracking-wide">Data & Privacy</h2>

                  {/* In-app password reset (Cognito) */}
                  <div className="bg-black/30 border border-white/15 rounded-lg p-4 space-y-3">
                    <h3 className="text-lg">Reset password via email code</h3>
                    <InAppReset />
                  </div>

                  {/* In-app ChangePassword using AccessToken */}
                  <ChangePassword />
                </div>
              )}
            </section>
          </div>
        )}
        <FloatingFeedback onOpen={(t) => { setModalType(t); setModalOpen(true); }} />
        <FeedbackModal open={modalOpen} type={modalType} onClose={() => setModalOpen(false)} />
      </div>
    </div>
  );
};

export default Profile;
