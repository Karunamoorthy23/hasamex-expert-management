import React, { useState, useEffect } from 'react';
import { http } from '../../api/http';

/**
 * EngagementModal — Form for adding or editing an engagement.
 */
export default function EngagementModal({ isOpen, onClose, onSave, engagement, lookups }) {
    const [formData, setFormData] = useState({
        project_id: '',
        expert_id: '',
        client_id: '',
        poc_user_id: '',
        call_owner_id: '',
        call_date: '',
        actual_call_duration_mins: '',
        engagement_method_id: '',
        notes: '',
        client_rate: '',
        client_currency_id: '',
        expert_rate: '',
        expert_currency_id: '',
        expert_payment_status_id: '',
        expert_post_call_status_id: '',
    });
    const [projectExperts, setProjectExperts] = useState(null);

    useEffect(() => {
        if (engagement) {
            // Populate form with existing engagement data
            setFormData({
                ...engagement,
                // Ensure IDs are integers/strings as expected by select inputs
                project_id: engagement.project_id || '',
                expert_id: engagement.expert_id || '',
                client_id: engagement.client_id || '',
                poc_user_id: engagement.poc_user_id || '',
                call_owner_id: engagement.call_owner_id || '',
                call_date: engagement.call_date ? engagement.call_date.split('T')[0] : '',
                actual_call_duration_mins: engagement.actual_call_duration_mins || '',
                engagement_method_id: engagement.engagement_method_id || '',
                client_currency_id: engagement.client_currency_id || '',
                expert_currency_id: engagement.expert_currency_id || '',
                expert_payment_status_id: engagement.expert_payment_status_id || '',
                expert_post_call_status_id: engagement.expert_post_call_status_id || '',
            });
        } else {
            // Reset form for new engagement
            setFormData({
                project_id: '',
                expert_id: '',
                client_id: '',
                poc_user_id: '',
                call_owner_id: '',
                call_date: '',
                actual_call_duration_mins: '',
                engagement_method_id: '',
                notes: '',
                client_rate: '',
                client_currency_id: '',
                expert_rate: '',
                expert_currency_id: '',
                expert_payment_status_id: '',
                expert_post_call_status_id: '',
            });
        }
    }, [engagement, isOpen]);

    useEffect(() => {
        let cancelled = false;
        const pid = formData?.project_id || '';
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
                setFormData(prev => {
                    const next = { ...prev };
                    if (!prev.expert_id || prev.project_id !== pid) next.expert_id = autoId || '';
                    if (proj.client_id) next.client_id = proj.client_id;
                    if (proj.poc_user_id) next.poc_user_id = proj.poc_user_id;
                    return next;
                });
            } catch {
                if (!cancelled) setProjectExperts(null);
            }
        })();
        return () => { cancelled = true; };
    }, [formData?.project_id]);

    const expertOptions = projectExperts
        ? [
            ...(projectExperts.scheduled || []),
            ...(projectExperts.completed || []),
        ]
        : [];

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content large">
                <div className="modal-header">
                    <h2>{engagement ? 'Edit Engagement' : 'Create New Engagement'}</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Project *</label>
                            <select name="project_id" value={formData.project_id} onChange={handleChange} required>
                                <option value="">Select Project</option>
                                {lookups.projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label>Expert *</label>
                            <select name="expert_id" value={formData.expert_id} onChange={handleChange} required>
                                <option value="">Select Expert</option>
                                {expertOptions?.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group full-width">
                            <label>Project Experts</label>
                            <div style={{ fontSize: 13.5, border: '1px solid #e0e0e0', borderRadius: 4, padding: 10, background: '#fafafa' }}>
                                {projectExperts ? (
                                    <div style={{ display: 'grid', gap: 8 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, alignItems: 'flex-start' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>Leads</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {(projectExperts.leads || []).length
                                                    ? (projectExperts.leads || []).map((e) => (
                                                        <span key={`lead-${e.id}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', border: '1px solid #c8c8c8', borderRadius: 12, background: '#ffffff', fontSize: 12.5 }}>
                                                            {e.name}
                                                        </span>
                                                    ))
                                                    : <span>—</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, alignItems: 'flex-start' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>Invited</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {(projectExperts.invited || []).length
                                                    ? (projectExperts.invited || []).map((e) => (
                                                        <span key={`inv-${e.id}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', border: '1px solid #c8c8c8', borderRadius: 12, background: '#ffffff', fontSize: 12.5 }}>
                                                            {e.name}
                                                        </span>
                                                    ))
                                                    : <span>—</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, alignItems: 'flex-start' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>Accepted</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {(projectExperts.accepted || []).length
                                                    ? (projectExperts.accepted || []).map((e) => (
                                                        <span key={`acc-${e.id}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', border: '1px solid #c8c8c8', borderRadius: 12, background: '#ffffff', fontSize: 12.5 }}>
                                                            {e.name}
                                                        </span>
                                                    ))
                                                    : <span>—</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, alignItems: 'flex-start' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>Scheduled</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {(projectExperts.scheduled || []).length
                                                    ? (projectExperts.scheduled || []).map((e) => (
                                                        <span key={`sched-${e.id}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', border: '1px solid #c8c8c8', borderRadius: 12, background: '#ffffff', fontSize: 12.5 }}>
                                                            {e.name}
                                                        </span>
                                                    ))
                                                    : <span>—</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, alignItems: 'flex-start' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>Completed</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {(projectExperts.completed || []).length
                                                    ? (projectExperts.completed || []).map((e) => (
                                                        <span key={`comp-${e.id}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', border: '1px solid #c8c8c8', borderRadius: 12, background: '#ffffff', fontSize: 12.5 }}>
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

                        <div className="form-group">
                            <label>Client *</label>
                            <select name="client_id" value={formData.client_id} onChange={handleChange} required>
                                <option value="">Select Client</option>
                                {lookups.clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Call Owner (Internal)</label>
                            <select name="call_owner_id" value={formData.call_owner_id} onChange={handleChange}>
                                <option value="">Select Owner</option>
                                {lookups.hasamex_users?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Call Date *</label>
                            <input type="date" name="call_date" value={formData.call_date} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label>Duration (mins)</label>
                            <input type="number" name="actual_call_duration_mins" value={formData.actual_call_duration_mins} onChange={handleChange} />
                        </div>

                        <div className="form-group">
                            <label>Method</label>
                            <select name="engagement_method_id" value={formData.engagement_method_id} onChange={handleChange}>
                                <option value="">Select Method</option>
                                {lookups.engagement_method?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Payment Status</label>
                            <select name="expert_payment_status_id" value={formData.expert_payment_status_id} onChange={handleChange}>
                                <option value="">Select Status</option>
                                {lookups.payment_status?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-divider">Financials</div>
                    
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Client Rate</label>
                            <input type="number" step="0.01" name="client_rate" value={formData.client_rate} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Client Currency</label>
                            <select name="client_currency_id" value={formData.client_currency_id} onChange={handleChange}>
                                <option value="">Select Currency</option>
                                {lookups.currencies?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Expert Rate</label>
                            <input type="number" step="0.01" name="expert_rate" value={formData.expert_rate} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Expert Currency</label>
                            <select name="expert_currency_id" value={formData.expert_currency_id} onChange={handleChange}>
                                <option value="">Select Currency</option>
                                {lookups.currencies?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group full-width">
                        <label>Notes</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3"></textarea>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary">Save Engagement</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
