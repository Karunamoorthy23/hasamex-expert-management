import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { getToken } from '../../auth/token';
import { createLeadCandidate } from '../../api/leads';

export default function LeadCandidateCreate() {
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState({});
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        city: '',
        email: '',
        phone_number: '',
        linkedin_url: '',
        resume_url: '',
        received_date: '',
        status: 'Backlog',
    });
    const [fileError, setFileError] = useState('');

    async function handleUpload(file) {
        setFileError('');
        if (!file) return;
        const maxBytes = 2 * 1024 * 1024;
        if (file.size > maxBytes) {
            setFileError('File size must be <= 2MB');
            return;
        }
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['pdf', 'doc', 'docx'].includes(ext)) {
            setFileError('Only PDF, DOC, DOCX allowed');
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const token = getToken();
            const res = await fetch(`${import.meta.env.VITE_API_URL}/leads/upload-file`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                body: formData
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            setForm((p) => ({ ...p, resume_url: data.url }));
        } catch (e) {
            setFileError('Upload failed');
        } finally {
            setUploading(false);
        }
    }

    function validate(values) {
        const next = {};
        const req = ['first_name', 'last_name', 'city', 'email', 'phone_number', 'linkedin_url', 'resume_url'];
        req.forEach((f) => {
            if (!String(values[f] || '').trim()) next[f] = 'Required';
        });
        if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) next.email = 'Invalid email';
        if (values.phone_number && !/^[0-9+\-() ]{7,20}$/.test(values.phone_number)) next.phone_number = 'Invalid phone';
        if (values.linkedin_url) {
            const url = String(values.linkedin_url).trim();
            const ok = /^https?:\/\//i.test(url) && /linkedin\.com/i.test(url);
            if (!ok) next.linkedin_url = 'Invalid LinkedIn URL';
        }
        return next;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const v = validate(form);
        setErrors(v);
        if (Object.keys(v).length > 0) return;
        setIsSaving(true);
        try {
            await createLeadCandidate(form);
            navigate('/leads/candidates');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title" style={{color:'black'}}>Create Lead Candidate</h1>
            </div>
            <div className="card">
                <form className="expert-form" onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h2 className="form-section__title">Candidate</h2>
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
                                <label className="form-label">CV / Resume (max 2MB) <span className="form-required">*</span></label>
                                <input type="file" className="form-input" onChange={(e) => handleUpload(e.target.files[0])} />
                                {fileError && <div className="form-error" style={{ marginTop: 6 }}>{fileError}</div>}
                                {uploading ? <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 6 }}>Uploading…</div> : null}
                                {form.resume_url && <div style={{ marginTop: 6 }}><a href={form.resume_url} target="_blank" rel="noreferrer">Uploaded</a></div>}
                                {errors.resume_url && <span className="form-error">{errors.resume_url}</span>}
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
                        <Button type="button" variant="secondary" onClick={() => navigate('/leads/candidates')}>Cancel</Button>
                        <Button type="submit" variant="primary" loading={isSaving}>Create</Button>
                    </div>
                </form>
            </div>
        </>
    );
}

