import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { createLeadClient } from '../../api/leads';

export default function LeadClientCreate() {
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        company_name: '',
        current_role: '',
        business_email: '',
        description: '',
        received_date: '',
        status: 'Backlog',
    });

    async function handleSubmit(e) {
        e.preventDefault();
        setIsSaving(true);
        try {
            await createLeadClient(form);
            navigate('/leads/clients');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title" style={{color:'black'}}>Create Lead Client</h1>
            </div>
            <div className="card">
                <form className="expert-form" onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h2 className="form-section__title">Client</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">First Name <span className="form-required">*</span></label>
                                <input className="form-input" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Last Name <span className="form-required">*</span></label>
                                <input className="form-input" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Company Name <span className="form-required">*</span></label>
                                <input className="form-input" value={form.company_name} onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Current Role <span className="form-required">*</span></label>
                                <input className="form-input" value={form.current_role} onChange={(e) => setForm((p) => ({ ...p, current_role: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Business Email <span className="form-required">*</span></label>
                                <input className="form-input" value={form.business_email} onChange={(e) => setForm((p) => ({ ...p, business_email: e.target.value }))} />
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Tell us about your project <span className="form-required">*</span></label>
                                <textarea className="form-textarea" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Received Date</label>
                                <input type="date" className="form-input" value={form.received_date} onChange={(e) => setForm((p) => ({ ...p, received_date: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Status</label>
                                <select className="form-input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                                    <option>Backlog</option>
                                    <option>In Progress</option>
                                    <option>Completed</option>
                                    <option>On Hold</option>
                                    <option>Rejected</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="form-actions">
                        <Button type="button" variant="secondary" onClick={() => navigate('/leads/clients')}>Cancel</Button>
                        <Button type="submit" variant="primary" loading={isSaving}>Create</Button>
                    </div>
                </form>
            </div>
        </>
    );
}
