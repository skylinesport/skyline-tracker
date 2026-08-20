'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase, isConfigured } from '../../lib/supabaseClient';

const emptyDraft = { phase: '', service: '', task: '', owner: '', notes: '' };

export default function MigrationPage() {
  const [rows, setRows] = useState(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyDraft);

  const fetchRows = useCallback(async () => {
    if (!isConfigured) { setRows([]); return; }
    const { data, error } = await supabase
      .from('migration_tasks')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (error.code === 'PGRST205' || error.code === '42P01' || msg.includes('does not exist')) {
        setTableMissing(true);
      }
      setRows([]);
      return;
    }
    setTableMissing(false);
    setRows(data || []);
  }, []);

  useEffect(() => {
    fetchRows();
    if (!isConfigured) return;
    const channel = supabase
      .channel('migration-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'migration_tasks' }, fetchRows)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRows]);

  const toggle = async (row) => {
    const next = !row.done;
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, done: next } : x))); // optimistic
    await supabase.from('migration_tasks').update({ done: next }).eq('id', row.id);
  };

  const addTask = async () => {
    if (!draft.service.trim() && !draft.task.trim()) return;
    const nextOrder = (rows?.reduce((m, r) => Math.max(m, r.sort_order || 0), 0) ?? 0) + 1;
    await supabase.from('migration_tasks').insert({
      phase: draft.phase.trim() || 'General',
      service: draft.service.trim(),
      task: draft.task.trim(),
      owner: draft.owner.trim(),
      notes: draft.notes.trim(),
      sort_order: nextOrder,
    });
    setDraft(emptyDraft);
    setAdding(false);
    fetchRows();
  };

  const startEdit = (row) => {
    setAdding(false);
    setEditingId(row.id);
    setEditDraft({ phase: row.phase, service: row.service, task: row.task, owner: row.owner, notes: row.notes || '' });
  };

  const saveEdit = async () => {
    if (!editDraft.service.trim() && !editDraft.task.trim()) return;
    await supabase.from('migration_tasks').update({
      phase: editDraft.phase.trim() || 'General',
      service: editDraft.service.trim(),
      task: editDraft.task.trim(),
      owner: editDraft.owner.trim(),
      notes: editDraft.notes.trim(),
    }).eq('id', editingId);
    setEditingId(null);
    fetchRows();
  };

  const del = async (row) => {
    if (!confirm('Delete this item?')) return;
    setRows((r) => r.filter((x) => x.id !== row.id));
    setEditingId((id) => (id === row.id ? null : id));
    await supabase.from('migration_tasks').delete().eq('id', row.id);
  };

  const { phases, done, total, pct, phaseNames } = useMemo(() => {
    const list = rows || [];
    const order = [];
    const byPhase = new Map();
    for (const r of list) {
      if (!byPhase.has(r.phase)) { byPhase.set(r.phase, []); order.push(r.phase); }
      byPhase.get(r.phase).push(r);
    }
    const d = list.filter((r) => r.done).length;
    return {
      phases: order.map((p) => ({ name: p, items: byPhase.get(p) })),
      phaseNames: order,
      done: d,
      total: list.length,
      pct: list.length ? Math.round((d / list.length) * 100) : 0,
    };
  }, [rows]);

  // Shared form fields for add + edit.
  const Fields = (d, set) => (
    <div className="form">
      <div className="row">
        <input className="input" placeholder="Service (e.g. Railway)" value={d.service}
          onChange={(e) => set({ ...d, service: e.target.value })} autoFocus />
        <input className="input" placeholder="Owner (e.g. Ayush)" value={d.owner}
          onChange={(e) => set({ ...d, owner: e.target.value })} />
      </div>
      <input className="input" placeholder="Task — what to do" value={d.task}
        onChange={(e) => set({ ...d, task: e.target.value })} />
      <input className="input" placeholder="Phase / section (e.g. 2 - Infrastructure)" list="mig-phases" value={d.phase}
        onChange={(e) => set({ ...d, phase: e.target.value })} />
      <textarea className="input" placeholder="Notes (optional)" value={d.notes}
        onChange={(e) => set({ ...d, notes: e.target.value })} />
      <datalist id="mig-phases">
        {phaseNames.map((p) => <option key={p} value={p} />)}
      </datalist>
    </div>
  );

  return (
    <div className="wrap links-wrap">
      <div className="links-head">
        <Link href="/" className="back">← Back to board</Link>
        <div className="links-title-row">
          <h1>Account migration</h1>
          {isConfigured && !tableMissing && (
            <button className="add-task" onClick={() => { setEditingId(null); setAdding((v) => !v); }}>
              {!adding && (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <path d="M6.5 2v9M2 6.5h9" stroke="#0d1204" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              {adding ? 'Close' : 'Add item'}
            </button>
          )}
        </div>
        <p className="mig-intro">
          Move every service off a personal email onto a <b>company-owned identity</b>, so no single
          person (or lost inbox) is a single point of failure. Work top-down — later phases depend on
          the company email + password manager from Phase&nbsp;0.
        </p>
      </div>

      {!isConfigured ? (
        <p className="links-note">Connect Supabase first (see the board&apos;s setup screen), then reload.</p>
      ) : tableMissing ? (
        <p className="links-note">
          The <code>migration_tasks</code> table doesn&apos;t exist yet. In Supabase → <b>SQL Editor</b>,
          run the contents of <code>supabase/migration.sql</code>, then reload this page.
        </p>
      ) : rows === null ? (
        <div className="loading">Loading…</div>
      ) : (
        <>
          {adding && (
            <div className="addpanel">
              {Fields(draft, setDraft)}
              <div className="form-actions">
                <button className="btn" onClick={addTask}>Add</button>
                <button className="btn ghost" onClick={() => { setAdding(false); setDraft(emptyDraft); }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="mig-progress">
            <div className="mig-progress-top">
              <span className="mig-progress-pct">{pct}%</span>
              <span className="muted">{done} of {total} done · {total - done} left</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          </div>

          {phases.map((phase) => (
            <section className="mig-phase" key={phase.name}>
              <div className="section-label">{phase.name}</div>
              {phase.items.map((row) =>
                editingId === row.id ? (
                  <div className="mig-row editing" key={row.id}>
                    <div style={{ flex: 1 }}>
                      {Fields(editDraft, setEditDraft)}
                      <div className="form-actions">
                        <button className="btn sm" onClick={saveEdit}>Save</button>
                        <button className="btn ghost sm" onClick={() => setEditingId(null)}>Cancel</button>
                        <div className="spacer" />
                        <button className="btn ghost sm danger" onClick={() => del(row)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`mig-row${row.done ? ' is-done' : ''}`} key={row.id}>
                    <button className="mig-main" onClick={() => toggle(row)} aria-pressed={row.done}>
                      <span className={`mig-check${row.done ? ' checked' : ''}`} aria-hidden="true">
                        {row.done && (
                          <svg viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7.5 5.5 10.5 11.5 3.5" stroke="#0d1204" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="mig-body">
                        <span className="mig-line1">
                          <span className="mig-service">{row.service}</span>
                          {row.owner ? <span className="chip mig-owner">{row.owner}</span> : null}
                        </span>
                        {row.task ? <span className="mig-task">{row.task}</span> : null}
                        {row.notes ? <span className="mig-notes">{row.notes}</span> : null}
                      </span>
                    </button>
                    <div className="mig-actions">
                      <button className="icon-btn" aria-label="Edit item" onClick={() => startEdit(row)}>
                        <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M9.4 2.3l2.3 2.3-7 7H2.4V9.3l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button className="icon-btn danger" aria-label="Delete item" onClick={() => del(row)}>
                        <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M2.8 4.2h8.4M5.6 4.2V2.8h2.8v1.4M4 4.2l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ),
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
