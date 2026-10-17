import Link from 'next/link';

export const metadata = { title: 'Phase 2 — Campus Clubs & Esports Careers' };

export default function Phase2() {
  return (
    <div className="wrap">
      <Link href="/" className="back-link">← Roadmap</Link>
      <div className="header">
        <div className="brand">
          <div className="dot">
            <svg width="21" height="21" viewBox="0 0 21 21" fill="none" aria-hidden="true">
              <path d="M2.5 15.2 7.6 8.3l3.7 4.2L17.9 3.5" stroke="#0d1204" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1>Phase 2 — Campus Clubs &amp; Esports Careers</h1>
            <p>Skyline in every college · scout, select &amp; promote the best players</p>
          </div>
        </div>
        <span className="phase-status status-planning">Planning</span>
      </div>

      <div className="phase2-empty">
        <h2>Content coming soon</h2>
        <p>
          This is where we&apos;ll plan Phase 2 — establishing Skyline as a club on every
          campus, running the ambassador network, scouting talent, and building the
          pipeline that promotes the best players into a real esports career. We&apos;ll add
          the tasks, milestones and tools here as the plan takes shape.
        </p>
      </div>
    </div>
  );
}
