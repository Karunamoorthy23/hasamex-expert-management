import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchClients } from '../../api/clients';
import { fetchLookups } from '../../api/lookups';
import { fetchUserById, updateUser } from '../../api/users';
import FilterDropdown from '../../components/experts/FilterDropdown';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import LocationSelector from '../../components/location/LocationSelector';
import { resolveTimezoneLabel } from '../../components/location/TimezoneResolver';
import { http } from '../../api/http';

export default function UserEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [lookups, setLookups] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState(null);

    useEffect(() => {
        fetchClients({ page: 1, limit: 1000, search: '' }).then((r) => setClients(r.data || []));
        fetchLookups().then(setLookups);
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
                location_id: u?.location_id || null,
                location_display_name: u?.location_display_name || '',
                preferred_contact_method: u?.preferred_contact_method || '',
                time_zone: u?.time_zone || '',
                avg_calls_per_month: u?.avg_calls_per_month ?? '',
                status: u?.status || '',
                notes: Array.isArray(u?.notes) ? u.notes : [],
                user_manager: u?.user_manager || '',
                ai_generated_bio: u?.ai_generated_bio || '',
                client_solution_owner_ids: Array.isArray(u?.client_solution_owner_ids) ? u.client_solution_owner_ids : [],
                sales_team_ids: Array.isArray(u?.sales_team_ids) ? u.sales_team_ids : [],
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
        if (!form) return;
        setIsSaving(true);
        try {
            let locId = form.location_id || null;
            if (form.location_city && form.location_country) {
                const payload = {
                    city: form.location_city,
                    country: form.location_country,
                    lat: form.location_latitude,
                    lng: form.location_longitude,
                    display_name: form.location_display_name || form.location,
                };
                const res = await http('/location/save', { method: 'POST', body: JSON.stringify(payload) });
                locId = res?.location_id || null;
            }
            await updateUser(id, {
                ...form,
                client_id: form.client_id ? Number(form.client_id) : null,
                location_id: locId ? Number(locId) : null,
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
                                <LocationSelector
                                    value={{ display_name: form.location_display_name || form.location }}
                                    onChange={async (sel) => {
                                        let label = '';
                                        try {
                                            label = await resolveTimezoneLabel({
                                                timezoneName: sel.timezone,
                                                latitude: sel.latitude,
                                                longitude: sel.longitude,
                                            });
                                        } catch {}
                                        setForm((p) => ({
                                            ...p,
                                            location: sel.display_name,
                                            location_display_name: sel.display_name,
                                            location_city: sel.city,
                                            location_country: sel.country,
                                            location_latitude: sel.latitude,
                                            location_longitude: sel.longitude,
                                            time_zone: label || p.time_zone,
                                        }));
                                    }}
                                />
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
                        <h2 className="form-section__title">Solution & Team</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Research Analyst</label>
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
                                <label className="form-label">Account Manager</label>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 className="form-section__title" style={{ marginBottom: 0 }}>Notes</h2>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setForm(p => ({
                                    ...p,
                                    notes: [...(p.notes || []), { id: Date.now(), date: '', title: '', description: '' }]
                                }))}
                            >
                                + Add Note
                            </Button>
                        </div>
                        <div className="notes-list">
                            {(!form.notes || form.notes.length === 0) ? (
                                <div style={{ padding: '20px', border: '1px dashed #ccc', borderRadius: '4px', textAlign: 'center', color: '#666' }}>
                                    No notes added. Click "+ Add Note" to create one.
                                </div>
                            ) : (
                                form.notes.map((note, index) => (
                                    <div key={note.id || index} className="note-item" style={{ border: '1px solid #eee', padding: '15px', borderRadius: '4px', marginBottom: '15px', position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <h4 style={{ margin: 0 }}>Note #{index + 1}</h4>
                                            <Button
                                                type="button"
                                                variant="danger"
                                                size="sm"
                                                onClick={() => setForm(p => ({
                                                    ...p,
                                                    notes: p.notes.filter((_, i) => i !== index)
                                                }))}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                        <div className="form-grid">
                                            <div className="form-field">
                                                <label className="form-label">Date</label>
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    value={note.date}
                                                    onChange={(e) => {
                                                        const newNotes = [...form.notes];
                                                        newNotes[index].date = e.target.value;
                                                        setForm(p => ({ ...p, notes: newNotes }));
                                                    }}
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label className="form-label">Title</label>
                                                <input
                                                    className="form-input"
                                                    value={note.title}
                                                    onChange={(e) => {
                                                        const newNotes = [...form.notes];
                                                        newNotes[index].title = e.target.value;
                                                        setForm(p => ({ ...p, notes: newNotes }));
                                                    }}
                                                />
                                            </div>
                                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                                <label className="form-label">Description</label>
                                                <textarea
                                                    className="form-textarea"
                                                    rows={2}
                                                    value={note.description}
                                                    onChange={(e) => {
                                                        const newNotes = [...form.notes];
                                                        newNotes[index].description = e.target.value;
                                                        setForm(p => ({ ...p, notes: newNotes }));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="form-grid" style={{ marginTop: '20px' }}>
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

