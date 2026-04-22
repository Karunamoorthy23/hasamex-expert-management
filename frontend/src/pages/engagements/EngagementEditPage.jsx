import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import { http } from '../../api/http';
import FilterDropdown from '../../components/experts/FilterDropdown';
import TimezoneSelect from '../../components/ui/TimezoneSelect';

export default function EngagementEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [lookups, setLookups] = useState({});
    const [form, setForm] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [projectExperts, setProjectExperts] = useState(null);
    const [currentPhase, setCurrentPhase] = useState(1);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const [lookupsData, engagementData] = await Promise.all([
                    http('/engagements/form-lookups'),
                    id ? http(`/engagements/${id}`) : Promise.resolve(null),
                ]);
                setLookups(lookupsData || {});
                if (engagementData) {
                    const clean = { ...engagementData.data };
                    setForm(clean);
                } else {
                    setForm({
                        project_id: '',
                        expert_id: '',
                        client_id: '',
                        poc_user_id: '',
                        call_owner_id: '',
                        call_date: '',
                        actual_call_duration_mins: '',
                        engagement_method_id: '',
                        notes: '',
                        transcript_link_folder: '',
                        client_rate: '',
                        client_currency_id: '',
                        discount_offered_percent: '',
                        billable_client_amount_usd: '',
                        expert_rate: '',
                        expert_currency_id: '',
                        prorated_expert_amount_base: '',
                        prorated_expert_amount_usd: '',
                        expert_post_call_status_id: '',
                        expert_payment_due_date: '',
                        actual_expert_payment_date: '',
                        expert_payment_status_id: '',
                        expert_paid_from: '',
                        expert_payout_ref_id: '',
                        expert_timezone: '',
                        client_timezone: '',
                        client_invoice_number: '',
                        client_invoice_date: '',
                        client_payment_received_date: '',
                        client_payment_received_account: '',
                        call_completed_duration_mins: '',
                        completed_client_rate: '',
                        completed_expert_rate: '',
                        completed_prorated_expert_amount_base: '',
                        completed_prorated_expert_amount_usd: '',
                        completed_billable_client_amount_usd: '',
                    });
                }
            } catch (error) {
                console.error('Failed to fetch data', error);
                setLookups({});
                if (!id) {
                    setForm({
                        project_id: '',
                        expert_id: '',
                        client_id: '',
                        poc_user_id: '',
                        call_owner_id: '',
                        call_date: '',
                        actual_call_duration_mins: '',
                        engagement_method_id: '',
                        notes: '',
                        transcript_link_folder: '',
                        client_rate: '',
                        client_currency_id: '',
                        discount_offered_percent: '',
                        billable_client_amount_usd: '',
                        expert_rate: '',
                        expert_currency_id: '',
                        prorated_expert_amount_base: '',
                        prorated_expert_amount_usd: '',
                        expert_post_call_status_id: '',
                        expert_payment_due_date: '',
                        actual_expert_payment_date: '',
                        expert_payment_status_id: '',
                        expert_paid_from: '',
                        expert_payout_ref_id: '',
                        expert_timezone: '',
                        client_timezone: '',
                        client_invoice_number: '',
                        client_invoice_date: '',
                        client_payment_received_date: '',
                        client_payment_received_account: '',
                        call_completed_duration_mins: '',
                        completed_client_rate: '',
                        completed_expert_rate: '',
                        completed_prorated_expert_amount_base: '',
                        completed_prorated_expert_amount_usd: '',
                        completed_billable_client_amount_usd: '',
                    });
                }
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [id]);

    useEffect(() => {
        let cancelled = false;
        const pid = form?.project_id || '';
        if (!pid) {
            setProjectExperts(null);
            return;
        }
        (async () => {
            try {
                const [statusRes, projectRes] = await Promise.all([
                    http(`/projects/${pid}/expert-status`),
                    http(`/projects/${pid}`),
                ]);
                if (cancelled) return;
                const status = statusRes?.data || {};
                setProjectExperts(status);
                const scheduledId = (status.scheduled && status.scheduled[0]?.id) || null;
                const completedId = (status.completed && status.completed[0]?.id) || null;
                const autoId = scheduledId || completedId || '';
                const proj = projectRes?.data || {};
                setForm(prev => {
                    if (!prev) return prev;
                    const next = { ...prev };
                    // If project changed, reset selection or auto-select first logical expert
                    if (prev.project_id !== pid) {
                        next.expert_id = autoId;
                    } else if (!prev.expert_id) {
                        next.expert_id = autoId;
                    }
                    if (proj.client_id) next.client_id = proj.client_id;
                    if (proj.poc_user_id) next.poc_user_id = proj.poc_user_id;
                    return next;
                });
            } catch {
                if (!cancelled) setProjectExperts(null);
            }
        })();
        return () => { cancelled = true; };
    }, [form?.project_id]);
    
    async function handleScheduleMeeting(targetId = id, silent = false) {
        const activeId = targetId || id;
        if (!activeId) {
            alert('Please save the engagement first before scheduling a meeting.');
            return;
        }
        if (!silent && !window.confirm('This will create/update a Zoom meeting and send Zoho Calendar invites. Continue?')) {
            return;
        }
        setIsScheduling(true);
        try {
            const res = await http(`/engagements/${activeId}/schedule`, { method: 'POST' });
            if (res && res.engagement) {
                setForm(res.engagement);
                if (!silent) alert('Meeting scheduled successfully!');
            }
            if (!silent && res && res.zoho_errors && res.zoho_errors.length > 0) {
                alert('Note: ' + res.zoho_errors.join(', '));
            }
            return res;
        } catch (error) {
            console.error('Failed to schedule meeting', error);
            if (!silent) alert('Failed to schedule meeting: ' + (error.response?.data?.error || error.message));
            throw error;
        } finally {
            setIsScheduling(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form) return;
        setIsSaving(true);
        try {
            const url = id ? `/engagements/${id}` : '/engagements';
            const method = id ? 'PUT' : 'POST';
            const { gross_margin_percent, gross_profit_usd, ...payload } = form;

            // Simple client-side check for required fields as per backend rules
            const required = ['project_id', 'expert_id', 'client_id', 'call_date'];
            for (const r of required) {
                if (!payload[r]) {
                    alert(`Required field missing: ${r.replace('_id', '').replace('_', ' ')}`);
                    setIsSaving(false);
                    return;
                }
            }

            const res = await http(url, {
                method,
                body: JSON.stringify(payload),
            });
            
            // If it's a new engagement, automatically trigger scheduling if call_date exists
            if (!id && res?.id && payload.call_date) {
                try {
                    await handleScheduleMeeting(res.id, true);
                } catch (e) {
                    console.error('Auto-scheduling failed after creation', e);
                }
            }

            navigate('/engagements');
        } catch (error) {
            console.error('Failed to save engagement', error);
            const msg = error.data?.error || error.message || 'Unknown error occurred';
            alert(`Failed to save: ${msg}`);
        } finally {
            setIsSaving(false);
        }
    }

    const handleFormChange = (field, value) => {
        setForm(prev => {
            const next = { ...prev, [field]: value };

            if (field === 'client_rate' || field === 'discount_offered_percent') {
                const cRate = parseFloat(field === 'client_rate' ? value : prev.client_rate) || 0;
                const disc = parseFloat(field === 'discount_offered_percent' ? value : prev.discount_offered_percent) || 0;
                if (cRate > 0) {
                    next.billable_client_amount_usd = (cRate - (cRate * disc / 100)).toFixed(2);
                }
            }
            
            if (field === 'call_completed_duration_mins') {
                const completedVal = parseFloat(value);
                const preVal = parseFloat(prev.actual_call_duration_mins);
                
                if (!isNaN(completedVal) && !isNaN(preVal) && preVal > 0) {
                    const ratio = completedVal / preVal;
                    if (prev.client_rate) {
                        const newClientRate = parseFloat(prev.client_rate) * ratio;
                        next.completed_client_rate = newClientRate.toFixed(2);
                        const discount = parseFloat(prev.discount_offered_percent) || 0;
                        next.completed_billable_client_amount_usd = (newClientRate - (newClientRate * discount / 100)).toFixed(2);
                    } else if (prev.billable_client_amount_usd) {
                        next.completed_billable_client_amount_usd = (parseFloat(prev.billable_client_amount_usd) * ratio).toFixed(2);
                    }

                    if (prev.expert_rate) next.completed_expert_rate = (parseFloat(prev.expert_rate) * ratio).toFixed(2);
                    if (prev.prorated_expert_amount_base) next.completed_prorated_expert_amount_base = (parseFloat(prev.prorated_expert_amount_base) * ratio).toFixed(2);
                    if (prev.prorated_expert_amount_usd) next.completed_prorated_expert_amount_usd = (parseFloat(prev.prorated_expert_amount_usd) * ratio).toFixed(2);
                }
            }
            return next;
        });
    };

    const findNameById = (list, id) => {
        if (!Array.isArray(list)) return '';
        const item = list.find((x) => String(x.id) === String(id));
        return item ? item.name : '';
    };
    const findIdByName = (list, name) => {
        if (!Array.isArray(list)) return '';
        const item = list.find((x) => x.name === name);
        return item ? item.id : '';
    };
    const dtValue = (iso) => {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            const pad = (n) => String(n).padStart(2, '0');
            const y = d.getFullYear();
            const m = pad(d.getMonth() + 1);
            const day = pad(d.getDate());
            const hh = pad(d.getHours());
            const mm = pad(d.getMinutes());
            return `${y}-${m}-${day}T${hh}:${mm}`;
        } catch {
            return iso;
        }
    };

    const selectableExperts = useMemo(() => {
        const a = (projectExperts?.accepted || []);
        const s = (projectExperts?.scheduled || []);
        const c = (projectExperts?.completed || []);
        const seen = new Set();
        const list = [];
        // Priority: Scheduled > Completed > Accepted
        [...s, ...c, ...a].forEach(x => {
            if (!seen.has(x.id)) {
                seen.add(x.id);
                list.push(x);
            }
        });
        return list;
    }, [projectExperts]);

    const EXCHANGE_RATES_USD = {
        'USD': 1.0,
        'EUR': 1.09,
        'GBP': 1.27,
        'INR': 0.012,
        'SGD': 0.74,
        'AED': 0.27,
    };

    const normalizeAmount = (amount, currencyName) => {
        if (!amount || isNaN(amount)) return 0;
        const rate = EXCHANGE_RATES_USD[currencyName] || 1.0;
        return parseFloat(amount) * rate;
    };

    const clientCurrencyName = findNameById(lookups.currencies, form?.client_currency_id) || 'USD';
    const expertCurrencyName = findNameById(lookups.currencies, form?.expert_currency_id) || 'USD';
    const discPre = parseFloat(form?.discount_offered_percent) || 0;

    // Pre-Call Financials Calc
    const cRatePre = parseFloat(form?.client_rate) || 0;
    const eRatePre = parseFloat(form?.expert_rate) || 0;
    let normClientPre = normalizeAmount(cRatePre * (1 - discPre / 100), clientCurrencyName);
    if (parseFloat(form?.billable_client_amount_usd)) normClientPre = parseFloat(form?.billable_client_amount_usd);
    const normExpertPre = normalizeAmount(eRatePre, expertCurrencyName);
    const preCalcProfit = normClientPre - normExpertPre;
    const preCalcMargin = normClientPre > 0 ? (preCalcProfit / normClientPre) * 100 : 0;

    // Completed Financials Calc
    const cRateComp = parseFloat(form?.completed_client_rate) || cRatePre;
    const eRateComp = parseFloat(form?.completed_expert_rate) || eRatePre;
    let normClientComp = normalizeAmount(cRateComp * (1 - discPre / 100), clientCurrencyName);
    if (parseFloat(form?.completed_billable_client_amount_usd)) normClientComp = parseFloat(form?.completed_billable_client_amount_usd);
    const normExpertComp = normalizeAmount(eRateComp, expertCurrencyName);
    const compCalcProfit = normClientComp - normExpertComp;
    const compCalcMargin = normClientComp > 0 ? (compCalcProfit / normClientComp) * 100 : 0;

    if (isLoading || !form) return <Loader rows={8} />;

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">{id ? 'Edit Engagement' : 'Create Engagement'}</h1>
            </div>

            <div className="card">
                <div style={{ padding: '10px 20px 50px', marginBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 700, margin: '0 auto' }}>
                        {[{id: 1, label: 'Pre-Call Details'}, {id: 2, label: 'Call Completed Details'}, {id: 3, label: 'Post-Call Details'}].map((phase, index, arr) => {
                            const isActive = currentPhase === phase.id;
                            const isCompleted = phase.id < currentPhase;

                            const circleBg = isActive || isCompleted ? 'var(--color-accent)' : 'var(--bg-main)';
                            const circleBorder = isActive || isCompleted ? 'var(--color-accent)' : 'var(--border-color)';
                            const circleColor = isActive || isCompleted ? '#ffffff' : 'var(--text-muted)';
                            const labelColor = isActive ? 'var(--color-accent)' : 'var(--text-muted)';
                            
                            return (
                                <div key={phase.id} style={{ display: 'flex', alignItems: 'center', flex: index === arr.length - 1 ? '0 1 auto' : '1 1 auto' }}>
                                    <div 
                                        onClick={() => setCurrentPhase(phase.id)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}
                                    >
                                        <div style={{
                                            width: 40, height: 40, borderRadius: '50%', backgroundColor: circleBg,
                                            border: `2px solid ${circleBorder}`, color: circleColor,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 'bold', fontSize: 16, transition: 'all 0.3s ease', zIndex: 2,
                                        }}>
                                            {isCompleted ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            ) : phase.id}
                                        </div>
                                        <span style={{ 
                                            position: 'absolute', top: 50, whiteSpace: 'nowrap',
                                            color: labelColor, fontWeight: isActive ? '700' : '500', fontSize: 13.5,
                                            transition: 'color 0.3s ease'
                                        }}>
                                            {phase.label}
                                        </span>
                                    </div>
                                    {index < arr.length - 1 && (
                                        <div style={{ flex: 1, height: 3, backgroundColor: isCompleted ? 'var(--color-accent)' : 'var(--border-color)', margin: '0 16px', transition: 'all 0.3s ease', borderRadius: 2 }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <form className="expert-form" onSubmit={handleSubmit}>
                    
                    {currentPhase === 1 && (
                        <>
                            <div className="form-section">
                                <h2 className="form-section__title">Core Details</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Project *</label>
                                <FilterDropdown
                                    label={findNameById(lookups.projects, form.project_id) || 'Select project'}
                                    options={(lookups.projects || []).map((x) => x.name)}
                                    selected={findNameById(lookups.projects, form.project_id) ? [findNameById(lookups.projects, form.project_id)] : []}
                                    onChange={(next) => handleFormChange('project_id', findIdByName(lookups.projects, next[0] || ''))}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Expert *</label>
                                <FilterDropdown
                                    label={findNameById(selectableExperts, form.expert_id) || 'Select expert'}
                                    options={selectableExperts.map((x) => x.name)}
                                    selected={findNameById(selectableExperts, form.expert_id) ? [findNameById(selectableExperts, form.expert_id)] : []}
                                    onChange={(next) => handleFormChange('expert_id', findIdByName(selectableExperts, next[0] || ''))}
                                />
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Project Experts Overview</label>
                                <div style={{ 
                                    fontSize: 13.5, 
                                    border: '1px solid var(--table-border)', 
                                    borderRadius: 4, 
                                    padding: 10, 
                                    background: 'var(--table-bg)',
                                    color: 'var(--text-app)'
                                }}>
                                    {projectExperts ? (
                                        <div style={{ display: 'grid', gap: 8 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, alignItems: 'flex-start' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text-app)' }}>Accepted</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {(projectExperts.accepted || []).length
                                                        ? (projectExperts.accepted || []).map((e) => (
                                                            <span key={`acc-${e.id}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', border: '1px solid var(--table-border)', borderRadius: 12, background: 'var(--table-bg-hover)', fontSize: 12.5 }}>
                                                                {e.name}
                                                            </span>
                                                        ))
                                                        : <span>—</span>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, alignItems: 'flex-start' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text-app)' }}>Invited</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {(projectExperts.invited || []).length
                                                        ? (projectExperts.invited || []).map((e) => (
                                                            <span key={`inv-${e.id}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', border: '1px solid var(--table-border)', borderRadius: 12, background: 'var(--table-bg-hover)', fontSize: 12.5 }}>
                                                                {e.name}
                                                            </span>
                                                        ))
                                                        : <span>—</span>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, alignItems: 'flex-start' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text-app)' }}>Leads</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {(projectExperts.leads || []).length
                                                        ? (projectExperts.leads || []).map((e) => (
                                                            <span key={`lead-${e.id}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', border: '1px solid var(--table-border)', borderRadius: 12, background: 'var(--table-bg-hover)', fontSize: 12.5 }}>
                                                                {e.name}
                                                            </span>
                                                        ))
                                                        : <span>—</span>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, alignItems: 'flex-start' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text-app)' }}>Scheduled</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {(projectExperts.scheduled || []).length
                                                        ? (projectExperts.scheduled || []).map((e) => (
                                                            <span key={`sched-${e.id}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', border: '1px solid var(--table-border)', borderRadius: 12, background: 'var(--table-bg-hover)', fontSize: 12.5 }}>
                                                                {e.name}
                                                            </span>
                                                        ))
                                                        : <span>—</span>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, alignItems: 'flex-start' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text-app)' }}>Completed</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                    {(projectExperts.completed || []).length
                                                        ? (projectExperts.completed || []).map((e) => (
                                                            <span key={`comp-${e.id}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', border: '1px solid var(--table-border)', borderRadius: 12, background: 'var(--table-bg-hover)', fontSize: 12.5 }}>
                                                                {e.name}
                                                            </span>
                                                        ))
                                                        : <span>—</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ) : '—'}
                                </div>
                            </div>
                            <div className="form-field">
                                <label className="form-label">Client *</label>
                                <FilterDropdown
                                    label={findNameById(lookups.clients, form.client_id) || 'Select client'}
                                    options={(lookups.clients || []).map((x) => x.name)}
                                    selected={findNameById(lookups.clients, form.client_id) ? [findNameById(lookups.clients, form.client_id)] : []}
                                    onChange={(next) => handleFormChange('client_id', findIdByName(lookups.clients, next[0] || ''))}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Point of Contact</label>
                                <FilterDropdown
                                    label={findNameById(lookups.users, form.poc_user_id) || 'Select user'}
                                    options={(lookups.users || []).map((x) => x.name)}
                                    selected={findNameById(lookups.users, form.poc_user_id) ? [findNameById(lookups.users, form.poc_user_id)] : []}
                                    onChange={(next) => handleFormChange('poc_user_id', findIdByName(lookups.users, next[0] || ''))}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Call Owner</label>
                                <FilterDropdown
                                    label={findNameById(lookups.hasamex_users, form.call_owner_id) || 'Select owner'}
                                    options={(lookups.hasamex_users || []).map((x) => x.name)}
                                    selected={findNameById(lookups.hasamex_users, form.call_owner_id) ? [findNameById(lookups.hasamex_users, form.call_owner_id)] : []}
                                    onChange={(next) => handleFormChange('call_owner_id', findIdByName(lookups.hasamex_users, next[0] || ''))}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Call Date & Time *</label>
                                <input className="form-input" type="datetime-local" value={dtValue(form.call_date)} onChange={(e) => handleFormChange('call_date', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Duration (mins)</label>
                                <input className="form-input" type="number" value={form.actual_call_duration_mins || ''} onChange={(e) => handleFormChange('actual_call_duration_mins', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Engagement Method</label>
                                <FilterDropdown
                                    label={findNameById(lookups.engagement_method, form.engagement_method_id) || 'Select method'}
                                    options={(lookups.engagement_method || []).map((x) => x.name)}
                                    selected={findNameById(lookups.engagement_method, form.engagement_method_id) ? [findNameById(lookups.engagement_method, form.engagement_method_id)] : []}
                                    onChange={(next) => handleFormChange('engagement_method_id', findIdByName(lookups.engagement_method, next[0] || ''))}
                                />
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Transcript Folder Link</label>
                                <input className="form-input" value={form.transcript_link_folder || ''} onChange={(e) => handleFormChange('transcript_link_folder', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Expert Timeline</label>
                                <TimezoneSelect 
                                    name="expert_timezone"
                                    value={form.expert_timezone || ''}
                                    onChange={(e) => handleFormChange('expert_timezone', e.target.value)}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Client Timeline</label>
                                <TimezoneSelect 
                                    name="client_timezone"
                                    value={form.client_timezone || ''}
                                    onChange={(e) => handleFormChange('client_timezone', e.target.value)}
                                />
                            </div>
                        </div>

                        {form.zoom_meeting_id && (
                            <div className="zoom-details-summary" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-grey-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-grey-200)' }}>
                                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)', color: 'var(--color-grey-700)' }}>Zoom Meeting Details</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                                    <div><span style={{ color: 'var(--color-grey-500)' }}>Meeting ID:</span> {form.zoom_meeting_id}</div>
                                    <div><span style={{ color: 'var(--color-grey-500)' }}>Password:</span> {form.zoom_password}</div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <span style={{ color: 'var(--color-grey-500)' }}>Join URL:</span> <a href={form.zoom_join_url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-600)', wordBreak: 'break-all' }}>{form.zoom_join_url}</a>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-section">
                        <h2 className="form-section__title">Pre-Call Financials</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Client Rate</label>
                                <input className="form-input" type="number" value={form.client_rate || ''} onChange={(e) => handleFormChange('client_rate', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Client Currency</label>
                                <FilterDropdown
                                    label={findNameById(lookups.currencies, form.client_currency_id) || 'Select currency'}
                                    options={(lookups.currencies || []).map((x) => x.name)}
                                    selected={findNameById(lookups.currencies, form.client_currency_id) ? [findNameById(lookups.currencies, form.client_currency_id)] : []}
                                    onChange={(next) => handleFormChange('client_currency_id', findIdByName(lookups.currencies, next[0] || ''))}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Discount %</label>
                                <input className="form-input" type="number" value={form.discount_offered_percent || ''} onChange={(e) => handleFormChange('discount_offered_percent', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Billable Amount (USD)</label>
                                <input className="form-input" type="number" value={form.billable_client_amount_usd || ''} onChange={(e) => handleFormChange('billable_client_amount_usd', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Expert Rate</label>
                                <input className="form-input" type="number" value={form.expert_rate || ''} onChange={(e) => handleFormChange('expert_rate', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Expert Currency</label>
                                <FilterDropdown
                                    label={findNameById(lookups.currencies, form.expert_currency_id) || 'Select currency'}
                                    options={(lookups.currencies || []).map((x) => x.name)}
                                    selected={findNameById(lookups.currencies, form.expert_currency_id) ? [findNameById(lookups.currencies, form.expert_currency_id)] : []}
                                    onChange={(next) => handleFormChange('expert_currency_id', findIdByName(lookups.currencies, next[0] || ''))}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Prorated Expert Amount (Base)</label>
                                <input className="form-input" type="number" value={form.prorated_expert_amount_base || ''} onChange={(e) => handleFormChange('prorated_expert_amount_base', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Prorated Expert Amount (USD)</label>
                                <input className="form-input" type="number" value={form.prorated_expert_amount_usd || ''} onChange={(e) => handleFormChange('prorated_expert_amount_usd', e.target.value)} />
                            </div>

                            <div className="form-field">
                                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Pre-Call Gross Profit (USD)</label>
                                <input className="form-input" type="text" readOnly disabled value={`$${preCalcProfit.toFixed(2)}`} style={{ fontWeight: 600, backgroundColor: 'var(--color-grey-50)', color: preCalcProfit >= 0 ? 'var(--color-success-600)' : 'var(--color-danger-600)' }} />
                            </div>
                            <div className="form-field">
                                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Pre-Call Gross Margin (%)</label>
                                <input className="form-input" type="text" readOnly disabled value={`${preCalcMargin.toFixed(2)}%`} style={{ fontWeight: 600, backgroundColor: 'var(--color-grey-50)' }} />
                            </div>

                        </div>
                    </div>
                    </>
                    )}

                    {currentPhase === 2 && (
                        <div className="form-section">
                            <h2 className="form-section__title">Completed Calls Details</h2>
                            <div className="form-grid">
                                <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label" style={{ color: 'var(--color-primary-600)' }}>Call Completed Duration (mins) *</label>
                                    <input className="form-input" type="number" value={form.call_completed_duration_mins || ''} onChange={(e) => handleFormChange('call_completed_duration_mins', e.target.value)} />
                                    <small style={{ color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>Enter the actual completed duration to auto-calculate the completed rates based on Pre-Call history.</small>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Completed Client Rate</label>
                                    <input className="form-input" type="number" step="0.01" value={form.completed_client_rate || ''} onChange={(e) => handleFormChange('completed_client_rate', e.target.value)} />
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Completed Billable Amount (USD)</label>
                                    <input className="form-input" type="number" step="0.01" value={form.completed_billable_client_amount_usd || ''} onChange={(e) => handleFormChange('completed_billable_client_amount_usd', e.target.value)} />
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Completed Expert Rate</label>
                                    <input className="form-input" type="number" step="0.01" value={form.completed_expert_rate || ''} onChange={(e) => handleFormChange('completed_expert_rate', e.target.value)} />
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Completed Prorated Expert (Base)</label>
                                    <input className="form-input" type="number" step="0.01" value={form.completed_prorated_expert_amount_base || ''} onChange={(e) => handleFormChange('completed_prorated_expert_amount_base', e.target.value)} />
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Completed Prorated Expert (USD)</label>
                                    <input className="form-input" type="number" step="0.01" value={form.completed_prorated_expert_amount_usd || ''} onChange={(e) => handleFormChange('completed_prorated_expert_amount_usd', e.target.value)} />
                                </div>
                                <div className="form-field">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Completed Gross Profit (USD)</label>
                                    <input className="form-input" type="text" readOnly disabled value={`$${compCalcProfit.toFixed(2)}`} style={{ fontWeight: 600, backgroundColor: 'var(--color-grey-50)', color: compCalcProfit >= 0 ? 'var(--color-success-600)' : 'var(--color-danger-600)' }} />
                                </div>
                                <div className="form-field">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Completed Gross Margin (%)</label>
                                    <input className="form-input" type="text" readOnly disabled value={`${compCalcMargin.toFixed(2)}%`} style={{ fontWeight: 600, backgroundColor: 'var(--color-grey-50)' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {currentPhase === 3 && (
                        <>
                    <div className="form-section">
                        <h2 className="form-section__title">Post-Call & Payments</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Post Call Status</label>
                                <FilterDropdown
                                    label={findNameById(lookups.post_call_status, form.expert_post_call_status_id) || 'Select status'}
                                    options={(lookups.post_call_status || []).map((x) => x.name)}
                                    selected={findNameById(lookups.post_call_status, form.expert_post_call_status_id) ? [findNameById(lookups.post_call_status, form.expert_post_call_status_id)] : []}
                                    onChange={(next) => handleFormChange('expert_post_call_status_id', findIdByName(lookups.post_call_status, next[0] || ''))}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Expert Payment Status</label>
                                <FilterDropdown
                                    label={findNameById(lookups.payment_status, form.expert_payment_status_id) || 'Select payment status'}
                                    options={(lookups.payment_status || []).map((x) => x.name)}
                                    selected={findNameById(lookups.payment_status, form.expert_payment_status_id) ? [findNameById(lookups.payment_status, form.expert_payment_status_id)] : []}
                                    onChange={(next) => handleFormChange('expert_payment_status_id', findIdByName(lookups.payment_status, next[0] || ''))}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Payment Due Date</label>
                                <input className="form-input" type="date" value={form.expert_payment_due_date || ''} onChange={(e) => handleFormChange('expert_payment_due_date', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Actual Expert Payment Date</label>
                                <input className="form-input" type="date" value={form.actual_expert_payment_date || ''} onChange={(e) => handleFormChange('actual_expert_payment_date', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Paid From</label>
                                <input className="form-input" value={form.expert_paid_from || ''} onChange={(e) => handleFormChange('expert_paid_from', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Payout Ref ID</label>
                                <input className="form-input" value={form.expert_payout_ref_id || ''} onChange={(e) => handleFormChange('expert_payout_ref_id', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h2 className="form-section__title">Client Invoicing</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Invoice Number</label>
                                <input className="form-input" value={form.client_invoice_number || ''} onChange={(e) => handleFormChange('client_invoice_number', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Invoice Date</label>
                                <input className="form-input" type="date" value={form.client_invoice_date || ''} onChange={(e) => handleFormChange('client_invoice_date', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Client Payment Received Date</label>
                                <input className="form-input" type="date" value={form.client_payment_received_date || ''} onChange={(e) => handleFormChange('client_payment_received_date', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Payment Received Account</label>
                                <input className="form-input" value={form.client_payment_received_account || ''} onChange={(e) => handleFormChange('client_payment_received_account', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h2 className="form-section__title">Notes</h2>
                        <div className="form-grid">
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Notes</label>
                                <textarea className="form-textarea" rows={3} value={form.notes || ''} onChange={(e) => handleFormChange('notes', e.target.value)} />
                            </div>
                        </div>
                    </div>
                    </>
                    )}

                    <div className="form-actions" style={{ marginTop: 30, borderTop: '1px solid var(--table-border)', paddingTop: 20 }}>
                        <Button type="button" variant="secondary" onClick={() => navigate('/engagements')}>
                            Cancel
                        </Button>
                        {id && (
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => handleScheduleMeeting()} 
                                loading={isScheduling}
                                disabled={isSaving || !form.call_date}
                            >
                                {form.zoom_meeting_id ? 'Reschedule Call' : 'Schedule Call (Zoom + Zoho)'}
                            </Button>
                        )}
                        <Button type="submit" variant="primary" loading={isSaving} disabled={isScheduling}>
                            {id ? 'Save Changes' : 'Create Engagement'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
