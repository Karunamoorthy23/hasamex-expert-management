import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchProjectById, fetchProjectExpertStatus } from '../../api/projects';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';

function DetailItem({ label, value, full }) {
    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 8, gridColumn: full ? 'span 2' : undefined }}>
            <div style={{ minWidth: 180, fontWeight: 700, color: 'var(--text-strong)' }}>{label}</div>
            <div style={{ color: 'var(--text)' }}>{value ?? '—'}</div>
        </div>
    );
}

export default function ProjectDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [project, setProject] = useState(null);
    const [participants, setParticipants] = useState([]);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchProjectById(id).then((p) => {
            if (cancelled) return;
            setProject(p || null);
            setIsLoading(false);
        });
        (async () => {
            try {
                const status = await fetchProjectExpertStatus(id);
                if (cancelled) return;
                const leads = (status?.leads || []).map((e) => ({ ...e, category: 'Leads' }));
                const invited = (status?.invited || []).map((e) => ({ ...e, category: 'Invited' }));
                const accepted = (status?.accepted || []).map((e) => ({ ...e, category: 'Accepted' }));
                setParticipants([...leads, ...invited, ...accepted]);
            } catch (err) {
                if (!cancelled) setParticipants([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id]);

    const receivedDate = useMemo(
        () => (project?.received_date ? new Date(project.received_date).toLocaleDateString() : '—'),
        [project?.received_date]
    );
    const deadlineDate = useMemo(
        () => (project?.project_deadline ? new Date(project.project_deadline).toLocaleDateString() : '—'),
        [project?.project_deadline]
    );
    const lastModified = useMemo(
        () => (project?.last_modified_time ? new Date(project.last_modified_time).toLocaleString() : '—'),
        [project?.last_modified_time]
    );

    if (isLoading || !project) return <Loader rows={8} />;

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
  .btn-edit { display: inline-flex; align-items: center; gap: 6px; background: #8b1a1a; color: #ffffff; font-family: inherit; font-size: 0.78rem; font-weight: 600; padding: 7px 16px; border: none; border-radius: 3px; cursor: pointer; letter-spacing: 0.01em; white-space: nowrap; flex-shrink: 0; }
  .btn-edit:hover { background: #7a1515; }
  .hdr-subtitle { font-size: 0.82rem; color: #444444; margin-bottom: 14px; }
  .hdr-subtitle a { color: #444444; font-weight: 500; }
  .team-row { display: flex; gap: 20px; padding: 6px 0; border-top: 1px solid #e0e0e0; }
  .team-member { display: flex; align-items: center; gap: 10px; }
  .t-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; color: #ffffff; flex-shrink: 0; }
  .t-av-dark { background: #2c2c3e; } .t-av-wine { background: #7c1c3c; }
  .t-info { display: flex; flex-direction: column; gap: 1px; }
  .t-name { font-weight: 600; font-size: 0.88rem; color: #111111; } .t-role { font-size: 0.75rem; color: #666666; } .t-email { font-size: 0.73rem; color: #888888; }
  .body-split { display: grid; grid-template-columns: 1fr 260px; border-bottom: 1px solid #d0d0d0; }
  .left-pane { padding: 12px 14px; border-right: 1px solid #d0d0d0; }
  .sec-title { font-size: 0.97rem; font-weight: 700; color: #111111; margin-bottom: 6px; }
  .desc-text { font-size: 0.84rem; color: #333333; line-height: 1.65; margin-bottom: 6px; }
  .bullet-list { list-style: none; margin-bottom: 8px; display: flex; flex-direction: column; gap: 3px; }
  .bullet-list li { display: flex; align-items: flex-start; gap: 7px; font-size: 0.84rem; color: #333333; line-height: 1.5; }
  .bullet-list li::before { content: '•'; color: #555555; flex-shrink: 0; font-size: 1rem; }
  .disclaimer { font-size: 0.81rem; color: #555555; line-height: 1.65; margin-bottom: 8px; }
  .divider { height: 1px; background: #e0e0e0; margin: 8px 0; }
  .q-title { font-size: 0.97rem; font-weight: 700; color: #111111; margin-bottom: 6px; }
  .q-item { font-size: 0.84rem; color: #333333; line-height: 1.6; padding: 2px 0; }
  .right-pane { padding: 12px 12px; background: #fafafa; }
  .ideal-title { font-size: 0.97rem; font-weight: 700; color: #111111; margin-bottom: 8px; }
  .ideal-sub { font-size: 0.82rem; font-weight: 600; color: #111111; margin-bottom: 4px; text-decoration: underline; text-underline-offset: 2px; }
  .ideal-list { list-style: none; margin-bottom: 8px; display: flex; flex-direction: column; gap: 3px; }
  .ideal-list li { display: flex; align-items: flex-start; gap: 7px; font-size: 0.83rem; color: #333333; }
  .ideal-list li::before { content: '•'; color: #555555; flex-shrink: 0; font-size: 1rem; }
  .participants-wrap { background: #ffffff; }
  .p-bar { display: grid; grid-template-columns: 320px 160px 1fr; background: #ebebeb; border-bottom: 1px solid #c8c8c8; align-items: center; }
  .p-bar-col { padding: 8px 12px; font-size: 0.8rem; font-weight: 600; color: #333333; display: flex; align-items: center; gap: 6px; }
  .p-bar-col:not(:last-child) { border-right: 1px solid #c8c8c8; }
  .p-row { display: grid; grid-template-columns: 320px 160px 1fr; border-bottom: 1px solid #e4e4e4; align-items: stretch; }
  .p-row:last-child { border-bottom: none; }
  .p-cell { padding: 10px 12px; vertical-align: top; }
  .p-cell:not(:last-child) { border-right: 1px solid #e4e4e4; }
  .p-name-row { display: flex; align-items: center; gap: 7px; margin-bottom: 4px; }
  .p-name { font-size: 0.88rem; font-weight: 600; color: #111111; }
  .li-badge { display: inline-flex; align-items: center; justify-content: center; width: 17px; height: 17px; background: #0a66c2; border-radius: 3px; }
  .li-badge svg { width: 20px; height: 20px; fill: white; }
  .id-badge { display: inline-flex; align-items: center; justify-content: center; padding: 2px 6px; font-size: 0.72rem; font-weight: 700; color: #333; background: #efefef; border: 1px solid #d0d0d0; border-radius: 3px; }
  .p-bio { font-size: 0.80rem; color: #444444; line-height: 1.62; }
  .status-wrap { display: flex; align-items: flex-start; padding-top: 0; }
  .s-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 0.76rem; font-weight: 500; padding: 4px 10px 4px 8px; border: 1px solid #c0c0c0; border-radius: 3px; background: #f7f7f7; color: #333333; white-space: nowrap; }
  .s-chip .arrow { font-size: 0.65rem; color: #888; }
  .s-scheduled { background: #fffbf0; border-color: #e0c060; color: #7a5500; }
  .s-completed { background: #f0faf4; border-color: #70c090; color: #1a5c35; }
  .s-pending { background: #f0f5ff; border-color: #80a0e0; color: #1a3070; }
  .s-contacted { background: #f5f5f5; border-color: #b0b0b0; color: #444444; }
  .bi { display: flex; flex-direction: column; gap: 5px; }
  .bi { display: flex; flex-direction: column; gap: 3px; }
  .bi-row { font-size: 0.81rem; color: #333333; display: flex; align-items: center; gap: 0; }
  .bi-row.email { color: #1a5ca8; }
  .bi-fee { font-weight: 600; color: #111111; }
  @media (max-width: 700px) { .body-split { grid-template-columns: 1fr; } }
            `}</style>
            <div className="page">
                <div className="hdr">
                    <div className="hdr-top">
                        <div className="hdr-title">{project.project_title || project.title || 'Project'}</div>
                        <button className="btn-edit" onClick={() => navigate(`/projects/${project.project_id}/edit`)}>Edit Project</button>
                    </div>
                    <div className="hdr-subtitle">
                        Client: <strong>{project.client_id ? <a href={`/clients/${project.client_id}`}>{project.client_name || `#${project.client_id}`}</a> : (project.client_name || `#${project.client_id}`)}</strong> • PoC: <strong>{project.poc_user_id ? <a href={`/users/${project.poc_user_id}`}>{project.poc_user_name || '—'}</a> : (project.poc_user_name || '—')}</strong> • Status: <strong>{project.status || '—'}</strong>
                    </div>
                    <div className="team-row">
                        <div className="team-member">
                            <div className="t-avatar t-av-dark">{(project.client_solution_owner_names || [])[0]?.slice(0,2).toUpperCase() || 'RA'}</div>
                            <div className="t-info">
                                <div className="t-name">{(project.client_solution_owner_names || []).join(', ') || '—'}</div>
                                <div className="t-role">Research Analyst</div>
                            </div>
                        </div>
                        <div className="team-member">
                            <div className="t-avatar t-av-wine">{(project.sales_team_names || [])[0]?.slice(0,2).toUpperCase() || 'AM'}</div>
                            <div className="t-info">
                                <div className="t-name">{(project.sales_team_names || []).join(', ') || '—'}</div>
                                <div className="t-role">Account Manager</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="body-split">
                    <div className="left-pane">
                        <div className="sec-title">Project Description</div>
                        <div className="desc-text">{project.project_description || '—'}</div>
                        <div className="disclaimer">Region: {project.target_region || '—'}</div>
                        <div className="divider"></div>
                        <div className="q-title">Project Questions</div>
                        {[project.profile_question_1, project.profile_question_2, project.profile_question_3, project.compliance_question_1].filter(Boolean).map((q, i) => (
                            <div className="q-item" key={i}>{q}</div>
                        ))}
                    </div>
                    <div className="right-pane">
                        <div className="ideal-title">Key Info</div>
                        <ul className="ideal-list">
                            <li>
                                Client: {project.client_id ? <a href={`/clients/${project.client_id}`}>{project.client_name || `#${project.client_id}`}</a> : (project.client_name || `#${project.client_id}`)}
                            </li>
                            <li>Received Date: {receivedDate}</li>
                            <li>Deadline: {deadlineDate}</li>
                        </ul>
                        <div className="ideal-title">Ideal Candidate Profile</div>
                        <div className="ideal-sub">Target Companies:</div>
                        <ul className="ideal-list">
                            {(project.target_companies || '').split('\n').join(',').split(',').filter(x => x.trim()).map((c, i) => <li key={i}>{c.trim()}</li>)}
                        </ul>
                        <div className="ideal-sub">Target Titles:</div>
                        <ul className="ideal-list">
                            {(project.target_functions_titles || '').split('\n').join(',').split(',').filter(x => x.trim()).map((t, i) => <li key={i}>{t.trim()}</li>)}
                        </ul>
                    </div>
                </div>
                <div className="participants-wrap">
                    <div className="p-bar">
                        <div className="p-bar-col">Participants</div>
                        <div className="p-bar-col">Status</div>
                        <div className="p-bar-col">Basic Info</div>
                    </div>
                    {(participants || []).map((row, idx) => {
                        const name = row.name || 'Expert';
                        const email = row.email || '—';
                        const phone = row.phone || '—';
                        const title = row.title || '—';
                        const linkedin = row.linkedin_url || null;
                        const statusLabel = row.category || '—';
                        let statusClass = 's-pending';
                        if (statusLabel === 'Leads') statusClass = 's-pending';
                        else if (statusLabel === 'Invited') statusClass = 's-contacted';
                        else if (statusLabel === 'Accepted') statusClass = 's-completed';
                        return (
                            <div className="p-row" key={`${row.id || row.expert_id || idx}-${idx}`}>
                                <div className="p-cell">
                                    <div className="p-name-row">
                                        <div className="p-name">{name}</div>
                                        {row.expert_code ? <span className="id-badge" title="Expert Number">{row.expert_code}</span> : null}
                                        {linkedin ? (
                                            <a className="li-badge" href={linkedin} target="_blank" rel="noreferrer" title="LinkedIn">
                                                <svg viewBox="0 0 72 72"><path d="M16.5,29.5h7.1V56H16.5V29.5z M20.1,16.5c2.3,0,3.9,1.6,3.9,3.6c0,2-1.6,3.6-3.9,3.6h0c-2.3,0-3.9-1.6-3.9-3.6 C16.2,18.1,17.8,16.5,20.1,16.5z M29.5,29.5h6.8v3.6h0.1c0.9-1.7,3.2-3.5,6.6-3.5c7,0,8.3,4.6,8.3,10.6V56h-7.1V42.6 c0-3.2-0.1-7.3-4.5-7.3c-4.5,0-5.2,3.5-5.2,7.1V56h-7.1V29.5z" fill="white"></path></svg>
                                            </a>
                                        ) : null}
                                    </div>
                                    <div className="p-bio">{title}</div>
                                </div>
                                <div className="p-cell">
                                    <div className="status-wrap">
                                        <span className={`s-chip ${statusClass}`}><span className="arrow">▶</span>{statusLabel}</span>
                                    </div>
                                </div>
                                <div className="p-cell">
                                    <div className="bi">
                                        <div className="bi-row email">{email}</div>
                                        <div className="bi-row">{phone}</div>
                                        <div className="bi-row">Fee: <span className="bi-fee">—</span></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
