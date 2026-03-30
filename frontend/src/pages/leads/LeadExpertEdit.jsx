import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { fetchLeadExpertById, updateLeadExpert } from '../../api/leads';
import Loader from '../../components/ui/Loader';

export default function LeadExpertEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState(null);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        let cancelled = false;
        fetchLeadExpertById(id).then((row) => {
            if (cancelled) return;
            setForm({
                first_name: row?.first_name || '',
                last_name: row?.last_name || '',
                city: row?.city || '',
                email: row?.email || '',
                phone_number: row?.phone_number || '',
                linkedin_url: row?.linkedin_url || '',
                description: row?.description || '',
                received_date: row?.received_date || '',
                status: row?.status || 'Backlog',
            });
        });
        return () => { cancelled = true; };
    }, [id]);

    function validate(values) {
        const next = {};
        const req = ['first_name', 'last_name', 'city', 'email', 'phone_number', 'linkedin_url'];
        req.forEach((f) => {
            if (!String(values[f] || '').trim()) next[f] = 'Required';
        });
        if (values?.email && !/^\S+@\S+\.\S+$/.test(values.email)) next.email = 'Invalid email';
        if (values?.phone_number && !/^[0-9+\-() ]{7,20}$/.test(values.phone_number)) next.phone_number = 'Invalid phone';
        if (values?.linkedin_url) {
            const url = String(values.linkedin_url).trim();
            const ok = /^https?:\/\//i.test(url) && /linkedin\.com/i.test(url);
            if (!ok) next.linkedin_url = 'Invalid LinkedIn URL';
        }
        return next;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form) return;
        const v = validate(form);
        setErrors(v);
        if (Object.keys(v).length > 0) return;
        setIsSaving(true);
        try {
            await updateLeadExpert(id, form);
            navigate('/leads/experts');
        } finally {
            setIsSaving(false);
        }
    }

    if (!form) return <Loader rows={6} />;

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Edit Lead Expert</h1>
            </div>
            <div className="card">
                <form className="expert-form" onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h2 className="form-section__title">Expert</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">First Name <span className="form-required">*</span></label>
                                <input className={`form-input${errors.first_name ? ' form-input--error' : ''}`} value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
                                {errors.first_name && <span className="form-error">{errors.first_name}</span>}
                            </div>
                            <div className="form-field">
                                <label className="form-label">Last Name <span className="form-required">*</span></label>
                                <input className={`form-input${errors.last_name ? ' form-input--error' : ''}`} value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
                                {errors.last_name && <span className="form-error">{errors.last_name}</span>}
                            </div>
                            <div className="form-field">
                                <label className="form-label">City <span className="form-required">*</span></label>
                                <input className={`form-input${errors.city ? ' form-input--error' : ''}`} value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
                                {errors.city && <span className="form-error">{errors.city}</span>}
                            </div>
                            <div className="form-field">
                                <label className="form-label">Email <span className="form-required">*</span></label>
                                <input className={`form-input${errors.email ? ' form-input--error' : ''}`} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                                {errors.email && <span className="form-error">{errors.email}</span>}
                            </div>
                            <div className="form-field">
                                <label className="form-label">Phone Number <span className="form-required">*</span></label>
                                <input className={`form-input${errors.phone_number ? ' form-input--error' : ''}`} value={form.phone_number} onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))} />
                                {errors.phone_number && <span className="form-error">{errors.phone_number}</span>}
                            </div>
                            <div className="form-field">
                                <label className="form-label">LinkedIn URL <span className="form-required">*</span></label>
                                <input className={`form-input${errors.linkedin_url ? ' form-input--error' : ''}`} value={form.linkedin_url} onChange={(e) => setForm((p) => ({ ...p, linkedin_url: e.target.value }))} />
                                {errors.linkedin_url && <span className="form-error">{errors.linkedin_url}</span>}
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Professional Background</label>
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
                        <Button type="button" variant="secondary" onClick={() => navigate('/leads/experts')}>Cancel</Button>
                        <Button type="submit" variant="primary" loading={isSaving}>Save Changes</Button>
                    </div>
                </form>
            </div>
        </>
    );
}

