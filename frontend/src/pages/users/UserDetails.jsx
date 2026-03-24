import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { fetchUserById } from '../../api/users';
import { fetchProjectsPaged } from '../../api/projects';
import Loader from '../../components/ui/Loader';

export default function UserDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [assignedProjects, setAssignedProjects] = useState([]);

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
        const uname = user?.user_name || null;
        if (!uname) {
            setAssignedProjects([]);
            return;
        }
        fetchProjectsPaged({ search: uname, limit: 100 }).then((res) => {
            if (cancelled) return;
            setAssignedProjects(res?.data || []);
        });
        return () => {
            cancelled = true;
        };
    }, [user?.user_name]);

    const nameDisplay = useMemo(() => {
        if (!user) return 'User';
        return user.full_name || user.user_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
    }, [user]);

    const assignedProjectsDisplay = useMemo(() => {
        const rows = Array.isArray(assignedProjects) ? assignedProjects : [];
        if (!rows.length) return '—';
        return (
            <ul className="proj-list">
                {rows.map((p) => (
                    <li key={p.project_id}>
                        <Link to={`/projects/${p.project_id}`}>{p.project_title || p.title || `Project #${p.project_id}`}</Link>
                    </li>
                ))}
            </ul>
        );
    }, [assignedProjects]);

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
                        <div className="sec-title">Assigned Projects</div>
                        <div>{assignedProjectsDisplay}</div>
                        <div className="divider"></div>
                        <div className="sec-title">Notes</div>
                        <div className="desc-text">{user.notes || '—'}</div>
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
        </>
    );
}
