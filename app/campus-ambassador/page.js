'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase, isConfigured } from '../../lib/supabaseClient';

const TABLE = 'campus_tasks';

const STATUSES = [
  { key: 'todo', label: 'To Do', color: 'var(--todo)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--progress)' },
  { key: 'blocked', label: 'Blocked', color: 'var(--blocked)' },
  { key: 'done', label: 'Done', color: 'var(--done)' },
];

const emptyDraft = { phase: '', task: '', owner: '', notes: '', status: 'todo' };

// "1 - Program Design" -> "Program Design" (the number becomes the timeline dot).
const phaseTitle = (p) => p.replace(/^\s*\d+\s*[-.]\s*/, '');

export default function CampusAmbassadorPage() {
  const [rows, setRows] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyDraft);

  const fetchRows = useCallback(async () => {
    if (!isConfigured) { setRows([]); return; }
    const { data } = await supabase
      .from(TABLE)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setRows(data || []);
  }, []);

  useEffect(() => {
    fetchRows();
    if (!isConfigured) return;
    const ch = supabase
      .channel('campus-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, fetchRows)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchRows]);

  // Optimistic patch. `done` is kept in sync with status so either field reads right.
  const patch = async (id, fields) => {
    setRows((r) => r?.map((x) => (x.id === id ? { ...x, ...fields } : x)));
    await supabase.from(TABLE).update(fields).eq('id', id);
  };
  const setStatus = (row, status) => patch(row.id, { status, done: status === 'done' });
  const toggleDone = (row) => setStatus(row, row.status === 'done' ? 'todo' : 'done');

  const addTask = async () => {
    if (!draft.task.trim()) return;
    const nextOrder = (rows?.reduce((m, r) => Math.max(m, r.sort_order || 0), 0) ?? 0) + 1;
    await supabase.from(TABLE).insert({
      phase: draft.phase.trim() || 'General',
      task: draft.task.trim(),
      owner: draft.owner.trim(),
      notes: draft.notes.trim(),
      status: draft.status,
      done: draft.status === 'done',
      sort_order: nextOrder,
    });
    setDraft(emptyDraft);
    setAdding(false);
    fetchRows();
  };

  const startEdit = (row) => {
    setAdding(false);
    setEditingId(row.id);
    setEditDraft({ phase: row.phase, task: row.task, owner: row.owner, notes: row.notes || '', status: row.status || 'todo' });
  };

  const saveEdit = async () => {
    if (!editDraft.task.trim()) return;
    await patch(editingId, {
      phase: editDraft.phase.trim() || 'General',
      task: editDraft.task.trim(),
      owner: editDraft.owner.trim(),
      notes: editDraft.notes.trim(),
      status: editDraft.status,
      done: editDraft.status === 'done',
    });
    setEditingId(null);
  };

  const del = async (row) => {
    if (!confirm('Delete this item?')) return;
    setRows((r) => r?.filter((x) => x.id !== row.id));
    setEditingId((id) => (id === row.id ? null : id));
    await supabase.from(TABLE).delete().eq('id', row.id);
  };

  const { phases, phaseNames, done, total, pct } = useMemo(() => {
    const list = rows || [];
    const order = [];
    const byPhase = new Map();
    for (const r of list) {
      if (!byPhase.has(r.phase)) { byPhase.set(r.phase, []); order.push(r.phase); }
      byPhase.get(r.phase).push(r);
    }
    const d = list.filter((r) => (r.status || (r.done ? 'done' : 'todo')) === 'done').length;
    return {
      phases: order.map((p) => ({ name: p, items: byPhase.get(p) })),
      phaseNames: order,
      done: d,
      total: list.length,
      pct: list.length ? Math.round((d / list.length) * 100) : 0,
    };
  }, [rows]);

  const Fields = (d, set) => (
    <div className="form">
      <input className="input" placeholder="Task — what to do" value={d.task}
        onChange={(e) => set({ ...d, task: e.target.value })} autoFocus />
      <div className="row">
        <input className="input" placeholder="Category (e.g. 3 - Brand & Marketing Assets)" list="ca-phases" value={d.phase}
          onChange={(e) => set({ ...d, phase: e.target.value })} />
        <input className="input" placeholder="Owner (optional)" value={d.owner}
          onChange={(e) => set({ ...d, owner: e.target.value })} />
        <select className="select" value={d.status} onChange={(e) => set({ ...d, status: e.target.value })}>
          {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <textarea className="input" placeholder="Notes (optional)" value={d.notes}
        onChange={(e) => set({ ...d, notes: e.target.value })} />
      <datalist id="ca-phases">
        {phaseNames.map((p) => <option key={p} value={p} />)}
      </datalist>
    </div>
  );

  return (
    <div className="wrap ca-wrap">
      <div className="ca-top">
        <Link href="/" className="back">← Tracker</Link>
        <h1>Campus Ambassador</h1>
        <p className="ca-intro">
          Plan and run the campus ambassador program — design, assets, recruitment, onboarding and rewards.
          Check items off, set <b>In&nbsp;Progress</b>, and add/edit/remove anything from here.
        </p>
      </div>

      {/* Overall progress */}
      <div className="ca-progress">
        <div className="ca-progress-row">
          <span className="ca-progress-pct">{pct}%</span>
          <span className="ca-progress-sub">{done} of {total} done · {total - done} left</span>
          <div className="spacer" />
          <button className="add-task" onClick={() => setAdding((v) => !v)}>{adding ? 'Close' : 'Add item'}</button>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      </div>

      {adding && <div className="addpanel">{Fields(draft, setDraft)}<div className="form-actions"><button className="btn" onClick={addTask}>Add</button><button className="btn ghost" onClick={() => { setAdding(false); setDraft(emptyDraft); }}>Cancel</button></div></div>}

      {rows === null ? (
        <div className="ca-empty">Loading…</div>
      ) : total === 0 ? (
        <div className="ca-empty">No items yet. Run <code>supabase/campus.sql</code> to seed the plan, or add items above.</div>
      ) : (
        <div className="ca-timeline">
          {phases.map((p, i) => {
            const pdone = p.items.filter((x) => (x.status || (x.done ? 'done' : 'todo')) === 'done').length;
            const last = i === phases.length - 1;
            return (
              <section className="ca-phase" key={p.name}>
                <div className="ca-rail">
                  <span className={`ca-dot ${pdone === p.items.length ? 'full' : ''}`}>{i + 1}</span>
                  {!last && <span className="ca-line" />}
                </div>
                <div className="ca-phase-body">
                  <header className="ca-phase-head">
                    <h2>{phaseTitle(p.name)}</h2>
                    <span className="ca-count">{pdone}/{p.items.length}</span>
                  </header>
                  <div className="ca-tasks">
                    {p.items.map((t) => {
                      const status = t.status || (t.done ? 'done' : 'todo');
                      if (editingId === t.id) {
                        return (
                          <div className="ca-task editing" key={t.id}>
                            {Fields(editDraft, setEditDraft)}
                            <div className="form-actions">
                              <button className="btn sm" onClick={saveEdit}>Save</button>
                              <button className="btn ghost sm" onClick={() => setEditingId(null)}>Cancel</button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className={`ca-task s-${status}`} key={t.id}>
                          <button className={`ca-check ${status === 'done' ? 'on' : ''}`} onClick={() => toggleDone(t)} aria-label="Toggle done">
                            {status === 'done' && (
                              <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 7.5 6 10.5 11 4" stroke="#0d1204" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            )}
                          </button>
                          <div className="ca-task-main">
                            <div className="ca-task-title">{t.task}</div>
                            {t.notes ? <div className="ca-task-notes">{t.notes}</div> : null}
                            {t.owner ? <span className="chip area">{t.owner}</span> : null}
                          </div>
                          <select className="mini" aria-label="Status" value={status} onChange={(e) => setStatus(t, e.target.value)}>
                            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                          <div className="ca-task-actions">
                            <button className="icon-btn" aria-label="Edit" onClick={() => startEdit(t)}>
                              <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9.4 2.3l2.3 2.3-7 7H2.4V9.3l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                            </button>
                            <button className="icon-btn danger" aria-label="Delete" onClick={() => del(t)}>
                              <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.8 4.2h8.4M5.6 4.2V2.8h2.8v1.4M4 4.2l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
