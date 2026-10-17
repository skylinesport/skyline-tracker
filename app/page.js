'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, isConfigured } from '../lib/supabaseClient';

export default function Roadmap() {
  // Live progress for each phase, pulled from the tables the trackers use.
  const [p1, setP1] = useState(null);
  const [p2, setP2] = useState(null);

  useEffect(() => {
    if (!isConfigured) return;
    let active = true;
    const pct = (data) => {
      const total = data.length;
      const done = data.filter((t) => t.status === 'done').length;
      return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
    };
    const load = async () => {
      const [r1, r2] = await Promise.all([
        supabase.from('tasks').select('status'),
        supabase.from('phase2_tasks').select('status'),
      ]);
      if (!active) return;
      if (!r1.error && r1.data) setP1(pct(r1.data));
      if (!r2.error && r2.data) setP2(pct(r2.data)); // stays null until the table exists
    };
    load();
    const channel = supabase
      .channel('roadmap-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phase2_tasks' }, load)
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
            {p2 && p2.total ? (
              <div className="phase-progress">
                <div className="progress-track"><div className="progress-fill" style={{ width: `${p2.pct}%` }} /></div>
                <span>{p2.pct}% &middot; {p2.done}/{p2.total} tasks</span>
              </div>
            ) : null}
            <div className="phase-open">Open Phase 2 →</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
