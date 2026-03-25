import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchExpertById } from '../../api/experts';
import Loader from '../../components/ui/Loader';

export default function ExpertDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [expert, setExpert] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchExpertById(id).then((e) => {
            if (cancelled) return;
            setExpert(e || null);
            setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [id]);

    const fullName = useMemo(() => {
        const sal = expert?.salutation ? `${expert.salutation} ` : '';
        const name = `${expert?.first_name || ''} ${expert?.last_name || ''}`.trim();
        return `${sal}${name}`.trim() || 'Expert';
    }, [expert]);

    const linkedinDisplay = useMemo(() => {
        if (!expert?.linkedin_url) return '—';
        return <a href={expert.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>;
    }, [expert?.linkedin_url]);

    const profilePdfDisplay = useMemo(() => {
        if (!expert?.profile_pdf_url) return '—';
        return <a href={expert.profile_pdf_url} target="_blank" rel="noreferrer">Profile PDF / CV</a>;
    }, [expert?.profile_pdf_url]);

    const contactEmail = useMemo(() => {
        return expert?.primary_email ? <a href={`mailto:${expert.primary_email}`}>{expert.primary_email}</a> : '—';
    }, [expert?.primary_email]);

    const contactPhone = useMemo(() => {
        return expert?.primary_phone ? <a href={`tel:${expert.primary_phone}`}>{expert.primary_phone}</a> : '—';
    }, [expert?.primary_phone]);

    if (isLoading || !expert) return <Loader rows={8} />;

    const employmentHistoryLines = String(expert?.employment_history || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const strengthItems = Array.isArray(expert?.strengths_list) && expert.strengths_list.length
        ? expert.strengths_list
        : String(expert?.strength_topics || '').split(/\n|,/).map((s) => s.trim()).filter(Boolean);

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
  .tags { display: flex; gap: 8px; align-items: center; margin-top: 6px; }
  .badge { display: inline-block; border: 1px solid #d0d0d0; border-radius: 3px; padding: 2px 6px; font-size: 0.72rem; font-weight: 700; color: #333; background: #efefef; }
  .body-split { display: grid; grid-template-columns: 1fr 260px; border-bottom: 1px solid #d0d0d0; }
  .left-pane { padding: 12px 14px; border-right: 1px solid #d0d0d0; color: #111111}
  .sec-title { font-size: 0.97rem; font-weight: 700; color: #111111; margin-bottom: 6px; }
  .desc-text, .bullet-list li { font-size: 0.875rem; color: #333333; line-height: 1.65; margin-bottom: 6px; white-space: pre-wrap; }
  .bio-text { text-align: justify; text-justify: inter-word; }
  .divider { height: 1px; background: #e0e0e0; margin: 8px 0; }
  .info-row { display: grid; grid-template-columns: 150px 1fr; gap: 8px; padding: 4px 0; font-size: 0.875rem; color: #333333; }
  .info-key { font-weight: 700; color: #111111; }
  .right-pane { padding: 12px 12px; background: #fafafa; }
  .ideal-title { font-size: 0.97rem; font-weight: 700; color: #111111; margin-bottom: 8px; }
  .ideal-list { list-style: none; margin-bottom: 8px; display: flex; flex-direction: column; gap: 3px; }
  .ideal-list li { display: flex; align-items: flex-start; gap: 7px; font-size: 0.875rem; color: #333333; }
  .bullet-list { list-style: disc; padding-left: 18px; display: flex; flex-direction: column; gap: 3px; }
  @media (max-width: 700px) { .body-split { grid-template-columns: 1fr; } }
            `}</style>
            <div className="page">
                <div className="hdr">
                    <div className="hdr-top">
                        <div className="hdr-title">{fullName}</div>
                        <button className="btn-edit" onClick={() => navigate(`/experts/${expert.id}/edit`)}>Edit Expert</button>
                    </div>
                    <div className="hdr-subtitle">
                        {expert.title_headline || '—'}
                    </div>
                    <div className="tags">
                        {expert.expert_id ? <span className="badge">{expert.expert_id}</span> : null}
                        {expert.expert_status ? <span className="badge">{expert.expert_status}</span> : null}
                    </div>
                </div>
                <div className="body-split">
                    <div className="left-pane">
                        <div className="sec-title">Contact</div>
                        <div className="info-row"><div className="info-key">Email</div><div>{contactEmail}</div></div>
                        <div className="info-row"><div className="info-key">Phone</div><div>{contactPhone}</div></div>
                        <div className="info-row"><div className="info-key">Location</div><div>{expert.location || '—'}{expert.region ? ` (${expert.region})` : ''}</div></div>
                        <div className="info-row"><div className="info-key">Timezone</div><div>{expert.timezone || '—'}</div></div>
                        <div className="divider"></div>
                        <div className="sec-title">Professional Details</div>
                        <div className="info-row"><div className="info-key">Sector</div><div>{expert.primary_sector || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Company Role</div><div>{expert.company_role || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Function</div><div>{expert.expert_function || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Seniority</div><div>{expert.seniority || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Employment</div><div>{expert.current_employment_status || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Years of Experience</div><div>{expert.years_of_experience ?? '—'}</div></div>
                        <div className="divider"></div>
                        <div className="sec-title">Biography</div>
                        <div className="desc-text bio-text">{expert.bio || '—'}</div>
                        <div className="sec-title">Employment History</div>
                        {employmentHistoryLines.length ? (
                            <ul className="bullet-list">
                                {employmentHistoryLines.map((line, i) => <li key={i}>{line}</li>)}
                            </ul>
                        ) : (
                            <div className="desc-text">—</div>
                        )}
                        <div className="sec-title">Strength Topics</div>
                        {strengthItems.length ? (
                            <ul className="bullet-list">
                                {strengthItems.map((t, i) => <li key={i}>{t}</li>)}
                            </ul>
                        ) : (
                            <span>—</span>
                        )}
                        <div className="divider"></div>
                        <div className="sec-title">Payment Details</div>
                        <div className="desc-text">{expert.payment_details || '—'}</div>
                        <div className="sec-title">Events Invited To</div>
                        <div className="desc-text">{expert.events_invited_to || '—'}</div>
                        <div className="sec-title">Notes</div>
                        <div className="desc-text">{expert.notes || '—'}</div>
                    </div>
                    <div className="right-pane">
                        <div className="ideal-title">Key Info</div>
                        <ul className="ideal-list">
                            <li><span className="info-key">Expert ID:</span><span>{expert.expert_id || '—'}</span></li>
                            <li><span className="info-key">Status:</span><span>{expert.expert_status || '—'}</span></li>
                            <li><span className="info-key">LinkedIn:</span><span>{linkedinDisplay}</span></li>
                            <li><span className="info-key">Profile PDF:</span><span>{profilePdfDisplay}</span></li>
                            <li><span className="info-key">Research Analyst:</span><span>{expert.client_solution_owner_name || '—'}</span></li>
                            <li><span className="info-key">Calls Completed:</span><span>{expert.total_calls_completed ?? 0}</span></li>
                            <li><span className="info-key">Rate:</span><span>{expert.hourly_rate ? `${expert.hourly_rate} ${expert.currency || 'USD'}/hr` : '—'}</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
}
