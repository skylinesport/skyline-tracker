'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase, isConfigured } from '../../lib/supabaseClient';

export default function LinksPage() {
  const [rows, setRows] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

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
    setDirty(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const keyOf = (row) => row.id || row._tmp;

  const addRow = () => {
    setRows((r) => [...(r || []), { _tmp: crypto.randomUUID(), name: '', url: '' }]);
    setDirty(true);
  };

  const update = (key, field, val) => {
    setRows((r) => r.map((x) => (keyOf(x) === key ? { ...x, [field]: val } : x)));
    setDirty(true);
  };

  const del = async (row) => {
    if (row.id && !confirm('Delete this link?')) return;
    setRows((r) => r.filter((x) => keyOf(x) !== keyOf(row)));
    if (row.id) await supabase.from('links').delete().eq('id', row.id);
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
    await fetchRows();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="wrap">
      <div className="links-head">
        <Link href="/" className="back">← Back to board</Link>
        <h1>Links &amp; docs</h1>
        <div className="spacer" />
        <button className="add-task" onClick={addRow} disabled={!isConfigured || tableMissing}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M6.5 2v9M2 6.5h9" stroke="#0d1204" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add link
        </button>
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
          <div className="links-scroll">
            <table className="links-table">
              <thead>
                <tr>
                  <th className="name-col">Name</th>
                  <th>Link</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={keyOf(row)}>
                    <td className="name-col">
                      <input
                        className="input"
                        placeholder="e.g. Design file"
                        value={row.name}
                        onChange={(e) => update(keyOf(row), 'name', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        type="url"
                        placeholder="https://…"
                        value={row.url}
                        onChange={(e) => update(keyOf(row), 'url', e.target.value)}
                      />
                    </td>
                    <td className="row-actions">
                      <a
                        className={`icon-btn${row.url ? '' : ' disabled'}`}
                        href={row.url || undefined}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open link">
                        <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M5 3H3.3v7.7H11V9M8.2 3H11v2.8M11 3 6.6 7.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                      <button className="icon-btn danger" onClick={() => del(row)} aria-label="Delete link">
                        <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M2.8 4.2h8.4M5.6 4.2V2.8h2.8v1.4M4 4.2l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="links-empty">No links yet — click “Add link”.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="links-foot">
            <button className="add-task" onClick={save} disabled={saving || !dirty}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && <span className="saved-msg">Saved ✓</span>}
            {dirty && !saving && <span className="links-note-inline">Unsaved changes</span>}
          </div>
        </>
      )}
    </div>
  );
}
