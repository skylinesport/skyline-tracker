'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isConfigured } from '../../lib/supabaseClient';

const COLUMNS_TABLE = 'campus_ambassador_columns';
const ROWS_TABLE = 'campus_ambassadors';
const BUCKET = 'campus-docs';

// Keep filenames storage-safe (spaces/odd chars break some signed URLs).
const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);

export default function CampusDashboard() {
  const [columns, setColumns] = useState(null);
  const [rows, setRows] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);

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
    setRows(data || []);
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

  return (
    <div className="cad">
      <p className="ca-intro">
        One row per ambassador. Click any cell to edit — changes sync live for the team.
        Add columns or rows anytime, and attach one document (offer letter, ID, agreement…) per ambassador.
      </p>

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
                <td className="cad-norows" colSpan={columns.length + 2}>
                  No ambassadors yet — click <b>+ Add ambassador</b> to create the first row.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
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
              ))
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
