'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase, isConfigured } from '../lib/supabaseClient';

const STATUSES = [
  { key: 'todo', label: 'To Do', color: 'var(--todo)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--progress)' },
  { key: 'blocked', label: 'Blocked', color: 'var(--blocked)' },
  { key: 'done', label: 'Done', color: 'var(--done)' },
];
const AREAS = ['Website', 'Backend', 'App', 'Infra', 'Launch'];
const PRIORITIES = ['P0', 'P1', 'P2'];

const emptyDraft = { title: '', area: 'Backend', status: 'todo', priority: 'P1', notes: '' };

export default function Page() {
  const [tasks, setTasks] = useState(null);
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyDraft);

  const fetchTasks = useCallback(async () => {
    if (!isConfigured) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (!error) setTasks(data || []);
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    fetchTasks();
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

  const addTask = async () => {
    if (!draft.title.trim()) return;
    const nextOrder = (tasks?.reduce((m, t) => Math.max(m, t.sort_order), 0) ?? 0) + 1;
    await supabase.from('tasks').insert({ ...draft, title: draft.title.trim(), sort_order: nextOrder });
    setDraft(emptyDraft); setAdding(false);
    fetchTasks();
  };

  const patch = async (id, fields) => {
    setTasks((prev) => prev?.map((t) => (t.id === id ? { ...t, ...fields } : t))); // optimistic
    await supabase.from('tasks').update(fields).eq('id', id);
  };

  const saveEdit = async () => {
    if (!editDraft.title.trim()) return;
    await patch(editingId, {
      title: editDraft.title.trim(), area: editDraft.area,
      status: editDraft.status, priority: editDraft.priority, notes: editDraft.notes,
    });
    setEditingId(null);
  };

  const remove = async (id) => {
    if (!confirm('Delete this task?')) return;
    setTasks((prev) => prev?.filter((t) => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  };

  const filtered = useMemo(() => {
    if (!tasks) return [];
    const q = query.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        (areaFilter === 'ALL' || t.area === areaFilter) &&
        (priorityFilter === 'ALL' || t.priority === priorityFilter) &&
        (!q || t.title.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q)),
    );
  }, [tasks, areaFilter, priorityFilter, query]);

  const stats = useMemo(() => {
    const all = tasks || [];
    const total = all.length;
    const done = all.filter((t) => t.status === 'done').length;
    const p0Left = all.filter((t) => t.priority === 'P0' && t.status !== 'done').length;
    const byArea = AREAS.map((a) => {
      const list = all.filter((t) => t.area === a);
      const d = list.filter((t) => t.status === 'done').length;
      return { area: a, total: list.length, done: d, pct: list.length ? Math.round((d / list.length) * 100) : 0 };
    });
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0, p0Left, byArea };
  }, [tasks]);

  if (!isConfigured) return <Setup />;
  if (tasks === null) return <div className="wrap"><div className="loading">Loading tracker…</div></div>;

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
            <h1>Skyline Launch Tracker</h1>
            <p>What&apos;s done · what&apos;s left · updated live by the team</p>
          </div>
        </div>
        <div className="sync"><span className="live" /> live &middot; changes sync for everyone</div>
      </div>

      {/* Top stats */}
      <div className="stats2">
        <div className="stat">
          <div className="label">Overall progress</div>
          <div className="big">{stats.pct}%</div>
          <div className="sub">{stats.done} of {stats.total} tasks done &middot; {stats.total - stats.done} left</div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${stats.pct}%` }} /></div>
        </div>
        <div className="stat">
          <div className="label">Launch blockers left</div>
          <div className="big" style={{ color: stats.p0Left ? 'var(--p0)' : 'var(--lime)' }}>{stats.p0Left}</div>
          <div className="sub">P0 tasks not done</div>
        </div>
        <Link href="/links" className="stat stat-link">
          <div className="label">Links &amp; docs</div>
          <div className="big linkrow">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M9 13a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1M13 9a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1"
                stroke="var(--lime)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Open
          </div>
          <div className="sub">Shared links &amp; documents →</div>
        </Link>
      </div>

      {/* Per-project rings — click one to focus the board on it */}
      <div className="section-label">Projects &nbsp;<span className="muted">· click to filter</span></div>
      <div className="projects">
        {stats.byArea.map((p) => (
          <button
            key={p.area}
            className={`proj ${areaFilter === p.area ? 'active' : ''}`}
            onClick={() => setAreaFilter(areaFilter === p.area ? 'ALL' : p.area)}>
            <Donut pct={p.pct} />
            <div className="proj-meta">
              <div className="proj-name">{p.area}</div>
              <div className="proj-sub">{p.done}/{p.total} done</div>
              <div className="proj-sub2">{p.total - p.done} pending</div>
            </div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <select className="select" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
          <option value="ALL">All projects</option>
          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="ALL">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input type="search" aria-label="Search tasks" placeholder="Search tasks" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="spacer" />
        <button className="add-task" onClick={() => setAdding((v) => !v)}>
          {!adding && (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 2v9M2 6.5h9" stroke="#0d1204" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          {adding ? 'Close' : 'Add task'}
        </button>
      </div>

      {/* Add panel */}
      {adding && (
        <div className="addpanel">
          <div className="form">
            <input className="input" placeholder="Task title" value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus />
            <div className="row">
              <select className="select" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })}>
                {AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
              <select className="select" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
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

      {/* Board */}
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
                          <select className="select" value={editDraft.area} onChange={(e) => setEditDraft({ ...editDraft, area: e.target.value })}>
                            {AREAS.map((a) => <option key={a}>{a}</option>)}
                          </select>
                          <select className="select" value={editDraft.priority} onChange={(e) => setEditDraft({ ...editDraft, priority: e.target.value })}>
                            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
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
                        <span className="chip area">{t.area}</span>
                        <span className={`chip ${t.priority.toLowerCase()}`}>{t.priority}</span>
                      </div>
                      <div className="card-foot">
                        <select className="mini" aria-label="Change status" title="Move" value={t.status} onChange={(e) => patch(t.id, { status: e.target.value })}>
                          {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                        <div className="spacer" />
                        <div className="card-actions">
                          <button className="icon-btn" aria-label="Edit task"
                            onClick={() => { setEditingId(t.id); setEditDraft({ title: t.title, area: t.area, status: t.status, priority: t.priority, notes: t.notes || '' }); }}>
                            <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
                              <path d="M9.4 2.3l2.3 2.3-7 7H2.4V9.3l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button className="icon-btn danger" aria-label="Delete task" onClick={() => remove(t.id)}>
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
    </div>
  );
}

function Donut({ pct }) {
  const size = 62, stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  const done = pct >= 100;
  return (
    <svg width={size} height={size} className="donut" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#23271f" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={done ? 'var(--lime)' : 'var(--lime)'} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="donut-txt">{pct}%</text>
    </svg>
  );
}

function Setup() {
  return (
    <div className="setup">
      <h2>Almost there — connect Supabase</h2>
      <p>The tracker needs a free Supabase database so your team&apos;s edits are shared. Set two env vars and reload.</p>
      <ol>
        <li>Create a free project at <code>supabase.com</code>.</li>
        <li>In Supabase → <b>SQL Editor</b>, run the contents of <code>supabase/schema.sql</code> (creates + seeds the table).</li>
        <li>In Supabase → <b>Project Settings → API</b>, copy the <b>Project URL</b> and the <b>anon public</b> key.</li>
        <li>Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — locally in <code>.env.local</code>, and in Vercel → Project → Settings → Environment Variables.</li>
        <li>Redeploy / restart. Done.</li>
      </ol>
      <p className="muted">The anon key is safe to expose in the browser; keep the tracker URL private to your team.</p>
    </div>
  );
}
