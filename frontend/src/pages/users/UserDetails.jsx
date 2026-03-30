import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { fetchUserById, updateUser } from '../../api/users';
import { fetchProjectsPaged } from '../../api/projects';
import Loader from '../../components/ui/Loader';
import EngagementAssignmentsTable from '../../components/engagements/EngagementAssignmentsTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

export default function UserDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [newNote, setNewNote] = useState({ date: new Date().toISOString().split('T')[0], type: 'Whatsapp', title: '', description: '' });
    const [userProjects, setUserProjects] = useState([]);
    const [projPage, setProjPage] = useState(1);
    const [projMeta, setProjMeta] = useState({ total_pages: 1, current_page: 1, total_records: 0, limit: 20 });

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchUserById(id).then((u) => {
            if (cancelled) return;
            setUser(u || null);
            setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [id]);

    useEffect(() => {
        let cancelled = false;
        fetchProjectsPaged({ page: projPage, limit: 20, pocUserId: id }).then((res) => {
            if (cancelled) return;
            setUserProjects(Array.isArray(res?.data) ? res.data : []);
            setProjMeta(res?.meta || { total_pages: 1, current_page: 1, total_records: 0, limit: 20 });
        });
        return () => { cancelled = true; };
    }, [id, projPage]);

    const handleSaveNote = async () => {
        if (!newNote.title.trim() && !newNote.description.trim()) return;
        setIsSavingNote(true);
        try {
            const updatedNotes = Array.isArray(user.notes) ? [...user.notes] : [];
            updatedNotes.push({ ...newNote, id: Date.now() });
            
            await updateUser(id, {
                ...user,
                notes: updatedNotes
            });
            
            // Refresh user data
            const updatedUser = await fetchUserById(id);
            setUser(updatedUser);
            setNoteModalOpen(false);
            setNewNote({ date: new Date().toISOString().split('T')[0], type: 'Whatsapp', title: '', description: '' });
        } catch (error) {
            console.error('Failed to save note:', error);
        } finally {
            setIsSavingNote(false);
        }
    };

    const nameDisplay = useMemo(() => {
        if (!user) return 'User';
        return user.full_name || user.user_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
    }, [user]);

    if (isLoading || !user) return <Loader rows={8} />;

    const raNames = Array.isArray(user.client_solution_owner_names) ? user.client_solution_owner_names : [];
    const amNames = Array.isArray(user.sales_team_names) ? user.sales_team_names : [];
    const linkedinDisplay = user.linkedin_url ? (
        <a href={user.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>
    ) : '—';

    return (
        <>
            <style>{`
  *, *::before, *::after { box-sizing: border-box; padding: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; background: #f0f0f0; color: #1a1a1a; font-size: 13.5px; line-height: 1.5; }
  a { color: #1a1a1a; text-decoration: none; }
  .page { margin: 12px auto; background: #ffffff; border: 1px solid #c8c8c8; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.10); }
  .hdr { background: #ffffff; border-bottom: 1px solid #d0d0d0; padding: 10px 14px 0 14px; position: relative; }
  .hdr-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4px; }
  .hdr-title { font-size: 1.25rem; font-weight: 700; color: #111111; letter-spacing: -0.01em; }
  .btn-edit { display: inline-flex; align-items: center; gap: 6px; background: #1a5ca8; color: #ffffff; font-family: inherit; font-size: 0.78rem; font-weight: 600; padding: 7px 16px; border: none; border-radius: 3px; cursor: pointer; letter-spacing: 0.01em; white-space: nowrap; flex-shrink: 0; }
  .btn-edit:hover { background: #164d8c; }
  .hdr-subtitle { font-size: 0.82rem; color: #444444; margin-bottom: 14px; }
  .hdr-subtitle a { color: #444444; font-weight: 500; }
  .team-row { display: flex; gap: 20px; padding: 6px 0; border-top: 1px solid #e0e0e0; }
  .team-member { display: flex; align-items: center; gap: 10px; }
  .t-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; color: #ffffff; flex-shrink: 0; }
  .t-av-dark { background: #2c2c3e; } .t-av-wine { background: #7c1c3c; }
  .t-info { display: flex; flex-direction: column; gap: 1px; }
  .t-name { font-weight: 600; font-size: 0.88rem; color: #111111; } .t-role { font-size: 0.75rem; color: #666666; }
  .body-split { display: grid; grid-template-columns: 1fr 260px; border-bottom: 1px solid #d0d0d0; }
  .left-pane { padding: 12px 14px; border-right: 1px solid #d0d0d0; }
  .sec-title { font-size: 0.97rem; font-weight: 700; color: #111111; margin-bottom: 6px; }
  .desc-text { font-size: 0.84rem; color: #333333; line-height: 1.65; margin-bottom: 6px; white-space: pre-wrap; }
  .divider { height: 1px; background: #e0e0e0; margin: 8px 0; }
  .info-row { display: grid; grid-template-columns: 150px 1fr; gap: 8px; padding: 4px 0; font-size: 0.84rem; color: #333333; }
  .info-key { font-weight: 700; color: #111111; }
  .right-pane { padding: 12px 12px; background: #fafafa; }
  .ideal-title { font-size: 0.97rem; font-weight: 700; color: #111111; margin-bottom: 8px; }
  .ideal-list { list-style: none; margin-bottom: 18px; display: flex; flex-direction: column; gap: 3px; }
  .ideal-list li { display: flex; align-items: flex-start; gap: 7px; font-size: 0.83rem; color: #333333; }
  .proj-list { list-style: none; margin-bottom: 8px; display: flex; flex-direction: column; gap: 3px; }
  .proj-list li { display: flex; align-items: flex-start; gap: 7px; font-size: 0.83rem; color: #333333; }
  .proj-list li::before { content: '•'; color: #555555; flex-shrink: 0; font-size: 1rem; }
  @media (max-width: 700px) { .body-split { grid-template-columns: 1fr; } }
            `}</style>
            <div className="page">
                <div className="hdr">
                    <div className="hdr-top">
                        <div className="hdr-title">{nameDisplay}</div>
                        <button className="btn-edit" onClick={() => navigate(`/users/${user.user_id}/edit`)}>Edit User</button>
                    </div>
                    <div className="hdr-subtitle">
                        Client: <strong>{user.client_id ? <a href={`/clients/${user.client_id}`}>{user.client_name || `#${user.client_id}`}</a> : (user.client_name || '—')}</strong> • User ID: <strong>{user.user_code || '—'}</strong> • Title: <strong>{user.designation_title || '—'}</strong> • Status: <strong>{user.status || '—'}</strong> 
                    </div>
                    <div className="team-row">
                        <div className="team-member">
                            <div className="t-avatar t-av-dark">{(raNames[0] || 'CS').slice(0,2).toUpperCase()}</div>
                            <div className="t-info">
                                <div className="t-name">{raNames.join(', ') || '—'}</div>
                                <div className="t-role">Client Solution</div>
                            </div>
                        </div>
                        <div className="team-member">
                            <div className="t-avatar t-av-wine">{(amNames[0] || 'AM').slice(0,2).toUpperCase()}</div>
                            <div className="t-info">
                                <div className="t-name">{amNames.join(', ') || '—'}</div>
                                <div className="t-role">Sales Team</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="body-split">
                    <div className="left-pane">
                        <div className="sec-title">User Overview</div>
                        <div className="desc-text">{user.ai_generated_bio || '—'}</div>
                        <div className="divider"></div>
                        <div className="sec-title">Preferences</div>
                        <div className="info-row"><div className="info-key">Location</div><div>{user.location || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Preferred Contact</div><div>{user.preferred_contact_method || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Time Zone</div><div>{user.time_zone || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Avg Calls / Month</div><div>{user.avg_calls_per_month ?? '—'}</div></div>
                        <div className="divider"></div>
                        <div className="sec-title">Project Details</div>
                        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
                            {Array.isArray(userProjects) && userProjects.length > 0 ? (
                                <div style={{ border: '1px solid #e0e0e0', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
                                    <div style={{ overflowY: 'auto', maxHeight: 420 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ background: '#ebebeb' }}>
                                                <tr>
                                                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.84rem', fontWeight: 600, color: '#333', borderRight: '1px solid #c8c8c8', whiteSpace: 'nowrap' }}>User ID</th>
                                                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.84rem', fontWeight: 600, color: '#333', borderRight: '1px solid #c8c8c8', whiteSpace: 'nowrap' }}>Project ID</th>
                                                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.84rem', fontWeight: 600, color: '#333', borderRight: '1px solid #c8c8c8' }}>Project Title</th>
                                                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.84rem', fontWeight: 600, color: '#333', borderRight: '1px solid #c8c8c8' }}>Target Companies</th>
                                                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.84rem', fontWeight: 600, color: '#333', borderRight: '1px solid #c8c8c8', whiteSpace: 'nowrap' }}>Experts Accepted</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {userProjects.map((p) => (
                                                    <tr key={p.project_id} style={{ borderTop: '1px solid #e8e8e8' }}>
                                                        <td style={{ padding: '10px 12px', fontSize: '0.84rem', color: '#333', borderRight: '1px solid #e8e8e8', whiteSpace: 'nowrap' }}>{user.user_id}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: '0.84rem', color: '#333', borderRight: '1px solid #e8e8e8', whiteSpace: 'nowrap' }}>
                                                            <Link to={`/projects/${p.project_id}`} style={{ color: '#1a1a1a', textDecoration: 'none', fontWeight: 600 }}>{p.project_id}</Link>
                                                        </td>
                                                        <td style={{ padding: '10px 12px', fontSize: '0.84rem', color: '#333', borderRight: '1px solid #e8e8e8' }}>{p.project_title || p.title || `Project #${p.project_id}`}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: '0.84rem', color: '#333', borderRight: '1px solid #e8e8e8' }}>{p.target_companies || '—'}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: '0.84rem', color: '#333', borderRight: '1px solid #e8e8e8', whiteSpace: 'nowrap' }}>{p.accepted_count ?? '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#fff' }}>
                                        <button className="btn btn--secondary btn--sm" onClick={() => setProjPage((p) => Math.max(1, p - 1))} disabled={projMeta.current_page <= 1}>Prev</button>
                                        <div style={{ alignSelf: 'center', fontSize: '0.84rem' }}>{projMeta.current_page} / {projMeta.total_pages}</div>
                                        <button className="btn btn--secondary btn--sm" onClick={() => setProjPage((p) => Math.min(projMeta.total_pages, p + 1))} disabled={projMeta.current_page >= projMeta.total_pages}>Next</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="desc-text">—</div>
                            )}
                        </div>
                        <div className="divider"></div>
                        <div className="sec-title">Engagements</div>
                        <EngagementAssignmentsTable pocUserId={id} sticky={true} />
                        <div className="divider"></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div className="sec-title" style={{ margin: 0 }}>Notes</div>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                style={{ fontSize: '0.7rem', padding: '3px 8px', height: 'auto', minWidth: 'auto' }} 
                                onClick={() => setNoteModalOpen(true)}
                            >
                                + Add Note
                            </Button>
                        </div>
                        {Array.isArray(user.notes) && user.notes.length > 0 ? (
                            <div className="notes-display" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {user.notes.map((note, i) => (
                                    <div key={i} style={{ padding: '10px', background: '#f9f9f9', borderRadius: '4px', borderLeft: '3px solid #1a5ca8' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{note.title || 'Untitled Note'}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#666', whiteSpace: 'nowrap' }}>
                                                {note.date || 'No date'} {note.type ? `• ${note.type}` : ''}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.84rem', color: '#333', whiteSpace: 'pre-wrap' }}>{note.description || '—'}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="desc-text">{typeof user.notes === 'string' ? user.notes : '—'}</div>
                        )}
                    </div>
                    <div className="right-pane">
                        <div className="ideal-title">Key Info</div>
                        <ul className="ideal-list">
                            <li><span className="info-key">Client Name:</span><span>{user.client_name || '—'}</span></li>
                            <li><span className="info-key">User Code:</span><span>{user.user_code || '—'}</span></li>
                            <li><span className="info-key">Designation:</span><span>{user.designation_title || '—'}</span></li>
                            <li><span className="info-key">Seniority:</span><span>{user.seniority || '—'}</span></li>
                            <li><span className="info-key">Status:</span><span>{user.status || '—'}</span></li>
                            <li><span className="info-key">User Manager:</span><span>{user.user_manager || '—'}</span></li>
                        </ul>
                        <div className="ideal-title">Contact</div>
                        <ul className="ideal-list">
                            <li><span className="info-key">Email:</span><span>{user.email ? <a href={`mailto:${user.email}`}>{user.email}</a> : '—'}</span></li>
                            <li><span className="info-key">Phone:</span><span>{user.phone || '—'}</span></li>
                            <li><span className="info-key">LinkedIn:</span><span>{linkedinDisplay}</span></li>
                        </ul>
                    </div>
                </div>
            </div>

            {noteModalOpen && (
                <Modal
                    open={noteModalOpen}
                    onClose={() => setNoteModalOpen(false)}
                    title="Add New Note"
                >
                    <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
                        <div className="form-field">
                            <label className="form-label">Date</label>
                            <input
                                type="date"
                                className="form-input"
                                value={newNote.date}
                                onChange={(e) => setNewNote(p => ({ ...p, date: e.target.value }))}
                            />
                        </div>
                        <div className="form-field">
                            <label className="form-label">Type</label>
                            <select
                                className="form-input"
                                value={newNote.type}
                                onChange={(e) => setNewNote(p => ({ ...p, type: e.target.value }))}
                            >
                                <option value="Whatsapp">Whatsapp</option>
                                <option value="Phone call">Phone call</option>
                                <option value="Meeting">Meeting</option>
                                <option value="LinkedIn">LinkedIn</option>
                                <option value="Email">Email</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>
                        <div className="form-field">
                            <label className="form-label">Title</label>
                            <input
                                className="form-input"
                                placeholder="Note title"
                                value={newNote.title}
                                onChange={(e) => setNewNote(p => ({ ...p, title: e.target.value }))}
                            />
                        </div>
                        <div className="form-field">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-textarea"
                                rows={4}
                                placeholder="Enter note details..."
                                value={newNote.description}
                                onChange={(e) => setNewNote(p => ({ ...p, description: e.target.value }))}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <Button variant="ghost" onClick={() => setNoteModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" loading={isSavingNote} onClick={handleSaveNote}>Save Note</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
