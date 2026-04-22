/**
 * AddExpertsByPdfButton — Reusable Component
 * ============================================
 * Drop this anywhere to enable PDF → Expert parsing for a project.
 *
 * Props:
 *   projectId  {number}   — the project to add experts to
 *   onSuccess  {function} — called when ≥1 expert was created/updated (refresh hook)
 *   label      {string}   — optional button label (default: "Add Experts")
 *   variant    {string}   — 'primary' | 'secondary' | 'header' (default: 'header')
 */

import React, { useCallback, useRef, useState } from 'react';
import Modal from '../ui/Modal';
import { uploadExpertPdfs } from '../../api/projects';

// ── Status badge helpers ──────────────────────────────────────────────────────

const STATUS_META = {
    created:   { label: 'Created',   bg: '#dcfce7', color: '#166534', icon: '✓' },
    updated:   { label: 'Updated',   bg: '#dbeafe', color: '#1d4ed8', icon: '↑' },
    duplicate: { label: 'Duplicate', bg: '#fef9c3', color: '#854d0e', icon: '≡' },
    pending:   { label: 'Pending',   bg: '#f3f4f6', color: '#374151', icon: '…' },
    processing:{ label: 'Parsing…',  bg: '#ede9fe', color: '#5b21b6', icon: '⟳' },
    error:     { label: 'Error',     bg: '#fee2e2', color: '#7f1d1d', icon: '✗' },
};

function StatusBadge({ status }) {
    const m = STATUS_META[status] || STATUS_META.pending;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 9px', borderRadius: 20,
            background: m.bg, color: m.color,
            fontSize: '0.72rem', fontWeight: 700,
            letterSpacing: '0.02em',
        }}>
            <span style={{ fontSize: '0.85rem' }}>{m.icon}</span>
            {m.label}
        </span>
    );
}

// ── Drag-and-drop zone ────────────────────────────────────────────────────────

function DropZone({ onFiles }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files).filter(f =>
            f.name.toLowerCase().endsWith('.pdf')
        );
        if (files.length) onFiles(files);
    }, [onFiles]);

    const handleChange = useCallback((e) => {
        const files = Array.from(e.target.files || []);
        if (files.length) onFiles(files);
        e.target.value = '';
    }, [onFiles]);

    return (
        <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
                border: `2px dashed ${dragging ? '#6366f1' : '#c7d2fe'}`,
                borderRadius: 10,
                padding: '28px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragging ? '#eef2ff' : '#f8faff',
                transition: 'all 0.2s ease',
                userSelect: 'none',
            }}
        >
            {/* PDF icon */}
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={dragging ? '#6366f1' : '#818cf8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="8" y1="13" x2="16" y2="13"/>
                <line x1="8" y1="17" x2="16" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
            </svg>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                {dragging ? 'Drop PDFs here' : 'Click or drag & drop PDF files'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                Each PDF represents one expert profile. Multiple files supported.
            </div>
            <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                multiple
                style={{ display: 'none' }}
                onChange={handleChange}
            />
        </div>
    );
}

// ── File list item ────────────────────────────────────────────────────────────

