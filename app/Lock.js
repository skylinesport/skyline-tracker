'use client';

import { useState, useEffect } from 'react';
import { supabase, isConfigured } from '../lib/supabaseClient';

// Real authentication gate. A signed-in Supabase session is required; the
// session's JWT is what satisfies the authenticated-only RLS policies, so the
// data is protected at the API layer, not just in the UI. Accounts are created
// by an admin in the Supabase dashboard (public sign-ups are disabled).
export default function Lock({ children }) {
  const [state, setState] = useState('checking'); // checking | locked | open
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // No backend configured (local/mock mode) → nothing to protect.
    if (!isConfigured) { setState('open'); return; }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setState(data.session ? 'open' : 'locked');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? 'open' : 'locked');
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setErr('Wrong email or password.');
      setPassword('');
      return;
    }
    // onAuthStateChange flips state to 'open' on success.
  };

  if (state === 'checking') return <div className="lock" aria-hidden="true" />;
  if (state === 'open') return (<>{children}<SignOut /></>);

  return (
    <div className="lock">
      <form className="lock-box" onSubmit={submit}>
        <div className="lock-logo">
          <svg width="21" height="21" viewBox="0 0 21 21" fill="none" aria-hidden="true">
            <path d="M2.5 15.2 7.6 8.3l3.7 4.2L17.9 3.5" stroke="#0d1204" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2>Skyline Tracker</h2>
        <p>Sign in to continue</p>
        <input
          className="input lock-field"
          type="email"
          autoFocus
          required
          autoComplete="username"
          aria-label="Email"
          placeholder="Email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErr(''); }}
        />
        <input
          className="input lock-field"
          type="password"
          required
          autoComplete="current-password"
          aria-label="Password"
          placeholder="Password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErr(''); }}
        />
        {err && <div className="lock-err">{err}</div>}
        <button className="add-task" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}

function SignOut() {
  if (!isConfigured) return null;
  return (
    <button className="signout-pill" onClick={() => supabase.auth.signOut()} aria-label="Sign out">
      Sign out
    </button>
  );
}
