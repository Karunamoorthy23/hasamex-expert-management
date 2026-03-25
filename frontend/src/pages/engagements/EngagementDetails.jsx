import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { http } from '../../api/http';
import Loader from '../../components/ui/Loader';

export default function EngagementDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [eng, setEng] = useState(null);
    const [projUsers, setProjUsers] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        http(`/engagements/${id}`).then((res) => {
            if (cancelled) return;
            setEng(res?.data || null);
            setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [id]);

    useEffect(() => {
        let cancelled = false;
        const pid = eng?.project_id || null;
        if (!pid) {
            setProjUsers(null);
            return;
        }
        http(`/projects/${pid}`).then((res) => {
            if (cancelled) return;
            const p = res?.data || null;
            if (!p) {
                setProjUsers(null);
                return;
            }
            setProjUsers({
                poc_user_id: p.poc_user_id || null,
                poc_user_name: p.poc_user_name || null,
                ra_names: Array.isArray(p.client_solution_owner_names) ? p.client_solution_owner_names : [],
                am_names: Array.isArray(p.sales_team_names) ? p.sales_team_names : [],
            });
        });
        return () => {
            cancelled = true;
        };
    }, [eng?.project_id]);

    const callDate = useMemo(() => {
        if (!eng?.call_date) return '—';
        try {
            return new Date(eng.call_date).toLocaleString();
        } catch {
            return eng.call_date;
        }
    }, [eng?.call_date]);

    const clientInvoiceDate = useMemo(() => {
        if (!eng?.client_invoice_date) return '—';
        try {
            return new Date(eng.client_invoice_date).toLocaleDateString();
        } catch {
            return eng.client_invoice_date;
        }
    }, [eng?.client_invoice_date]);

    const clientPaymentReceivedDate = useMemo(() => {
        if (!eng?.client_payment_received_date) return '—';
        try {
            return new Date(eng.client_payment_received_date).toLocaleDateString();
        } catch {
            return eng.client_payment_received_date;
        }
    }, [eng?.client_payment_received_date]);

    const expertPaymentDueDate = useMemo(() => {
        if (!eng?.expert_payment_due_date) return '—';
        try {
            return new Date(eng.expert_payment_due_date).toLocaleDateString();
        } catch {
            return eng.expert_payment_due_date;
        }
    }, [eng?.expert_payment_due_date]);

    const actualExpertPaymentDate = useMemo(() => {
        if (!eng?.actual_expert_payment_date) return '—';
        try {
            return new Date(eng.actual_expert_payment_date).toLocaleDateString();
        } catch {
            return eng.actual_expert_payment_date;
        }
    }, [eng?.actual_expert_payment_date]);

    if (isLoading || !eng) return <Loader rows={8} />;

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
  .hdr-subtitle { font-size: 0.82rem; color: #444444; margin-bottom: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
  .hdr-subtitle-item { display: flex; align-items: center; gap: 4px; }
  .team-row { display: flex; flex-wrap: wrap; gap: 14px; padding: 10px 0; margin-bottom: 8px; }
  .team-member { display: flex; align-items: center; gap: 12px; }
  .t-avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; color: #ffffff; flex-shrink: 0; }
  .t-av-dark { background: #2c2c3e; } .t-av-wine { background: #7c1c3c; }
  .t-info { display: flex; flex-direction: column; gap: 1px; }
  .t-name { font-weight: 600; font-size: 0.88rem; color: #111111; }
  .t-name a { color: #111111; }
  .t-role { font-size: 0.75rem; color: #666666; font-weight: 500; }
  .body-split { display: grid; grid-template-columns: 1fr 22rem; border-bottom: 1px solid #d0d0d0; }
  .left-pane { padding: 0.75rem 1.25rem; border-right: 1px solid #d0d0d0; }
  .sec-title { font-size: 0.97rem; font-weight: 700; color: #111111; margin-bottom: 0.625rem; }
  .desc-text { font-size: 0.84rem; color: #333333; line-height: 1.65; margin-bottom: 0.375rem; white-space: pre-wrap; }
  .divider { height: 1px; background: #e0e0e0; margin: 0.75rem 0; }
  .info-row { display: grid; grid-template-columns: 11.25rem 1fr; gap: 1.25rem; padding: 0.375rem 0; font-size: 0.84rem; color: #333333; }
  .info-key { font-weight: 700; color: #111111; }
  .right-pane { padding: 0.75rem 1rem; background: #fafafa; }
  .ideal-title { font-size: 0.97rem; font-weight: 700; color: #111111; margin-bottom: 0.75rem; }
  .ideal-list { list-style: none; margin-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.375rem; }
  .ideal-list li { display: flex; align-items: flex-start; gap: 0.625rem; font-size: 0.83rem; color: #333333; }
  .ideal-list .info-key { min-width: 6.25rem; }
  .bullet-list { list-style: disc; padding-left: 1.125rem; display: flex; flex-direction: column; gap: 0.375rem; }
  @media (max-width: 700px) { .body-split { grid-template-columns: 1fr; } }
            `}</style>
            <div className="page">
                <div className="hdr">
                    <div className="hdr-top">
                        <div className="hdr-title">Engagement</div>
                        <button className="btn-edit" onClick={() => navigate(`/engagements/${eng.id}/edit`)}>Edit Engagement</button>
                    </div>
                    <div className="hdr-subtitle">
                        <div className="hdr-subtitle-item">ID: <strong>{eng.engagement_id || '—'}</strong></div>
                        <span style={{ color: '#ccc' }}>•</span>
                        <div className="hdr-subtitle-item">Project: <strong>{eng.project_id ? <Link to={`/projects/${eng.project_id}`}>{eng.project_name || `#${eng.project_id}`}</Link> : (eng.project_name || `#${eng.project_id}`)}</strong></div>
                        <span style={{ color: '#ccc' }}>•</span>
                        <div className="hdr-subtitle-item">Expert: <strong>{eng.expert_id ? <Link to={`/experts/${eng.expert_id}`}>{eng.expert_name || '—'}</Link> : (eng.expert_name || '—')}</strong></div>
                        <span style={{ color: '#ccc' }}>•</span>
                        <div className="hdr-subtitle-item">Client: <strong>{eng.client_id ? <Link to={`/clients/${eng.client_id}`}>{eng.client_name || `#${eng.client_id}`}</Link> : (eng.client_name || `#${eng.client_id}`)}</strong></div>
                    </div>
                </div>
                <div className="body-split">
                    <div className="left-pane">
                        <div className="sec-title">Project Team</div>
                        {projUsers ? (
                            <div className="team-row">
                                <div className="team-member">
                                    <div className="t-avatar t-av-dark">{(projUsers.poc_user_name || 'P').slice(0, 2).toUpperCase()}</div>
                                    <div className="t-info">
                                        <div className="t-name">
                                            {projUsers.poc_user_id ? <Link to={`/users/${projUsers.poc_user_id}`}>{projUsers.poc_user_name || '—'}</Link> : (projUsers.poc_user_name || '—')}
                                        </div>
                                        <div className="t-role">PoC</div>
                                    </div>
                                </div>
                                <div className="team-member">
                                    <div className="t-avatar t-av-wine">{(projUsers.ra_names[0] || 'RA').slice(0, 2).toUpperCase()}</div>
                                    <div className="t-info">
                                        <div className="t-name">{projUsers.ra_names.length ? projUsers.ra_names.join(', ') : '—'}</div>
                                        <div className="t-role">Research Analyst</div>
                                    </div>
                                </div>
                                <div className="team-member">
                                    <div className="t-avatar t-av-dark">{(projUsers.am_names[0] || 'AM').slice(0, 2).toUpperCase()}</div>
                                    <div className="t-info">
                                        <div className="t-name">{projUsers.am_names.length ? projUsers.am_names.join(', ') : '—'}</div>
                                        <div className="t-role">Account Manager</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="desc-text">—</div>
                        )}
                        <div className="divider"></div>
                        <div className="sec-title">Call Info</div>
                        <div className="info-row"><div className="info-key">Call Date</div><div>{callDate}</div></div>
                        <div className="info-row"><div className="info-key">Duration</div><div>{eng.actual_call_duration_mins ?? '—'} mins</div></div>
                        <div className="info-row"><div className="info-key">Method</div><div>{eng.engagement_method || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Transcript Folder</div><div>{eng.transcript_link_folder ? <a href={eng.transcript_link_folder} target="_blank" rel="noreferrer">{eng.transcript_link_folder}</a> : '—'}</div></div>
                        <div className="divider"></div>
                        <div className="sec-title">Financials</div>
                        <div className="info-row"><div className="info-key">Client Rate</div><div>{eng.client_rate != null ? `${eng.client_rate} ${eng.client_currency || ''}`.trim() : '—'}</div></div>
                        <div className="info-row"><div className="info-key">Discount</div><div>{eng.discount_offered_percent != null ? `${eng.discount_offered_percent}%` : '—'}</div></div>
                        <div className="info-row"><div className="info-key">Billable Amount</div><div>{eng.billable_client_amount_usd != null ? `$${eng.billable_client_amount_usd}` : '—'}</div></div>
                        <div className="info-row"><div className="info-key">Expert Rate</div><div>{eng.expert_rate != null ? `${eng.expert_rate} ${eng.expert_currency || ''}`.trim() : '—'}</div></div>
                        <div className="info-row"><div className="info-key">Prorated Base</div><div>{eng.prorated_expert_amount_base != null ? `$${eng.prorated_expert_amount_base}` : '—'}</div></div>
                        <div className="info-row"><div className="info-key">Prorated USD</div><div>{eng.prorated_expert_amount_usd != null ? `$${eng.prorated_expert_amount_usd}` : '—'}</div></div>
                        <div className="info-row"><div className="info-key">Gross Margin</div><div>{eng.gross_margin_percent != null ? `${eng.gross_margin_percent}%` : '—'}</div></div>
                        <div className="info-row"><div className="info-key">Gross Profit</div><div>{eng.gross_profit_usd != null ? `$${eng.gross_profit_usd}` : '—'}</div></div>
                        <div className="divider"></div>
                        <div className="sec-title">Payment & Invoicing</div>
                        <div className="info-row"><div className="info-key">Expert Post-Call Status</div><div>{eng.expert_post_call_status || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Expert Payment Status</div><div>{eng.expert_payment_status || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Payment Due</div><div>{expertPaymentDueDate}</div></div>
                        <div className="info-row"><div className="info-key">Payment Date</div><div>{actualExpertPaymentDate}</div></div>
                        <div className="info-row"><div className="info-key">Paid From</div><div>{eng.expert_paid_from || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Payout Ref ID</div><div>{eng.expert_payout_ref_id || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Invoice No.</div><div>{eng.client_invoice_number || '—'}</div></div>
                        <div className="info-row"><div className="info-key">Invoice Date</div><div>{clientInvoiceDate}</div></div>
                        <div className="info-row"><div className="info-key">Payment Received</div><div>{clientPaymentReceivedDate}</div></div>
                        <div className="info-row"><div className="info-key">Received Account</div><div>{eng.client_payment_received_account || '—'}</div></div>
                        <div className="divider"></div>
                        <div className="sec-title">Notes</div>
                        <div className="desc-text">{eng.notes || '—'}</div>
                    </div>
                    <div className="right-pane">
                        <div className="ideal-title">Key Info</div>
                        <ul className="ideal-list">
                            <li><span className="info-key">Project:</span><span>{eng.project_id ? <a href={`/projects/${eng.project_id}`}>{eng.project_name || `#${eng.project_id}`}</a> : (eng.project_name || `#${eng.project_id}`)}</span></li>
                            <li><span className="info-key">Expert:</span><span>{eng.expert_id ? <a href={`/experts/${eng.expert_id}`}>{eng.expert_name || '—'}</a> : (eng.expert_name || '—')}</span></li>
                            <li><span className="info-key">Client:</span><span>{eng.client_id ? <a href={`/clients/${eng.client_id}`}>{eng.client_name || `#${eng.client_id}`}</a> : (eng.client_name || `#${eng.client_id}`)}</span></li>
                            <li><span className="info-key">PoC:</span><span>{eng.poc_user_id ? <a href={`/users/${eng.poc_user_id}`}>{eng.poc_user_name || '—'}</a> : (eng.poc_user_name || '—')}</span></li>
                            <li><span className="info-key">Call Owner:</span><span>{eng.call_owner_name || '—'}</span></li>
                            <li><span className="info-key">Client Currency:</span><span>{eng.client_currency || '—'}</span></li>
                            <li><span className="info-key">Expert Currency:</span><span>{eng.expert_currency || '—'}</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
}