function FileListItem({ file, result, onRemove }) {
    const status = result?.status || 'pending';
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 8,
            background: '#f9fafb', border: '1px solid #e5e7eb',
            marginBottom: 6,
        }}>
            {/* PDF icon small */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                </div>
                {result?.name && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 1 }}>
                        {result.name} {result.expert_id ? `· ${result.expert_id}` : ''}
                    </div>
                )}
                {result?.message && status === 'error' && (
                    <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 1 }}>
                        {result.message}
                    </div>
                )}
            </div>
            <StatusBadge status={status} />
            {!result && onRemove && (
                <button
                    onClick={() => onRemove(file)}
                    title="Remove"
                    style={{
                        border: 'none', background: 'none', cursor: 'pointer',
                        color: '#9ca3af', fontSize: '1rem', padding: '0 2px', lineHeight: 1,
                    }}
                >×</button>
            )}
        </div>
    );
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ summary }) {
    if (!summary) return null;
    return (
        <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap',
            padding: '12px 14px', borderRadius: 8,
            background: 'linear-gradient(135deg, #f0fdf4, #eff6ff)',
            border: '1px solid #bbf7d0',
            marginTop: 14,
        }}>
            {[
                { key: 'created',   label: 'Created',   bg: '#dcfce7', color: '#166534' },
                { key: 'updated',   label: 'Updated',   bg: '#dbeafe', color: '#1d4ed8' },
                { key: 'duplicate', label: 'Duplicate', bg: '#fef9c3', color: '#854d0e' },
                { key: 'error',     label: 'Error',     bg: '#fee2e2', color: '#7f1d1d' },
            ].filter(i => summary[i.key] > 0).map(item => (
                <div key={item.key} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 20,
                    background: item.bg, color: item.color,
                    fontSize: '0.8rem', fontWeight: 700,
                }}>
                    <span style={{ fontSize: '1.1rem', lineHeight: 1, fontWeight: 800 }}>
                        {summary[item.key]}
                    </span>
                    {item.label}
                </div>
            ))}
            <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#4b5563', display: 'flex', alignItems: 'center' }}>
                {summary.total} PDF{summary.total !== 1 ? 's' : ''} processed
            </div>
        </div>
    );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
    return (
        <svg width="16" height="16" viewBox="0 0 50 50" style={{ animation: 'pdfbtn-spin 0.8s linear infinite' }}>
            <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="6" fill="none" strokeDasharray="31.4 31.4">
                <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
            </circle>
        </svg>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AddExpertsByPdfButton({ projectId, onSuccess, label = 'Add Experts', variant = 'header' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [files, setFiles] = useState([]);            // File[]
    const [results, setResults] = useState({});        // filename → result
    const [isUploading, setIsUploading] = useState(false);
    const [processingFile, setProcessingFile] = useState(null); // async progress
    const [summary, setSummary] = useState(null);
    const [uploadDone, setUploadDone] = useState(false);

    // Add new files (deduplicate by name)
    const handleFiles = useCallback((newFiles) => {
        setFiles(prev => {
            const existing = new Set(prev.map(f => f.name));
            return [...prev, ...newFiles.filter(f => !existing.has(f.name))];
        });
    }, []);

    // Remove a file before upload
    const handleRemove = useCallback((file) => {
        setFiles(prev => prev.filter(f => f.name !== file.name));
    }, []);

    // Reset modal state
    const handleClose = useCallback(() => {
        if (isUploading) return; // prevent close during upload
        setIsOpen(false);
        setFiles([]);
        setResults({});
        setSummary(null);
        setUploadDone(false);
        setProcessingFile(null);
    }, [isUploading]);

    // Upload with async progress simulation
    const handleUpload = useCallback(async () => {
        if (!files.length || isUploading) return;
        setIsUploading(true);
        setSummary(null);
        setResults({});
        setUploadDone(false);

        // Mark all as "processing"
        const initResults = {};
        files.forEach(f => { initResults[f.name] = { status: 'processing' }; });
        setResults({ ...initResults });

        try {
            // Simulate per-file progress: upload all at once but update UI file-by-file
            // We process sequentially via individual requests for true async feedback
            const allResults = {};
            let anySuccess = false;

            for (const file of files) {
                setProcessingFile(file.name);
                try {
                    const res = await uploadExpertPdfs(projectId, [file]);
                    const r = res.results?.[0] || { status: 'error', message: 'No result returned', filename: file.name };
                    allResults[file.name] = r;
                    if (r.status === 'created' || r.status === 'updated') anySuccess = true;
                } catch (err) {
                    allResults[file.name] = {
                        status: 'error',
                        message: err?.data?.error || err.message || 'Upload failed',
                        filename: file.name,
                    };
                }
                setResults(prev => ({ ...prev, [file.name]: allResults[file.name] }));
            }

            setProcessingFile(null);

            // Build summary
            const counts = { created: 0, updated: 0, duplicate: 0, error: 0, total: files.length };
            Object.values(allResults).forEach(r => {
                const s = r.status || 'error';
                counts[s] = (counts[s] || 0) + 1;
            });
            setSummary(counts);
            setUploadDone(true);

            if (anySuccess && onSuccess) onSuccess();

        } catch (err) {
            console.error('PDF upload failed:', err);
            const errResults = {};
            files.forEach(f => { errResults[f.name] = { status: 'error', message: err?.data?.error || 'Upload failed' }; });
            setResults(errResults);
            setUploadDone(true);
        } finally {
            setIsUploading(false);
            setProcessingFile(null);
        }
    }, [files, isUploading, projectId, onSuccess]);

    // ── Button styles ──
    const btnStyles = {
        header: {
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#4f46e5', color: '#ffffff',
            fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600,
            padding: '7px 14px', border: 'none', borderRadius: 3,
            cursor: 'pointer', letterSpacing: '0.01em', whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'background 0.15s',
        },
        primary: {
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#4f46e5', color: '#ffffff',
            fontSize: '0.85rem', fontWeight: 600,
            padding: '9px 20px', border: 'none', borderRadius: 6,
            cursor: 'pointer',
        },
        secondary: {
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#f3f4f6', color: '#374151',
            fontSize: '0.85rem', fontWeight: 600,
            padding: '9px 20px', border: '1px solid #d1d5db', borderRadius: 6,
            cursor: 'pointer',
        },
    };

    return (
        <>
            {/* Inject keyframes once */}
            <style>{`@keyframes pdfbtn-spin { to { transform: rotate(360deg); } }`}</style>

            {/* Trigger button */}
            <button
                id="add-experts-pdf-btn"
                className="add-experts-pdf-trigger"
                style={btnStyles[variant] || btnStyles.header}
                onClick={() => setIsOpen(true)}
                title="Upload expert profile PDFs to extract and add experts"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                {label}
            </button>

            {/* Modal */}
            <Modal
                open={isOpen}
                onClose={handleClose}
                title="Add Experts from PDF Profiles"
            >
                {/* Modal body */}
                <div style={{ padding: '0 0 4px' }}>

                    {/* Drop zone — hide after upload starts */}
                    {!uploadDone && (
                        <DropZone onFiles={handleFiles} />
                    )}

                    {/* File list */}
                    {files.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{
                                fontSize: '0.78rem', fontWeight: 700, color: '#6b7280',
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                                marginBottom: 8,
                            }}>
                                {uploadDone ? 'Results' : `Selected Files (${files.length})`}
                            </div>
                            {files.map(file => (
                                <FileListItem
                                    key={file.name}
                                    file={file}
                                    result={results[file.name]}
                                    onRemove={!isUploading && !uploadDone ? handleRemove : null}
                                />
                            ))}
                        </div>
                    )}

                    {/* Progress label */}
                    {isUploading && processingFile && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontSize: '0.8rem', color: '#6366f1', marginTop: 10,
                            fontWeight: 600,
                        }}>
                            <Spinner />
                            Analysing: {processingFile}
                        </div>
                    )}

                    {/* Summary */}
                    <SummaryBar summary={summary} />

                    {/* No files notice */}
                    {files.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem', marginTop: 12 }}>
                            No files selected yet.
                        </div>
                    )}
                </div>

                {/* Modal footer */}
                <div style={{
                    display: 'flex', justifyContent: 'flex-end', gap: 8,
                    borderTop: '1px solid #f0f0f0', paddingTop: 14, marginTop: 14,
                }}>
                    <button
                        onClick={handleClose}
                        disabled={isUploading}
                        style={{
                            background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
                            fontFamily: 'inherit', fontSize: '0.83rem', fontWeight: 600,
                            padding: '8px 18px', borderRadius: 5, cursor: isUploading ? 'not-allowed' : 'pointer',
                            opacity: isUploading ? 0.6 : 1,
                        }}
                    >
                        {uploadDone ? 'Close' : 'Cancel'}
                    </button>

                    {!uploadDone && (
                        <button
                            onClick={handleUpload}
                            disabled={!files.length || isUploading}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 7,
                                background: (!files.length || isUploading) ? '#a5b4fc' : '#4f46e5',
                                color: '#ffffff', border: 'none',
                                fontFamily: 'inherit', fontSize: '0.83rem', fontWeight: 600,
                                padding: '8px 20px', borderRadius: 5,
                                cursor: (!files.length || isUploading) ? 'not-allowed' : 'pointer',
                                transition: 'background 0.2s',
                            }}
                        >
                            {isUploading ? (
                                <><Spinner /> Processing…</>
                            ) : (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="16 16 12 12 8 16"/>
                                        <line x1="12" y1="12" x2="12" y2="21"/>
                                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                                    </svg>
                                    Upload &amp; Parse {files.length > 0 ? `(${files.length})` : ''}
                                </>
                            )}
                        </button>
                    )}

                    {uploadDone && summary && (summary.created > 0 || summary.updated > 0) && (
                        <button
                            onClick={() => { handleClose(); }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                background: '#16a34a', color: '#fff', border: 'none',
                                fontFamily: 'inherit', fontSize: '0.83rem', fontWeight: 600,
                                padding: '8px 18px', borderRadius: 5, cursor: 'pointer',
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Done – View Experts
                        </button>
                    )}
                </div>
            </Modal>
        </>
    );
}
