'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase, isConfigured } from '../../lib/supabaseClient';

export default function MigrationPage() {
  const [rows, setRows] = useState(null);
  const [tableMissing, setTableMissing] = useState(false);

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

  const { phases, done, total, pct } = useMemo(() => {
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
      done: d,
      total: list.length,
      pct: list.length ? Math.round((d / list.length) * 100) : 0,
    };
  }, [rows]);

  return (
    <div className="wrap links-wrap">
      <div className="links-head">
        <Link href="/" className="back">← Back to board</Link>
        <div className="links-title-row">
          <h1>Account migration</h1>
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
              {phase.items.map((row) => (
                <button
                  key={row.id}
                  className={`mig-row${row.done ? ' is-done' : ''}`}
                  onClick={() => toggle(row)}
                  aria-pressed={row.done}>
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
                    <span className="mig-task">{row.task}</span>
                    {row.notes ? <span className="mig-notes">{row.notes}</span> : null}
                  </span>
                </button>
              ))}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
