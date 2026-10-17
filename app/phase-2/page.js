'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase, isConfigured } from '../../lib/supabaseClient';

// ── Config ──────────────────────────────────────────────────────────────────
const STATUSES = [
  { key: 'todo', label: 'To Do', color: 'var(--todo)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--progress)' },
  { key: 'blocked', label: 'Blocked', color: 'var(--blocked)' },
  { key: 'done', label: 'Done', color: 'var(--done)' },
];
// Stages map to docs/BUSINESS_PLAN.md rollout. These are the "projects" of Phase 2.
const STAGES = [
  { key: 'A', label: 'Stage A', title: 'Pilot — one city, deep' },
  { key: 'B', label: 'Stage B', title: 'Regional — city by city' },
  { key: 'C', label: 'Stage C', title: 'National — every college' },
];
const STAGE_KEYS = STAGES.map((s) => s.key);

const emptyDraft = { title: '', stage: 'A', status: 'todo', notes: '' };

export default function Phase2() {
  const [tasks, setTasks] = useState(null);
  const [stageFilter, setStageFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyDraft);

  const fetchTasks = useCallback(async () => {
    if (!isConfigured) return;
    const { data, error } = await supabase
      .from('phase2_tasks')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (!error) { setTasks(data || []); return; }
    // Table not created yet: Postgres '42P01' or PostgREST 'PGRST205' (not in schema cache).
    const missing = error.code === '42P01' || error.code === 'PGRST205'
      || /schema cache|does not exist|find the table/i.test(error.message || '');
    setTasks(missing ? 'missing' : []);
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    fetchTasks();
    const channel = supabase
      .channel('phase2-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phase2_tasks' }, fetchTasks)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

  const addTask = async () => {
    if (!draft.title.trim()) return;
    const nextOrder = (tasks?.reduce?.((m, t) => Math.max(m, t.sort_order), 0) ?? 0) + 1;
    await supabase.from('phase2_tasks').insert({ ...draft, title: draft.title.trim(), sort_order: nextOrder });
    setDraft(emptyDraft); setAdding(false);
    fetchTasks();
  };

  const patch = async (id, fields) => {
    setTasks((prev) => prev?.map((t) => (t.id === id ? { ...t, ...fields } : t))); // optimistic
    await supabase.from('phase2_tasks').update(fields).eq('id', id);
  };

  const saveEdit = async () => {
    if (!editDraft.title.trim()) return;
    await patch(editingId, {
      title: editDraft.title.trim(), stage: editDraft.stage, status: editDraft.status, notes: editDraft.notes,
    });
    setEditingId(null);
  };

  const remove = async (id) => {
    if (!confirm('Delete this item?')) return;
    setTasks((prev) => prev?.filter((t) => t.id !== id));
    await supabase.from('phase2_tasks').delete().eq('id', id);
  };

  const filtered = useMemo(() => {
    const all = Array.isArray(tasks) ? tasks : [];
    const q = query.trim().toLowerCase();
    return all.filter(
      (t) =>
        (stageFilter === 'ALL' || t.stage === stageFilter) &&
        (!q || t.title.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q)),
    );
  }, [tasks, stageFilter, query]);

  const stats = useMemo(() => {
    const all = Array.isArray(tasks) ? tasks : [];
    const total = all.length;
    const done = all.filter((t) => t.status === 'done').length;
    const inProg = all.filter((t) => t.status === 'in_progress').length;
    const byStage = STAGES.map((s) => {
      const list = all.filter((t) => t.stage === s.key);
      const d = list.filter((t) => t.status === 'done').length;
      return { ...s, total: list.length, done: d, pct: list.length ? Math.round((d / list.length) * 100) : 0 };
    });
    return { total, done, inProg, pct: total ? Math.round((done / total) * 100) : 0, byStage };
  }, [tasks]);

  const header = (
    <>
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
            <p>What we need to do · move it across the board · updated live by the team</p>
          </div>
        </div>
        <div className="sync"><span className="live" /> live &middot; changes sync for everyone</div>
      </div>
    </>
  );

  if (!isConfigured) return <div className="wrap">{header}<SetupNote /></div>;
  if (tasks === null) return <div className="wrap">{header}<div className="loading">Loading board…</div></div>;
  if (tasks === 'missing') return <div className="wrap">{header}<SetupNote missing /></div>;

  return (
    <div className="wrap">
      {header}

      {/* Top stats */}
      <div className="stats2">
        <div className="stat">
          <div className="label">Overall progress</div>
          <div className="big">{stats.pct}%</div>
          <div className="sub">{stats.done} of {stats.total} done &middot; {stats.total - stats.done} left</div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${stats.pct}%` }} /></div>
        </div>
        <div className="stat">
          <div className="label">In progress now</div>
          <div className="big" style={{ color: 'var(--progress)' }}>{stats.inProg}</div>
          <div className="sub">items being worked on</div>
        </div>
      </div>

      {/* Per-stage rings — click to focus the board on one stage */}
      <div className="section-label">Stages &nbsp;<span className="muted">· click to filter</span></div>
      <div className="projects">
        {stats.byStage.map((p) => (
          <button
            key={p.key}
            className={`proj ${stageFilter === p.key ? 'active' : ''}`}
            onClick={() => setStageFilter(stageFilter === p.key ? 'ALL' : p.key)}>
            <Donut pct={p.pct} />
            <div className="proj-meta">
              <div className="proj-name">{p.label} · {p.title}</div>
              <div className="proj-sub">{p.done}/{p.total} done</div>
              <div className="proj-sub2">{p.total - p.done} pending</div>
            </div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <select className="select" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="ALL">All stages</option>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label} — {s.title}</option>)}
        </select>
        <input type="search" aria-label="Search items" placeholder="Search items" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="spacer" />
        <button className="add-task" onClick={() => setAdding((v) => !v)}>
          {!adding && (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 2v9M2 6.5h9" stroke="#0d1204" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          {adding ? 'Close' : 'Add item'}
        </button>
      </div>

      {/* Add panel */}
      {adding && (
        <div className="addpanel">
          <div className="form">
            <input className="input" placeholder="What needs doing?" value={draft.title} autoFocus
              onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <div className="row">
              <select className="select" value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value })}>
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label} — {s.title}</option>)}
              </select>
              <select className="select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <textarea className="input" placeholder="Notes (optional)" value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            <div className="form-actions">
              <button className="btn" onClick={addTask}>Add</button>
              <button className="btn ghost" onClick={() => { setAdding(false); setDraft(emptyDraft); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="board">
        {STATUSES.map((col) => {
          const items = filtered.filter((t) => t.status === col.key);
          return (
            <div className="col" key={col.key}>
              <div className="col-head">
                <span className="swatch" style={{ background: col.color }} />
                <span className="title">{col.label}</span>
                <span className="count">{items.length}</span>
              </div>
              <div className="col-body">
                {items.map((t) =>
                  editingId === t.id ? (
                    <div className="card" key={t.id}>
                      <div className="form">
                        <input className="input" value={editDraft.title}
                          onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} />
                        <div className="row">
                          <select className="select" value={editDraft.stage} onChange={(e) => setEditDraft({ ...editDraft, stage: e.target.value })}>
                            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </div>
                        <textarea className="input" placeholder="Notes" value={editDraft.notes}
                          onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })} />
                        <div className="form-actions">
                          <button className="btn sm" onClick={saveEdit}>Save</button>
                          <button className="btn ghost sm" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="card" key={t.id}>
                      <div className="ttl">{t.title}</div>
                      {t.notes ? <div className="notes">{t.notes}</div> : null}
                      <div className="chips">
                        <span className="chip area">{STAGES.find((s) => s.key === t.stage)?.label || t.stage}</span>
                      </div>
                      <div className="card-foot">
                        <select className="mini" aria-label="Change status" title="Move" value={t.status} onChange={(e) => patch(t.id, { status: e.target.value })}>
                          {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                        <div className="spacer" />
                        <div className="card-actions">
                          <button className="icon-btn" aria-label="Edit item"
                            onClick={() => { setEditingId(t.id); setEditDraft({ title: t.title, stage: t.stage, status: t.status, notes: t.notes || '' }); }}>
                            <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
                              <path d="M9.4 2.3l2.3 2.3-7 7H2.4V9.3l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button className="icon-btn danger" aria-label="Delete item" onClick={() => remove(t.id)}>
                            <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
                              <path d="M2.8 4.2h8.4M5.6 4.2V2.8h2.8v1.4M4 4.2l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* The strategy behind the board — reference, collapsed by default */}
      <details className="p2-plan">
        <summary>The plan behind these milestones</summary>
        <div className="p2-plan-body">
          <p className="p2-hero-quote">&ldquo;No one is born to play, but forced to watch.&rdquo;</p>
          <p className="p2-hero-body">
            Phase 2 turns SkyLinEsport from an app into a movement — a nationwide college esports
            network where any student with a phone can play, be seen, and build a real path into a
            professional gaming career. Free to enter, compliant by design, impossible to copy.
          </p>

          <div className="p2-label" style={{ marginTop: 20 }}>The model · two layers, one thing</div>
          <p className="p2-plain"><strong>The App — the arena.</strong> Free tournaments, profiles, stats, badges and rewards: where anyone with a phone can play, be ranked and get seen.</p>
          <p className="p2-plain"><strong>Campus Clubs — the movement.</strong> A Skyline club in every college (faculty sponsor + student lead + chat group + recurring tournament + banner). The club is the squad feature, made real — build once, both layers reinforce each other.</p>

          <div className="p2-label" style={{ marginTop: 20 }}>The student ladder</div>
          <p className="p2-plain"><strong>Explore</strong> (join free) → <strong>Compete</strong> (campus leagues, leaderboards) → <strong>Get Seen</strong> (stats + badges surface talent) → <strong>Go Pro / Creator</strong> (promoted into sponsored teams, careers, the esports pipeline).</p>

          <div className="p2-label" style={{ marginTop: 20 }}>Revenue · compliant by design</div>
          <p className="p2-plain">Cosmetics &amp; profile IAP · brand-sponsored tournaments &amp; campus activations (&gt;40% of esports revenue) · rewarded video ads · subscription (deferred) · talent pipeline (future). No player wallet, no paid entry to cash prizes, no betting — under India&apos;s Online Gaming Act 2025, compliance is a growth enabler.</p>

          <div className="p2-label" style={{ marginTop: 20 }}>The moat</div>
          <p className="p2-plain">Anyone can build a tournament app. No one can copy a living network of student-led clubs with faculty sponsors, semester leagues and leadership that hands off every year.</p>
        </div>
      </details>
    </div>
  );
}

function Donut({ pct }) {
  const size = 62, stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <svg width={size} height={size} className="donut" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#23271f" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--lime)" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="donut-txt">{pct}%</text>
    </svg>
  );
}

function SetupNote({ missing }) {
  return (
    <div className="setup">
      <h2>{missing ? 'One step: create the Phase 2 table' : 'Connect Supabase first'}</h2>
      <p>
        {missing
          ? 'Supabase is connected, but the Phase 2 board table does not exist yet. Create it once and this page becomes live.'
          : 'The board needs the shared Supabase database so the team’s changes sync for everyone.'}
      </p>
      <ol>
        {!missing && <li>Finish the main tracker setup (see Phase 1) so Supabase is connected.</li>}
        <li>In Supabase → <b>SQL Editor</b> → New query, run the contents of <code>supabase/phase2.sql</code> (creates + seeds the table).</li>
        <li>Reload this page — your Phase 2 milestones appear on the board, ready to move.</li>
      </ol>
      <p className="muted">Safe to re-run; it only seeds when the table is empty.</p>
    </div>
  );
}
