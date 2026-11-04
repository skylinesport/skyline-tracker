'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isConfigured } from '../../lib/supabaseClient';

const COLUMNS_TABLE = 'campus_ambassador_columns';
const ROWS_TABLE = 'campus_ambassadors';
const BUCKET = 'campus-docs';

// Fixed highlight palette. The *meaning* of each colour is editable (stored in
// the hidden legend row); the swatches themselves are fixed.
const PALETTE = [
  { key: 'green', hex: '#34d399', name: 'Green' },
  { key: 'amber', hex: '#fbbf24', name: 'Amber' },
  { key: 'red', hex: '#f87171', name: 'Red' },
  { key: 'blue', hex: '#60a5fa', name: 'Blue' },
  { key: 'purple', hex: '#c084fc', name: 'Purple' },
];
const colorOf = (key) => PALETTE.find((p) => p.key === key);
const hexToRgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

// Keep filenames storage-safe (spaces/odd chars break some signed URLs).
const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);

// A hidden config row (sort_order -1) carries the colour -> meaning map; it is
// never shown or counted as an ambassador.
const isMeta = (r) => r?.data?.__meta === 'legend';

export default function CampusDashboard() {
  const [columns, setColumns] = useState(null);
  const [rows, setRows] = useState(null);
  const [legend, setLegend] = useState({});
  const [uploadingId, setUploadingId] = useState(null);
  const metaId = useRef(null);
  const creatingMeta = useRef(false);

  const fetchColumns = useCallback(async () => {
    if (!isConfigured) { setColumns([]); return; }
    const { data } = await supabase
      .from(COLUMNS_TABLE)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setColumns(data || []);
  }, []);

  const fetchRows = useCallback(async () => {
    if (!isConfigured) { setRows([]); return; }
    const { data } = await supabase
      .from(ROWS_TABLE)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    const all = data || [];
    const meta = all.find(isMeta);
    metaId.current = meta?.id ?? null;
    setLegend(meta?.data?.legend || {});
    setRows(all.filter((r) => !isMeta(r)));
    // Lazily create the legend store once if it is missing.
    if (!meta && isConfigured && !creatingMeta.current) {
      creatingMeta.current = true;
      await supabase.from(ROWS_TABLE).insert({ data: { __meta: 'legend', legend: {} }, sort_order: -1 });
    }
  }, []);

  useEffect(() => {
    fetchColumns();
    fetchRows();
    if (!isConfigured) return;
    const ch = supabase
      .channel('campus-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: COLUMNS_TABLE }, fetchColumns)
      .on('postgres_changes', { event: '*', schema: 'public', table: ROWS_TABLE }, fetchRows)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchColumns, fetchRows]);

  // ── Columns ───────────────────────────────────────────────────────────────
  const addColumn = async () => {
    const nextOrder = (columns?.reduce((m, c) => Math.max(m, c.sort_order || 0), 0) ?? 0) + 1;
    await supabase.from(COLUMNS_TABLE).insert({ label: 'New column', sort_order: nextOrder });
    fetchColumns();
  };

  const renameColumn = async (col, label) => {
    const next = label.trim() || 'Column';
    if (next === col.label) return;
    setColumns((cs) => cs?.map((c) => (c.id === col.id ? { ...c, label: next } : c)));
    await supabase.from(COLUMNS_TABLE).update({ label: next }).eq('id', col.id);
  };

  const deleteColumn = async (col) => {
    if (!confirm(`Delete the "${col.label}" column? Values in it will be hidden.`)) return;
    setColumns((cs) => cs?.filter((c) => c.id !== col.id));
    await supabase.from(COLUMNS_TABLE).delete().eq('id', col.id);
  };

  // ── Legend (colour meanings) ───────────────────────────────────────────────
  const setLegendLabel = async (key, label) => {
    const next = { ...legend, [key]: label };
    setLegend(next);
    if (!metaId.current) return;
    await supabase.from(ROWS_TABLE).update({ data: { __meta: 'legend', legend: next } }).eq('id', metaId.current);
  };
  const colorLabel = (key) => (legend[key]?.trim() || colorOf(key)?.name || key);

  // ── Rows ──────────────────────────────────────────────────────────────────
  const addRow = async () => {
    const nextOrder = (rows?.reduce((m, r) => Math.max(m, r.sort_order || 0), 0) ?? 0) + 1;
    await supabase.from(ROWS_TABLE).insert({ data: {}, sort_order: nextOrder });
    fetchRows();
  };

  const patchRow = async (id, fields) => {
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    await supabase.from(ROWS_TABLE).update(fields).eq('id', id);
  };

  const onCellBlur = (row, col, e) => {
    const value = e.target.value;
    const current = row.data?.[col.id] ?? '';
    if (value === current) return;
    patchRow(row.id, { data: { ...(row.data || {}), [col.id]: value } });
  };

  const setRowColor = (row, key) => {
    const data = { ...(row.data || {}) };
    if (key) data.__color = key; else delete data.__color;
    patchRow(row.id, { data });
  };

  const deleteRow = async (row) => {
    if (!confirm('Delete this ambassador row?')) return;
    setRows((rs) => rs?.filter((r) => r.id !== row.id));
    if (row.doc_path) await supabase.storage.from(BUCKET).remove([row.doc_path]).catch(() => {});
    await supabase.from(ROWS_TABLE).delete().eq('id', row.id);
  };

  // ── Document (one per row) ─────────────────────────────────────────────────
  const uploadDoc = async (row, file) => {
    if (!file) return;
    setUploadingId(row.id);
    try {
      const path = `${row.id}/${Date.now()}-${safeName(file.name)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (error) { alert(`Upload failed: ${error.message}`); return; }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const oldPath = row.doc_path;
      await patchRow(row.id, { doc_url: pub.publicUrl, doc_name: file.name, doc_path: path });
      if (oldPath && oldPath !== path) await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
    } finally {
      setUploadingId(null);
    }
  };

  const removeDoc = async (row) => {
    if (!confirm('Remove this document?')) return;
    if (row.doc_path) await supabase.storage.from(BUCKET).remove([row.doc_path]).catch(() => {});
    await patchRow(row.id, { doc_url: null, doc_name: null, doc_path: null });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!isConfigured) {
    return <div className="ca-empty">Connect Supabase (set the two env vars) to use the dashboard.</div>;
  }
  if (columns === null || rows === null) {
    return <div className="ca-empty">Loading dashboard…</div>;
  }
  if (columns.length === 0) {
    return (
      <div className="ca-empty">
        Run <code>supabase/campus_dashboard.sql</code> once in Supabase to set up the roster, then reload.
      </div>
    );
  }

  const EXTRA = 4; // #, Flag, Document, actions

  return (
    <div className="cad">
      <p className="ca-intro">
        One row per ambassador. Click any cell to edit — changes sync live for the team.
        Add columns or rows anytime, highlight a row with a colour, and attach one document per ambassador.
      </p>

      {/* Colour legend — name what each highlight means */}
      <div className="cad-legend">
        <span className="cad-legend-title">Highlights</span>
        {PALETTE.map((p) => (
          <label className="cad-legend-item" key={p.key} title={`What does ${p.name} mean?`}>
            <span className="cad-swatch" style={{ background: p.hex }} />
            <input
              className="cad-legend-input"
              defaultValue={legend[p.key] || ''}
              placeholder={p.name}
              onBlur={(e) => setLegendLabel(p.key, e.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="cad-toolbar">
        <button className="add-task" onClick={addRow}>+ Add ambassador</button>
        <button className="save-quiet" onClick={addColumn}>+ Add column</button>
        <div className="spacer" />
        <span className="cad-count">{rows.length} {rows.length === 1 ? 'ambassador' : 'ambassadors'}</span>
      </div>

      <div className="cad-scroll">
        <table className="cad-table">
          <thead>
            <tr>
              <th className="cad-sn">#</th>
              <th className="cad-flag-h">Flag</th>
              {columns.map((col) => (
                <th key={col.id}>
                  <div className="cad-th">
                    <input
                      className="cad-colname"
                      defaultValue={col.label}
                      aria-label="Column name"
                      onBlur={(e) => renameColumn(col, e.target.value)}
                    />
                    <button className="icon-btn danger cad-delcol" aria-label="Delete column" onClick={() => deleteColumn(col)}>
                      <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.8 4.2h8.4M5.6 4.2V2.8h2.8v1.4M4 4.2l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </th>
              ))}
              <th className="cad-doc-h">Document</th>
              <th className="cad-act-h" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="cad-norows" colSpan={columns.length + EXTRA}>
                  No ambassadors yet — click <b>+ Add ambassador</b> to create the first row.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const c = colorOf(row.data?.__color);
                const tint = c ? hexToRgba(c.hex, 0.14) : undefined;
                return (
                  <tr key={row.id} style={c ? { background: tint } : undefined}>
                    <td className="cad-sn" style={c ? { boxShadow: `inset 3px 0 0 ${c.hex}` } : undefined}>{i + 1}</td>
                    <td className="cad-flag">
                      <span className="cad-dot" style={{ background: c ? c.hex : 'transparent', borderColor: c ? c.hex : 'var(--line-2)' }} />
                      <select
                        className="cad-colorsel"
                        aria-label="Highlight colour"
                        value={row.data?.__color || ''}
                        onChange={(e) => setRowColor(row, e.target.value)}
                      >
                        <option value="">— None</option>
                        {PALETTE.map((p) => (
                          <option key={p.key} value={p.key}>{colorLabel(p.key)}</option>
                        ))}
                      </select>
                    </td>
                    {columns.map((col) => (
                      <td key={col.id}>
                        <input
                          className="cad-cell"
                          defaultValue={row.data?.[col.id] ?? ''}
                          placeholder="—"
                          onBlur={(e) => onCellBlur(row, col, e)}
                        />
                      </td>
                    ))}
                    <td className="cad-doc">
                      <DocCell row={row} uploading={uploadingId === row.id} onUpload={uploadDoc} onRemove={removeDoc} />
                    </td>
                    <td className="cad-act">
                      <button className="icon-btn danger" aria-label="Delete row" onClick={() => deleteRow(row)}>
                        <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.8 4.2h8.4M5.6 4.2V2.8h2.8v1.4M4 4.2l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocCell({ row, uploading, onUpload, onRemove }) {
  const inputRef = useRef(null);
  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    onUpload(row, file);
  };

  if (uploading) return <span className="cad-muted">Uploading…</span>;

  return (
    <div className="cad-docrow">
      <input ref={inputRef} type="file" hidden onChange={pick} />
      {row.doc_url ? (
        <>
          <a className="cad-doclink" href={row.doc_url} target="_blank" rel="noreferrer" title={row.doc_name || 'Document'}>
            <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M8 1.5H4.2c-.6 0-1 .4-1 1v9c0 .6.4 1 1 1h5.6c.6 0 1-.4 1-1V4.3L8 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" /><path d="M8 1.5v3h2.8" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" /></svg>
            <span className="cad-docname">{row.doc_name || 'View'}</span>
          </a>
          <button className="cad-link-btn" onClick={() => inputRef.current?.click()}>Replace</button>
          <button className="icon-btn danger" aria-label="Remove document" onClick={() => onRemove(row)}>
            <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.8 4.2h8.4M5.6 4.2V2.8h2.8v1.4M4 4.2l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </>
      ) : (
        <button className="cad-upload" onClick={() => inputRef.current?.click()}>
          <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 9.5V3M4.3 5.5 7 2.8l2.7 2.7M2.8 11.2h8.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Upload
        </button>
      )}
    </div>
  );
}
