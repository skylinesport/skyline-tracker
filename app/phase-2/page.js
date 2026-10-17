import Link from 'next/link';

export const metadata = { title: 'Phase 2 — Campus Clubs & Esports Careers' };

// ── Content, grounded in docs/BUSINESS_PLAN.md ──────────────────────────────

const LAYERS = [
  {
    tag: 'Layer 1 · Digital',
    title: 'The App — the arena',
    body: 'Free tournaments, player profiles, stats, badges and rewards. Where anyone with a phone can play, be ranked, and get seen — no money, no gatekeeping.',
  },
  {
    tag: 'Layer 2 · Physical',
    title: 'Campus Clubs — the movement',
    body: 'A Skyline club in every college: a faculty sponsor, a student lead, a chat group, a recurring tournament and a banner. The club is the squad feature, made real.',
  },
];

const LADDER = [
  { step: '01', title: 'Explore', body: 'Join free. Pick a game, build a profile, play your first tournament — zero barrier to entry.' },
  { step: '02', title: 'Compete', body: 'Campus leagues, brackets and leaderboards. Play every week, climb the ranks, earn badges.' },
  { step: '03', title: 'Get Seen', body: 'Stats and badges make talent visible. Club leads and scouts surface the best players.' },
  { step: '04', title: 'Go Pro / Creator', body: 'The top players and creators get promoted — into sponsored teams, careers and the esports pipeline.' },
];

const PLAYBOOK = [
  { title: 'Beachhead first', body: 'Win a handful of colleges in one city deeply — prove a repeatable unit (join rate, tournaments run, retention) before claiming "every college."' },
  { title: 'Ambassadors = club founders', body: 'The Campus Ambassador program is the seeding engine: ambassadors are the students who launch and lead each club.' },
  { title: 'Piggyback college fests', body: 'Fests already have the crowd, stage and budget. Run Skyline tournaments there, then convert the energy into a permanent club.' },
  { title: 'Semester rhythm', body: 'Leagues reset each term — built-in re-recruitment, retention and leadership succession, so a club survives its founder graduating.' },
  { title: 'Scale the playbook', body: 'A self-serve "how to start a Skyline club" kit so students do ~80% of the work. Then expand city by city.' },
];

const REVENUE = [
  { title: 'Cosmetics & profile IAP', body: 'Avatars, frames, badges, profile flair. Compliant, high-margin, and fits the "get seen" loop.', tag: 'Core' },
  { title: 'Brand-sponsored tournaments & campus activations', body: 'Brands fund prize pools and run on-campus activations. >40% of esports revenue industry-wide.', tag: 'Core' },
  { title: 'Rewarded video ads', body: 'Opt-in rewarded ads tied to the non-cash coin economy. Scales with daily active players.', tag: 'Scale' },
  { title: 'Subscription', body: 'An ordinary paid service (~18% GST, not the 28% money-game rate). Deferred — feature-flagged OFF in v1.', tag: 'Deferred' },
  { title: 'Talent pipeline', body: 'Scouting, team placement and creator deals — the long-term payoff of the campus-club network.', tag: 'Future' },
];

