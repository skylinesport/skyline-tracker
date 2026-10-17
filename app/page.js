'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, isConfigured } from '../lib/supabaseClient';

export default function Roadmap() {
  // Live progress for Phase 1, pulled from the same tasks table the tracker uses.
  const [p1, setP1] = useState(null);

  useEffect(() => {
    if (!isConfigured) return;
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from('tasks').select('status');
      if (!error && active && data) {
        const total = data.length;
        const done = data.filter((t) => t.status === 'done').length;
        setP1({ total, done, pct: total ? Math.round((done / total) * 100) : 0 });
      }
    };
    load();
    const channel = supabase
      .channel('roadmap-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="wrap">
      <div className="header">
        <div className="brand">
          <div className="dot">
            <svg width="21" height="21" viewBox="0 0 21 21" fill="none" aria-hidden="true">
              <path d="M2.5 15.2 7.6 8.3l3.7 4.2L17.9 3.5" stroke="#0d1204" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1>Skyline Roadmap</h1>
            <p>The journey — from launch to a nationwide college esports club</p>
          </div>
        </div>
        <div className="sync"><span className="live" /> live &middot; updated by the team</div>
      </div>

      <div className="timeline">
        {/* ── Phase 1 ── */}
        <Link href="/phase-1" className="phase phase-active">
          <div className="phase-node"><span className="phase-num">1</span></div>
          <div className="phase-card">
            <div className="phase-top">
              <div className="phase-kicker">Phase 1 · Now</div>
              <span className="phase-status status-progress">In progress</span>
            </div>
            <h2>Launch</h2>
            <p>Build and ship the SkyLinEsport app — free tournaments, player profiles, badges and rewards — and get live on the App Store &amp; Google Play.</p>
            {p1 ? (
              <div className="phase-progress">
                <div className="progress-track"><div className="progress-fill" style={{ width: `${p1.pct}%` }} /></div>
                <span>{p1.pct}% &middot; {p1.done}/{p1.total} tasks</span>
              </div>
            ) : null}
            <div className="phase-open">Open launch tracker →</div>
          </div>
        </Link>

        {/* ── Phase 2 ── */}
        <Link href="/phase-2" className="phase">
          <div className="phase-node"><span className="phase-num">2</span></div>
          <div className="phase-card">
            <div className="phase-top">
              <div className="phase-kicker">Phase 2 · Next</div>
              <span className="phase-status status-planning">Planning</span>
            </div>
            <h2>Campus Clubs &amp; Esports Careers</h2>
            <p>Establish Skyline as a club in every college. Scout, select and promote the best players — building real pathways into a professional esports career.</p>
            <div className="phase-open">Open Phase 2 →</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
