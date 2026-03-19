import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClients } from '../../api/clients';
import { fetchLookups } from '../../api/lookups';
import { createUser } from '../../api/users';
import FilterDropdown from '../../components/experts/FilterDropdown';
import Button from '../../components/ui/Button';

export default function UserCreatePage() {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [lookups, setLookups] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        user_code: '',
        designation_title: '',
        email: '',
        phone: '',
        seniority: '',
        linkedin_url: '',
        client_id: null,
        location: '',
        preferred_contact_method: '',
        time_zone: '',
        avg_calls_per_month: '',
        status: '',
        notes: '',
        user_manager: '',
        ai_generated_bio: '',
        client_solution_owner_ids: [],
        sales_team_ids: [],
    });

    useEffect(() => {
        fetchClients({ page: 1, limit: 1000, search: '' }).then((r) => setClients(r.data || []));
        fetchLookups().then(setLookups);
    }, []);

    const clientOptions = useMemo(() => (clients || []).map((c) => c.client_name), [clients]);
    const selectedClientName = useMemo(
        () => clients.find((c) => String(c.client_id) === String(form.client_id))?.client_name,
        [clients, form.client_id]
    );
    const hasamexIdByName = useMemo(() => {
        const map = {};
        (lookups.hasamex_users || []).forEach((u) => (map[u.name] = u.id));
        return map;
    }, [lookups.hasamex_users]);
    const hasamexNameById = useMemo(() => {
        const map = {};
        (lookups.hasamex_users || []).forEach((u) => (map[u.id] = u.name));
        return map;
    }, [lookups.hasamex_users]);

    async function handleSubmit(e) {
        e.preventDefault();
        setIsSaving(true);
        try {
            await createUser({
                ...form,
                client_id: form.client_id ? Number(form.client_id) : null,
                avg_calls_per_month: form.avg_calls_per_month ? Number(form.avg_calls_per_month) : null,
            });
            navigate('/users');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Add User</h1>
                <p className="page-subtitle">Create a new client user</p>
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
                                <input className="form-input" value={form.user_code} onChange={(e) => setForm((p) => ({ ...p, user_code: e.target.value }))} placeholder="US-0032" />
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
                        <h2 className="form-section__title">Solution & Team</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Client Solution</label>
                                <FilterDropdown
                                    label="Select owners"
                                    options={(lookups.hasamex_users || []).map((u) => u.name)}
                                    selected={(form.client_solution_owner_ids || []).map((id) => hasamexNameById[id]).filter(Boolean)}
                                    onChange={(names) => {
                                        const ids = names.map((n) => hasamexIdByName[n]).filter(Boolean);
                                        setForm((p) => ({ ...p, client_solution_owner_ids: ids }));
                                    }}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Sales Team</label>
                                <FilterDropdown
                                    label="Select sales team"
                                    options={(lookups.hasamex_users || []).map((u) => u.name)}
                                    selected={(form.sales_team_ids || []).map((id) => hasamexNameById[id]).filter(Boolean)}
                                    onChange={(names) => {
                                        const ids = names.map((n) => hasamexIdByName[n]).filter(Boolean);
                                        setForm((p) => ({ ...p, sales_team_ids: ids }));
                                    }}
                                />
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
                            Create User
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

