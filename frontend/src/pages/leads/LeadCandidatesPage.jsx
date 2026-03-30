import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { fetchLeadCandidates, deleteLeadCandidate } from '../../api/leads';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import { EditIcon, TrashIcon } from '../../components/icons/Icons';

const LIMIT = 20;

export default function LeadCandidatesPage() {
    const navigate = useNavigate();
    const [view, setView] = useState('table');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const debounced = useDebouncedValue(search, 400);
    const [data, setData] = useState({ data: [], meta: { total_records: 0, current_page: 1, total_pages: 1, limit: LIMIT } });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchLeadCandidates({ page, limit: LIMIT, search: debounced }).then((res) => {
            if (cancelled) return;
            setData(res);
            setIsLoading(false);
        });
        return () => { cancelled = true; };
    }, [page, debounced]);

    const rows = data?.data || [];
    const meta = data?.meta || { total_records: 0, current_page: 1, total_pages: 1, limit: LIMIT };

    const handleCreate = useCallback(() => {
        navigate('/leads/candidates/new');
    }, [navigate]);

    const handleEdit = useCallback((id) => {
        navigate(`/leads/candidates/${id}/edit`);
    }, [navigate]);

    const handleDelete = useCallback(async (id) => {
        if (!window.confirm('Delete this lead candidate?')) return;
        setIsLoading(true);
        try {
            await deleteLeadCandidate(id);
            const res = await fetchLeadCandidates({ page, limit: LIMIT, search: debounced });
            setData(res);
        } finally {
            setIsLoading(false);
        }
    }, [page, debounced]);

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <input
                    className="form-input"
                    placeholder="Search candidates…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ maxWidth: 360, background: '#000', color: '#fff', borderColor: '#333' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className={`view-btn${view === 'table' ? ' view-btn--active' : ''}`} onClick={() => setView('table')}>Table</button>
                    <button className={`view-btn${view === 'cards' ? ' view-btn--active' : ''}`} onClick={() => setView('cards')}>Cards</button>
                    <Button onClick={handleCreate}>+ Create Candidate</Button>
                </div>
            </div>
            <div>
                {isLoading ? (
                    <Loader rows={LIMIT} />
                ) : rows.length === 0 ? (
                    <div className="empty-state">
                        <h3 className="empty-state__title">No candidate leads</h3>
                        <p className="empty-state__text">Try adjusting your search</p>
                    </div>
                ) : view === 'table' ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f3f3f3' }}>
                                <th style={th}>First Name</th>
                                <th style={th}>Last Name</th>
                                <th style={th}>City</th>
                                <th style={th}>Email</th>
                                <th style={th}>Phone</th>
                                <th style={{ ...th }}>LinkedIn</th>
                                <th style={{ ...th }}>Resume</th>
                                <th style={{ ...th, whiteSpace: 'nowrap' }}>Received</th>
                                <th style={{ ...th, whiteSpace: 'nowrap' }}>Status</th>
                                <th style={{ ...th, whiteSpace: 'nowrap' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
                                    <td style={td}>{r.first_name}</td>
                                    <td style={td}>{r.last_name}</td>
                                    <td style={td}>{r.city}</td>
                                    <td style={td}>{r.email}</td>
                                    <td style={td}>{r.phone_number}</td>
                                    <td style={td}><a href={r.linkedin_url} target="_blank" rel="noreferrer">Profile</a></td>
                                    <td style={td}><a href={r.resume_url} target="_blank" rel="noreferrer">View</a></td>
                                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.received_date || '—'}</td>
                                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                                        <span style={statusPillStyle(r.status)}>{r.status || 'Backlog'}</span>
                                    </td>
                                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button type="button" className="action-btn" title="Edit" onClick={() => handleEdit(r.id)}>
                                                <EditIcon />
                                            </button>
                                            <button type="button" className="action-btn action-btn--danger" title="Delete" onClick={() => handleDelete(r.id)}>
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                        {rows.map((r) => (
                            <div key={r.id} className="card" style={{ padding: 12 }}>
                                <div style={{ fontWeight: 700 }}>{r.first_name} {r.last_name}</div>
                                <div style={{ color: '#555', fontSize: '0.9rem' }}>{r.city}</div>
                                <div style={{ marginTop: 6, fontSize: '0.82rem', color: '#444' }}>
                                    <span>{r.received_date || '—'}</span>
                                    <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 12, background: '#eef2f7' }}>{r.status || 'Backlog'}</span>
                                </div>
                                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                                    <a href={r.linkedin_url} target="_blank" rel="noreferrer" className="link-btn">LinkedIn</a>
                                    <a href={r.resume_url} target="_blank" rel="noreferrer" className="link-btn">Resume</a>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button type="button" className="action-btn" title="Edit" onClick={() => handleEdit(r.id)}>
                                            <EditIcon />
                                        </button>
                                        <button type="button" className="action-btn action-btn--danger" title="Delete" onClick={() => handleDelete(r.id)}>
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {meta && meta.total_pages > 1 && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn--secondary btn--sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                    <div style={{ alignSelf: 'center', fontSize: '0.9rem' }}>{meta.current_page} / {meta.total_pages}</div>
                    <button className="btn btn--secondary btn--sm" disabled={page >= meta.total_pages} onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}>Next</button>
                </div>
            )}
        </>
    );
}

const th = { textAlign: 'left', padding: '8px 10px', fontWeight: 600, fontSize: '0.86rem' };
const td = { padding: '8px 10px', fontSize: '0.86rem' };

function statusPillStyle(status) {
    const s = (status || 'Backlog').toLowerCase();
    const base = { padding: '2px 8px', borderRadius: 12, fontSize: '0.78rem', whiteSpace: 'nowrap' };
    if (s.includes('progress')) return { ...base, background: '#e8f3ff', color: '#0b66c3' };
    if (s.includes('complete')) return { ...base, background: '#e8f8ef', color: '#127c47' };
    if (s.includes('hold')) return { ...base, background: '#fff7e6', color: '#b46b00' };
    if (s.includes('reject')) return { ...base, background: '#ffecef', color: '#b42318' };
    return { ...base, background: '#eef2f7', color: '#38424a' }; // Backlog/default
}
