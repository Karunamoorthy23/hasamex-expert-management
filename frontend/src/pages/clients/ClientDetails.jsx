import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { fetchClientById, fetchProjects } from '../../api/clients';
import Loader from '../../components/ui/Loader';

export default function ClientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [client, setClient] = useState(null);
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchClientById(id).then((c) => {
            if (cancelled) return;
            setClient(c || null);
            setIsLoading(false);
        });
        fetchProjects({ clientId: id }).then((rows) => {
            if (cancelled) return;
            setProjects(rows || []);
        });
        return () => {
            cancelled = true;
        };
    }, [id]);

    const websiteDisplay = useMemo(() => {
        if (!client?.website) return null;
        const url = client.website.startsWith('http') ? client.website : `https://${client.website}`;
        return (
            <a href={url} target="_blank" rel="noreferrer">
                {client.website}
            </a>
        );
    }, [client?.website]);

    const linkedinDisplay = useMemo(() => {
        if (!client?.linkedin_url) return null;
        return (
            <a href={client.linkedin_url} target="_blank" rel="noreferrer">
                LinkedIn
            </a>
        );
    }, [client?.linkedin_url]);

    const usersProjectsMap = useMemo(() => {
        const map = {};
        for (const p of projects || []) {
            const uname = p.poc_user_name || null;
            if (!uname) continue;
            if (!map[uname]) map[uname] = [];
            map[uname].push({
                id: p.project_id,
                title: p.project_title || p.title || `Project #${p.project_id}`,
            });
        }
        return map;
    }, [projects]);

    const usersWithAssignments = useMemo(() => {
        const raw = String(client?.users || '');
        const names = raw.split(',').map((s) => s.trim()).filter(Boolean);
        if (!names.length) return client?.users || '—';
        return (
            <div style={{ display: 'grid', gap: '6px' }}>
                {names.map((name) => {
                    const projs = usersProjectsMap[name] || [];
                    return (
                        <div key={name}>
                            <span style={{ fontWeight: 600 }}>{name}</span>
                            {projs.length ? (
                                <span> — {projs.map((p, idx) => (
                                    <span key={p.id}>
                                        <Link to={`/projects/${p.id}`}>{p.title}</Link>{idx < projs.length - 1 ? ', ' : ''}
                                    </span>
                                ))}</span>
                            ) : (
                                <span> — No assigned project</span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }, [client?.users, usersProjectsMap]);

    if (isLoading || !client) return <Loader rows={8} />;

    const clientType = client.client_type || client.type;
    const country = client.country || client.location;
    const raNames = Array.isArray(client.client_solution_owner_names) ? client.client_solution_owner_names : [];
    const amNames = Array.isArray(client.sales_team_names) ? client.sales_team_names : [];

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
  .bullet-list { list-style: none; margin-bottom: 8px; display: flex; flex-direction: column; gap: 3px; }
  .bullet-list li { display: flex; align-items: flex-start; gap: 7px; font-size: 0.84rem; color: #333333; line-height: 1.5; }
  .bullet-list li::before { content: '•'; color: #555555; flex-shrink: 0; font-size: 1rem; }
  .divider { height: 1px; background: #e0e0e0; margin: 8px 0; }
  .info-row { display: grid; grid-template-columns: 150px 1fr; gap: 8px; padding: 4px 0; font-size: 0.84rem; color: #333333; }
  .info-key { font-weight: 700; color: #111111; }
  .right-pane { padding: 12px 12px; background: #fafafa; }
  .ideal-title { font-size: 0.97rem; font-weight: 700; color: #111111; margin-bottom: 8px; }
  .ideal-list { list-style: none; margin-bottom: 8px; display: flex; flex-direction: column; gap: 3px; }
  .ideal-list li { display: flex; align-items: flex-start; gap: 7px; font-size: 0.83rem; color: #333333; }
  @media (max-width: 700px) { .body-split { grid-template-columns: 1fr; } }
            `}</style>
            <div className="page">
                <div className="hdr">
                    <div className="hdr-top">
                        <div className="hdr-title">{client.client_name}</div>
                        <button className="btn-edit" onClick={() => navigate(`/clients/${client.client_id}/edit`)}>Edit Client</button>
                    </div>
                    <div className="hdr-subtitle">
                        Type: <strong>{clientType || '—'}</strong> • Country: <strong>{country || '—'}</strong> • Website: <strong>{websiteDisplay || '—'}</strong> • LinkedIn: <strong>{linkedinDisplay || '—'}</strong>
                    </div>
                    <div className="team-row">
                        <div className="team-member">
                            <div className="t-avatar t-av-dark">{(raNames[0] || 'RA').slice(0,2).toUpperCase()}</div>
                            <div className="t-info">
                                <div className="t-name">{raNames.join(', ') || '—'}</div>
                                <div className="t-role">Research Analyst</div>
                            </div>
                        </div>
                        <div className="team-member">
                            <div className="t-avatar t-av-wine">{(amNames[0] || 'AM').slice(0,2).toUpperCase()}</div>
                            <div className="t-info">
                                <div className="t-name">{amNames.join(', ') || '—'}</div>
                                <div className="t-role">Account Manager</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="body-split">
                    <div className="left-pane">
                        <div className="sec-title">Client Overview</div>
                        <div className="desc-text">{client.business_activity_summary || '—'}</div>
                        <div className="divider"></div>
                        <div className="sec-title">Commercial</div>
                        <div className="info-row"><div className="info-key">Billing Currency</div><div>{client.billing_currency || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Payment Terms</div><div>{client.payment_terms || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Invoicing Email</div><div>{client.invoicing_email || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Client Status</div><div>{client.client_status || client.status || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Engagement Start</div><div>{client.engagement_start_date ? new Date(client.engagement_start_date).toLocaleDateString() : '—'}</div></div>
                        <div className="info-row"><div className="info-key">Signed MSA</div><div>{client.signed_msa === true ? 'Yes' : client.signed_msa === false ? 'No' : '—'}</div></div>
                        <div className="info-row"><div className="info-key">Commercial Model</div><div>{client.commercial_model || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Agreed Pricing</div><div>{client.agreed_pricing || '—'}</div></div>
                        <div className="divider"></div>
                        <div className="sec-title">Notes</div>
                        <div className="desc-text">{client.notes || '—'}</div>
                        <div className="sec-title">MSA</div>
                        <div className="desc-text">{client.msa || '—'}</div>
                    </div>
                    <div className="right-pane">
                        <div className="ideal-title">Key Info</div>
                        <ul className="ideal-list">
                            <li><span className="info-key">Primary Contact:</span><span>{client.primary_contact_user_id ? <a href={`/users/${client.primary_contact_user_id}`}>{client.primary_contact_user_id}</a> : '—'}</span></li>
                            <li><span className="info-key">Client Manager:</span><span>{client.client_manager_internal || '—'}</span></li>
                            <li><span className="info-key">Office Locations:</span><span>{client.office_locations || '—'}</span></li>
                        </ul>
                        <div className="ideal-title">Users & Assigned Projects</div>
                        <div>{usersWithAssignments}</div>
                    </div>
                </div>
            </div>
        </>
    );
}
