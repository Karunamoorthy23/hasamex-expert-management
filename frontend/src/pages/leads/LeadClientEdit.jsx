import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { fetchLeadClientById, updateLeadClient } from '../../api/leads';
import Loader from '../../components/ui/Loader';

export default function LeadClientEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState(null);

    useEffect(() => {
        let cancelled = false;
        fetchLeadClientById(id).then((row) => {
            if (cancelled) return;
            setForm({
                first_name: row?.first_name || '',
                last_name: row?.last_name || '',
                company_name: row?.company_name || '',
                current_role: row?.current_role || '',
                business_email: row?.business_email || '',
                description: row?.description || '',
                received_date: row?.received_date || '',
                status: row?.status || 'Backlog',
            });
        });
        return () => { cancelled = true; };
    }, [id]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form) return;
        setIsSaving(true);
        try {
            await updateLeadClient(id, form);
            navigate('/leads/clients');
        } finally {
            setIsSaving(false);
        }
    }

    if (!form) return <Loader rows={6} />;

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Edit Lead Client</h1>
            </div>
            <div className="card">
                <form className="expert-form" onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h2 className="form-section__title">Client</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">First Name</label>
                                <input className="form-input" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Last Name</label>
                                <input className="form-input" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Company Name</label>
                                <input className="form-input" value={form.company_name} onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Current Role</label>
                                <input className="form-input" value={form.current_role} onChange={(e) => setForm((p) => ({ ...p, current_role: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Business Email</label>
                                <input className="form-input" value={form.business_email} onChange={(e) => setForm((p) => ({ ...p, business_email: e.target.value }))} />
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Tell us about your project</label>
                                <textarea className="form-textarea" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Received Date</label>
                                <input type="date" className="form-input" value={form.received_date || ''} onChange={(e) => setForm((p) => ({ ...p, received_date: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Status</label>
                                <select className="form-input" value={form.status || 'Backlog'} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
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
                        <Button type="submit" variant="primary" loading={isSaving}>Save Changes</Button>
                    </div>
                </form>
            </div>
        </>
    );
}
