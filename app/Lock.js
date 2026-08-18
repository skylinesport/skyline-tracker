'use client';

import { useState, useEffect } from 'react';

const CODE = '1111';
const KEY = 'skyline_tracker_unlocked';

export default function Lock({ children }) {
  const [state, setState] = useState('checking'); // checking | locked | open
  const [val, setVal] = useState('');
  const [err, setErr] = useState(false);

  useEffect(() => {
    setState(typeof window !== 'undefined' && localStorage.getItem(KEY) === '1' ? 'open' : 'locked');
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (val === CODE) {
      localStorage.setItem(KEY, '1');
      setState('open');
    } else {
      setErr(true);
      setVal('');
    }
  };

  if (state === 'checking') return <div className="lock" aria-hidden="true" />;
  if (state === 'open') return children;

  return (
    <div className="lock">
      <form className="lock-box" onSubmit={submit}>
        <div className="lock-logo">
          <svg width="21" height="21" viewBox="0 0 21 21" fill="none" aria-hidden="true">
            <path d="M2.5 15.2 7.6 8.3l3.7 4.2L17.9 3.5" stroke="#0d1204" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2>Skyline Tracker</h2>
        <p>Enter passcode to continue</p>
        <input
          className="input lock-input"
          type="password"
          inputMode="numeric"
          maxLength={8}
          autoFocus
          aria-label="Passcode"
          placeholder="••••"
          value={val}
          onChange={(e) => { setVal(e.target.value); setErr(false); }}
        />
        {err && <div className="lock-err">Wrong passcode. Try again.</div>}
        <button className="add-task" type="submit">Unlock</button>
      </form>
    </div>
  );
}
