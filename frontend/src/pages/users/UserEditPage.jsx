import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchClients } from '../../api/clients';
import { fetchUserById, updateUser } from '../../api/users';
import FilterDropdown from '../../components/experts/FilterDropdown';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';

export default function UserEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState(null);

    useEffect(() => {
        fetchClients({ page: 1, limit: 1000, search: '' }).then((r) => setClients(r.data || []));
    }, []);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchUserById(id).then((u) => {
            if (cancelled) return;
            setForm({
                first_name: u?.first_name || '',
                last_name: u?.last_name || '',
                user_code: u?.user_code || '',
                designation_title: u?.designation_title || '',
                email: u?.email || '',
                phone: u?.phone || '',
                seniority: u?.seniority || '',
                linkedin_url: u?.linkedin_url || '',
                client_id: u?.client_id ? String(u.client_id) : null,
                location: u?.location || '',
                preferred_contact_method: u?.preferred_contact_method || '',
                time_zone: u?.time_zone || '',
                avg_calls_per_month: u?.avg_calls_per_month ?? '',
                status: u?.status || '',
                notes: u?.notes || '',
                user_manager: u?.user_manager || '',
                ai_generated_bio: u?.ai_generated_bio || '',
            });
            setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [id]);

    const clientOptions = useMemo(() => (clients || []).map((c) => c.client_name), [clients]);
    const selectedClientName = useMemo(
        () => clients.find((c) => String(c.client_id) === String(form?.client_id))?.client_name,
        [clients, form?.client_id]
    );

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form) return;
        setIsSaving(true);
        try {
            await updateUser(id, {
                ...form,
                client_id: form.client_id ? Number(form.client_id) : null,
                avg_calls_per_month: form.avg_calls_per_month ? Number(form.avg_calls_per_month) : null,
            });
            navigate('/users');
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading || !form) return <Loader rows={8} />;

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Edit User</h1>
                <p className="page-subtitle">Update user details</p>
            </div>

            <div className="card">
                <form className="expert-form" onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h2 className="form-section__title">User</h2>
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
                                <label className="form-label">User ID</label>
                                <input className="form-input" value={form.user_code} onChange={(e) => setForm((p) => ({ ...p, user_code: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Client Name</label>
                                <FilterDropdown
                                    label={selectedClientName || 'Select client'}
                                    options={clientOptions}
                                    selected={selectedClientName ? [selectedClientName] : []}
                                    onChange={(next) => {
                                        const name = next[0] || '';
                                        const match = clients.find((c) => c.client_name === name);
                                        setForm((p) => ({ ...p, client_id: match ? String(match.client_id) : null }));
                                    }}
                                />
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Designation / Title</label>
                                <input className="form-input" value={form.designation_title} onChange={(e) => setForm((p) => ({ ...p, designation_title: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Email</label>
                                <input className="form-input" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Seniority</label>
                                <input className="form-input" value={form.seniority} onChange={(e) => setForm((p) => ({ ...p, seniority: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">LinkedIn URL</label>
                                <input className="form-input" value={form.linkedin_url} onChange={(e) => setForm((p) => ({ ...p, linkedin_url: e.target.value }))} />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h2 className="form-section__title">Preferences</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Location</label>
                                <input className="form-input" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Preferred Contact Method</label>
                                <input className="form-input" value={form.preferred_contact_method} onChange={(e) => setForm((p) => ({ ...p, preferred_contact_method: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Time Zone</label>
                                <input className="form-input" value={form.time_zone} onChange={(e) => setForm((p) => ({ ...p, time_zone: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Avg Calls / Month</label>
                                <input className="form-input" type="number" value={form.avg_calls_per_month} onChange={(e) => setForm((p) => ({ ...p, avg_calls_per_month: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Status</label>
                                <input className="form-input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">User Manager</label>
                                <input className="form-input" value={form.user_manager} onChange={(e) => setForm((p) => ({ ...p, user_manager: e.target.value }))} />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h2 className="form-section__title">Notes</h2>
                        <div className="form-grid">
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Notes</label>
                                <textarea className="form-textarea" rows={3} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">AI-Generated BIO</label>
                                <textarea className="form-textarea" rows={3} value={form.ai_generated_bio} onChange={(e) => setForm((p) => ({ ...p, ai_generated_bio: e.target.value }))} />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <Button type="button" variant="secondary" onClick={() => navigate('/users')}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" loading={isSaving}>
                            Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

