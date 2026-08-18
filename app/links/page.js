'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { supabase, isConfigured } from '../../lib/supabaseClient';

export default function LinksPage() {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [confirmKey, setConfirmKey] = useState(null);
  const confirmTimer = useRef(null);

  const keyOf = (row) => row.id || row._tmp;

  const fetchRows = useCallback(async () => {
    if (!isConfigured) { setRows([]); return; }
    const { data, error } = await supabase
      .from('links')
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
    setEditing(new Set());
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  const startEdit = (key) => setEditing((s) => new Set(s).add(key));

  const update = (key, field, val) =>
    setRows((r) => r.map((x) => (keyOf(x) === key ? { ...x, [field]: val } : x)));

  const addLink = () => {
    const row = { _tmp: crypto.randomUUID(), name: '', url: '' };
    setRows((r) => [...(r || []), row]);
    setEditing((s) => new Set(s).add(row._tmp));
  };

  const del = async (row) => {
    setRows((r) => r.filter((x) => keyOf(x) !== keyOf(row)));
    setEditing((s) => { const n = new Set(s); n.delete(keyOf(row)); return n; });
    if (row.id) await supabase.from('links').delete().eq('id', row.id);
  };

  // Two-click delete: first click arms "Delete?" and reverts after 3s.
  const clickDelete = (row) => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    if (confirmKey === keyOf(row)) {
      setConfirmKey(null);
      del(row);
    } else {
      setConfirmKey(keyOf(row));
      confirmTimer.current = setTimeout(() => setConfirmKey(null), 3000);
    }
  };

  const save = async () => {
    if (!rows) return;
    setSaving(true);
    let order = rows.reduce((m, x) => Math.max(m, x.sort_order || 0), 0);
    for (const row of rows) {
      const name = (row.name || '').trim();
      const url = (row.url || '').trim();
      if (row.id) {
        await supabase.from('links').update({ name, url }).eq('id', row.id);
      } else if (name || url) {
        order += 1;
        await supabase.from('links').insert({ name, url, sort_order: order });
      }
    }
    setSaving(false);
    await fetchRows(); // clears editing
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isEditing = (row) => editing.has(keyOf(row));
  const showFooter = editing.size > 0 || saving || saved;

  const deleteButton = (row) =>
    confirmKey === keyOf(row) ? (
      <button className="icon-btn danger confirming" aria-label="Confirm delete" onClick={() => clickDelete(row)}>
        Delete?
      </button>
    ) : (
      <button className="icon-btn danger" aria-label="Delete link" onClick={() => clickDelete(row)}>
        <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2.8 4.2h8.4M5.6 4.2V2.8h2.8v1.4M4 4.2l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );

  return (
    <div className="wrap links-wrap">
      <div className="links-head">
        <Link href="/" className="back">← Back to board</Link>
        <div className="links-title-row">
          <h1>Links &amp; docs</h1>
          {isConfigured && !tableMissing && (
            <button className="add-task" onClick={addLink}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M6.5 2v9M2 6.5h9" stroke="#0d1204" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Add link
            </button>
          )}
        </div>
      </div>

      {!isConfigured ? (
        <p className="links-note">Connect Supabase first (see the board&apos;s setup screen), then reload.</p>
      ) : tableMissing ? (
        <p className="links-note">
          The <code>links</code> table doesn&apos;t exist yet. In Supabase → <b>SQL Editor</b>, run the
          contents of <code>supabase/links.sql</code>, then reload this page.
        </p>
      ) : rows === null ? (
        <div className="loading">Loading…</div>
      ) : (
        <>
          <div className="link-head-row">
            <div className="name-field">Name</div>
            <div className="url-field">Link</div>
            <div className="actions-spacer" aria-hidden="true" />
          </div>

          {rows.length === 0 && <div className="links-empty">No links yet — click “Add link”.</div>}

          {rows.map((row) => (
            <div className="link-row" key={keyOf(row)}>
              {isEditing(row) ? (
                <>
                  <input
                    className="input name-field"
                    placeholder="e.g. Design file"
                    autoFocus={!row.name && !row.url}
                    value={row.name}
                    onChange={(e) => update(keyOf(row), 'name', e.target.value)}
                  />
                  <input
                    className="input url-field"
                    type="url"
                    placeholder="https://…"
                    value={row.url}
                    onChange={(e) => update(keyOf(row), 'url', e.target.value)}
                  />
                </>
              ) : (
                <>
                  <div className="name-field link-name">
                    {row.name || <span className="muted">Untitled</span>}
                  </div>
                  <a
                    className={`url-field link-url${row.url ? '' : ' disabled'}`}
                    href={row.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer">
                    {row.url || '—'}
                  </a>
                </>
              )}
              <div className="row-actions">
                {!isEditing(row) && (
                  <button className="icon-btn" aria-label="Edit link" onClick={() => startEdit(keyOf(row))}>
                    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M9.4 2.3l2.3 2.3-7 7H2.4V9.3l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
                {deleteButton(row)}
              </div>
            </div>
          ))}

          {showFooter && (
            <div className="links-foot">
              {(editing.size > 0 || saving) && (
                <button className="add-task" onClick={save} disabled={saving}>
                  Save changes
                </button>
              )}
              <span className="status-line">
                {!saving && !saved && editing.size > 0 && (
                  <span className="status-dot" style={{ background: 'var(--amber)' }} />
                )}
                {saved && <span className="status-dot" style={{ background: 'var(--lime)' }} />}
                {saving ? 'Saving…' : saved ? 'Saved' : 'Unsaved changes'}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
