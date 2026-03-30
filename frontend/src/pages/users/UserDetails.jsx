import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { fetchUserById, updateUser } from '../../api/users';
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
    const [newNote, setNewNote] = useState({ date: new Date().toISOString().split('T')[0], title: '', description: '' });

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
            setNewNote({ date: new Date().toISOString().split('T')[0], title: '', description: '' });
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
                        Client: <strong>{user.client_id ? <a href={`/clients/${user.client_id}`}>{user.client_name || `#${user.client_id}`}</a> : (user.client_name || '—')}</strong> • Code: <strong>{user.user_code || '—'}</strong> • Title: <strong>{user.designation_title || '—'}</strong> • Status: <strong>{user.status || '—'}</strong> • LinkedIn: <strong>{linkedinDisplay}</strong>
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
                                            <span style={{ fontSize: '0.75rem', color: '#666' }}>{note.date || 'No date'}</span>
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
                            <li><span className="info-key">Email:</span><span>{user.email || '—'}</span></li>
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