const STAGES = [
  {
    num: 'A',
    kicker: 'Stage A · Pilot',
    title: 'One city, done deeply',
    status: 'next',
    statusLabel: 'Up next',
    items: [
      'Recruit the first cohort of Campus Ambassadors as club founders',
      'Launch 3–5 flagship clubs in one beachhead city',
      'Run recurring weekly tournaments + one fest activation',
      'Measure the unit: join rate, tournaments/club, retention',
    ],
  },
  {
    num: 'B',
    kicker: 'Stage B · Regional',
    title: 'Repeat the unit, city by city',
    status: 'planning',
    statusLabel: 'Planning',
    items: [
      'Ship the self-serve "start a Skyline club" kit',
      'First brand-sponsored tournament + campus activation deal',
      'Semester-league calendar with leadership succession',
      'Squads/clans + persistent group chat live in-app',
    ],
  },
  {
    num: 'C',
    kicker: 'Stage C · National',
    title: 'A club in every college',
    status: 'planning',
    statusLabel: 'Future',
    items: [
      'Playbook scales to new cities with minimal central lift',
      'Talent pipeline: scouting, team placement, creator deals',
      'Monetization layered in — cosmetics, ads, then subscription',
      'National league with regional qualifiers',
    ],
  },
];

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

      {/* ── Thesis ── */}
      <section className="p2-hero">
        <p className="p2-hero-quote">&ldquo;No one is born to play, but forced to watch.&rdquo;</p>
        <p className="p2-hero-body">
          Phase 2 turns SkyLinEsport from an app into a movement — a nationwide college esports
          network where any student with a phone can play, be seen, and build a real path into a
          professional gaming career. Free to enter, compliant by design, impossible to copy.
        </p>
      </section>

      {/* ── Two layers ── */}
      <section className="p2-section">
        <div className="p2-label">The model · two layers, one thing</div>
        <div className="p2-grid-2">
          {LAYERS.map((l) => (
            <div key={l.title} className="p2-card">
              <div className="p2-card-tag">{l.tag}</div>
              <h3>{l.title}</h3>
              <p>{l.body}</p>
            </div>
          ))}
        </div>
        <p className="p2-note">
          The app&apos;s squads/clans and the physical campus club are the <strong>same thing in
          two layers</strong> — build once, and the digital and physical reinforce each other.
        </p>
      </section>

      {/* ── Student ladder ── */}
      <section className="p2-section">
        <div className="p2-label">The student ladder</div>
        <div className="p2-ladder">
          {LADDER.map((s) => (
            <div key={s.step} className="p2-rung">
              <span className="p2-rung-num">{s.step}</span>
              <div>
                <h4>{s.title}</h4>
                <p>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Campus playbook ── */}
      <section className="p2-section">
        <div className="p2-label">Go-to-market · the campus playbook</div>
        <p className="p2-sub">Community and software first; hardware later. A club v1 needs almost no hardware — students already own phones.</p>
        <div className="p2-steps">
          {PLAYBOOK.map((p, i) => (
            <div key={p.title} className="p2-step">
              <span className="p2-step-num">{i + 1}</span>
              <div>
                <h4>{p.title}</h4>
                <p>{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Revenue ── */}
      <section className="p2-section">
        <div className="p2-label">Revenue · compliant by design</div>
        <div className="p2-revenue">
          {REVENUE.map((r) => (
            <div key={r.title} className="p2-rev-row">
              <div className="p2-rev-head">
                <h4>{r.title}</h4>
                <span className={`p2-chip p2-chip-${r.tag.toLowerCase()}`}>{r.tag}</span>
              </div>
              <p>{r.body}</p>
            </div>
          ))}
        </div>
        <p className="p2-note">
          No player wallet, no paid entry to cash prizes, no betting — ever. Free + no gambling +
          safe is exactly what gets us approved by colleges and parents. Under India&apos;s Online
          Gaming Act 2025, <strong>compliance is a growth enabler, not just a shield</strong>.
        </p>
      </section>

      {/* ── Moat ── */}
      <section className="p2-section">
        <div className="p2-label">Why it&apos;s defensible</div>
        <div className="p2-card p2-moat">
          <h3>The moat is the campus-club network</h3>
          <p>
            Anyone can build a tournament app. No one can copy a living network of student-led
            clubs with faculty sponsors, semester leagues and leadership that hands off every year.
            Student leadership tiers + a playbook + the league calendar mean a club runs itself and
            survives its founder — that&apos;s how &ldquo;a club in every college, forever&rdquo;
            actually happens.
          </p>
        </div>
      </section>

      {/* ── Rollout roadmap ── */}
      <section className="p2-section">
        <div className="p2-label">Rollout roadmap</div>
        <div className="p2-stages">
          {STAGES.map((s) => (
            <div key={s.num} className="p2-stage">
              <div className="p2-stage-node">{s.num}</div>
              <div className="p2-stage-card">
                <div className="p2-stage-top">
                  <span className="p2-stage-kicker">{s.kicker}</span>
                  <span className={`phase-status ${s.status === 'next' ? 'status-progress' : 'status-planning'}`}>{s.statusLabel}</span>
                </div>
                <h3>{s.title}</h3>
                <ul className="p2-checklist">
                  {s.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
