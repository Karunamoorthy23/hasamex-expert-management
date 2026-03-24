import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient, fetchClientUsers } from '../../api/clients';
import { http } from '../../api/http';
import { fetchUsers } from '../../api/users';
import FilterDropdown from '../../components/experts/FilterDropdown';
import Button from '../../components/ui/Button';

export default function ClientCreatePage() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [allUsersData, setAllUsersData] = useState({ data: [] });

    const [form, setForm] = useState({
        client_name: '',
        client_type: '',
        country: '',
        office_locations: '',
        website: '',
        linkedin_url: '',
        primary_contact_user_id: null,
        client_manager_internal: '',
        billing_currency: '',
        payment_terms: '',
        invoicing_email: '',
        client_status: '',
        engagement_start_date: '',
        notes: '',
        business_activity_summary: '',
        signed_msa: null,
        commercial_model: '',
        agreed_pricing: '',
        users: '',
        msa: '',
        service_rules: '',
        client_solution_owner_ids: [],
        sales_team_ids: [],
    });

    useEffect(() => {
        fetchClientUsers().then(setUsers);
        fetchUsers({ page: 1, limit: 1000, search: '' }).then((r) => setAllUsersData(r || { data: [] }));
    }, []);
    const [lookups, setLookups] = useState({});
    useEffect(() => {
        http('/lookups').then((res) => setLookups(res.data || {})).catch(() => setLookups({}));
    }, []);

    const userOptions = useMemo(() => (users || []).map((u) => u.user_name), [users]);
    const selectedPrimary = useMemo(
        () => users.find((u) => String(u.user_id) === String(form.primary_contact_user_id))?.user_name,
        [users, form.primary_contact_user_id]
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
    const sanitize = (s) => String(s || '').trim().toLowerCase();
    const userOptionsByClient = useMemo(() => {
        const target = sanitize(form.client_name);
        if (!target) return [];
        return (allUsersData.data || [])
            .filter((u) => sanitize(u.client_name) === target)
            .map((u) => u.user_name)
            .filter(Boolean);
    }, [allUsersData, form.client_name]);
    const selectedUserNames = useMemo(() => {
        return String(form.users || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }, [form.users]);


    async function handleSubmit(e) {
        e.preventDefault();
        setIsSaving(true);
        try {
            await createClient(form);
            navigate('/clients');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Add Client</h1>
                <p className="page-subtitle">Create a new client account</p>
            </div>

            <div className="card">
                <form className="expert-form" onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h2 className="form-section__title">Client</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Client Name</label>
                                <input className="form-input" value={form.client_name} onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Client Type</label>
                                <input className="form-input" value={form.client_type} onChange={(e) => setForm((p) => ({ ...p, client_type: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Country</label>
                                <input className="form-input" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Office Locations</label>
                                <input className="form-input" value={form.office_locations} onChange={(e) => setForm((p) => ({ ...p, office_locations: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Website</label>
                                <input className="form-input" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">LinkedIn URL</label>
                                <input className="form-input" value={form.linkedin_url} onChange={(e) => setForm((p) => ({ ...p, linkedin_url: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Primary Contact</label>
                                <FilterDropdown
                                    label={selectedPrimary || 'Select user'}
                                    options={userOptions}
                                    selected={selectedPrimary ? [selectedPrimary] : []}
                                    onChange={(next) => {
                                        const name = next[0] || '';
                                        const match = users.find((u) => u.user_name === name);
                                        setForm((p) => ({ ...p, primary_contact_user_id: match ? match.user_id : null }));
                                    }}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Client Manager (Internal)</label>
                                <input className="form-input" value={form.client_manager_internal} onChange={(e) => setForm((p) => ({ ...p, client_manager_internal: e.target.value }))} />
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
                        <h2 className="form-section__title">Commercial</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Billing Currency</label>
                                <input className="form-input" value={form.billing_currency} onChange={(e) => setForm((p) => ({ ...p, billing_currency: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Payment Terms</label>
                                <input className="form-input" value={form.payment_terms} onChange={(e) => setForm((p) => ({ ...p, payment_terms: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Invoicing Email</label>
                                <input className="form-input" value={form.invoicing_email} onChange={(e) => setForm((p) => ({ ...p, invoicing_email: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Client Status</label>
                                <input className="form-input" value={form.client_status} onChange={(e) => setForm((p) => ({ ...p, client_status: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Engagement Start Date</label>
                                <input className="form-input" type="date" value={form.engagement_start_date} onChange={(e) => setForm((p) => ({ ...p, engagement_start_date: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Signed MSA?</label>
                                <select
                                    className="form-select"
                                    value={form.signed_msa === true ? 'yes' : form.signed_msa === false ? 'no' : ''}
                                    onChange={(e) => setForm((p) => ({ ...p, signed_msa: e.target.value === '' ? null : e.target.value === 'yes' }))}
                                >
                                    <option value="">—</option>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                </select>
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Commercial Model</label>
                                <input className="form-input" value={form.commercial_model} onChange={(e) => setForm((p) => ({ ...p, commercial_model: e.target.value }))} />
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Agreed Pricing</label>
                                <textarea className="form-textarea" rows={2} value={form.agreed_pricing} onChange={(e) => setForm((p) => ({ ...p, agreed_pricing: e.target.value }))} />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h2 className="form-section__title">Notes</h2>
                        <div className="form-grid">
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Business Activity Summary</label>
                                <textarea className="form-textarea" rows={3} value={form.business_activity_summary} onChange={(e) => setForm((p) => ({ ...p, business_activity_summary: e.target.value }))} />
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Notes</label>
                                <textarea className="form-textarea" rows={3} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Service Rules</label>
                                <textarea className="form-textarea" rows={4} value={form.service_rules} onChange={(e) => setForm((p) => ({ ...p, service_rules: e.target.value }))} />
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Users</label>
                                <FilterDropdown
                                    label="Select users"
                                    options={userOptionsByClient}
                                    selected={selectedUserNames}
                                    onChange={(names) => {
                                        const value = (names || []).join(', ');
                                        setForm((p) => ({ ...p, users: value }));
                                    }}
                                />
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">MSA</label>
                                <textarea className="form-textarea" rows={2} value={form.msa} onChange={(e) => setForm((p) => ({ ...p, msa: e.target.value }))} />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <Button type="button" variant="secondary" onClick={() => navigate('/clients')}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" loading={isSaving}>
                            Create Client
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
