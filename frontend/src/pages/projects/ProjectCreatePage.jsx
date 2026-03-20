import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLookups } from '../../api/lookups';
import { fetchClients } from '../../api/clients';
import { fetchUsers } from '../../api/users';
import { createProject } from '../../api/projects';
import FilterDropdown from '../../components/experts/FilterDropdown';
import Button from '../../components/ui/Button';

export default function ProjectCreatePage() {
    const navigate = useNavigate();
    const [lookups, setLookups] = useState({});
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const [form, setForm] = useState({
        client_id: '',
        poc_user_id: '',
        received_date: '',
        project_title: '',
        project_type: '',
        project_description: '',
        target_companies: '',
        target_region: '',
        target_geographies: [],
        target_functions_titles: '',
        current_former_both: 'Both',
        number_of_calls: '',
        profile_question_1: '',
        profile_question_2: '',
        profile_question_3: '',
        compliance_question_1: '',
        project_deadline: '',
        project_created_by: '',
        client_solution_owner_ids: [],
        sales_team_ids: [],
    });

    useEffect(() => {
        fetchLookups().then(setLookups);
        fetchClients({ page: 1, limit: 1000, search: '' }).then((r) => setClients(r.data || []));
        fetchUsers({ page: 1, limit: 1000, search: '' }).then((r) => setUsers(r.data || []));
    }, []);

    const clientOptions = useMemo(() => (clients || []).map((c) => c.client_name), [clients]);
    const userOptions = useMemo(() => (users || []).map((u) => u.user_name), [users]);
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

    const selectedClientName = useMemo(() => clients.find((c) => String(c.client_id) === String(form.client_id))?.client_name, [clients, form.client_id]);
    const selectedUserName = useMemo(() => users.find((u) => String(u.user_id) === String(form.poc_user_id))?.user_name, [users, form.poc_user_id]);

    async function handleSubmit(e) {
        e.preventDefault();
        setIsSaving(true);
        try {
            const requiredStrings = [
                'client_id',
                'poc_user_id',
                'received_date',
                'project_title',
                'project_type',
                'project_description',
                'target_companies',
                'target_region',
                'target_functions_titles',
                'current_former_both',
                'number_of_calls',
                'profile_question_1',
                'profile_question_2',
                'profile_question_3',
                'compliance_question_1',
                'project_deadline',
                'project_created_by',
            ];
            const requiredArrays = ['target_geographies', 'client_solution_owner_ids', 'sales_team_ids'];
            const missing = [];
            for (const key of requiredStrings) {
                if (!String(form[key] ?? '').trim()) missing.push(key);
            }
            for (const key of requiredArrays) {
                const val = form[key];
                if (!Array.isArray(val) || val.length === 0) missing.push(key);
            }
            if (missing.length) {
                alert('Please fill all required fields: ' + missing.join(', '));
                return;
            }
            const payload = {
                ...form,
                client_id: form.client_id ? Number(form.client_id) : null,
                poc_user_id: form.poc_user_id ? Number(form.poc_user_id) : null,
                number_of_calls: form.number_of_calls ? Number(form.number_of_calls) : null,
            };
            await createProject(payload);
            navigate('/projects');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Add Project</h1>
                <p className="page-subtitle">Create a new project record</p>
            </div>

            <div className="card">
                <form className="expert-form" onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h2 className="form-section__title">Core</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Client Name</label>
                                <FilterDropdown
                                    label={selectedClientName || 'Select client'}
                                    options={clientOptions}
                                    selected={selectedClientName ? [selectedClientName] : []}
                                    onChange={(next) => {
                                        const name = next[0] || '';
                                        const match = clients.find((c) => c.client_name === name);
                                        setForm((p) => ({ ...p, client_id: match ? String(match.client_id) : '' }));
                                    }}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">User Name (PoC)</label>
                                <FilterDropdown
                                    label={selectedUserName || 'Select user'}
                                    options={userOptions}
                                    selected={selectedUserName ? [selectedUserName] : []}
                                    onChange={(next) => {
                                        const name = next[0] || '';
                                        const match = users.find((u) => u.user_name === name);
                                        setForm((p) => ({ ...p, poc_user_id: match ? String(match.user_id) : '' }));
                                    }}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Received Date</label>
                                <input
                                    className="form-input"
                                    type="date"
                                    required
                                    value={form.received_date}
                                    onChange={(e) => setForm((p) => ({ ...p, received_date: e.target.value }))}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Project Deadline</label>
                                <input
                                    className="form-input"
                                    type="date"
                                    required
                                    value={form.project_deadline}
                                    onChange={(e) => setForm((p) => ({ ...p, project_deadline: e.target.value }))}
                                />
                            </div>

                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Project Title</label>
                                <input
                                    className="form-input"
                                    required
                                    value={form.project_title}
                                    onChange={(e) => setForm((p) => ({ ...p, project_title: e.target.value }))}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Project Type</label>
                                <FilterDropdown
                                    label={form.project_type || 'Select type'}
                                    options={lookups.project_type || []}
                                    selected={form.project_type ? [form.project_type] : []}
                                    onChange={(next) => setForm((p) => ({ ...p, project_type: next[0] || '' }))}
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">Target Region</label>
                                <FilterDropdown
                                    label={form.target_region || 'Select region'}
                                    options={lookups.region || []}
                                    selected={form.target_region ? [form.target_region] : []}
                                    onChange={(next) => setForm((p) => ({ ...p, target_region: next[0] || '' }))}
                                />
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
                        <h2 className="form-section__title">Targets</h2>
                        <div className="form-grid">
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Project Description</label>
                                <textarea
                                    className="form-textarea"
                                    rows={3}
                                    required
                                    value={form.project_description}
                                    onChange={(e) => setForm((p) => ({ ...p, project_description: e.target.value }))}
                                />
                            </div>

                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Target Companies</label>
                                <textarea
                                    className="form-textarea"
                                    rows={2}
                                    required
                                    value={form.target_companies}
                                    onChange={(e) => setForm((p) => ({ ...p, target_companies: e.target.value }))}
                                />
                            </div>

                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Target Geographies</label>
                                <FilterDropdown
                                    label="Select countries"
                                    options={lookups.project_target_geographies || []}
                                    selected={form.target_geographies}
                                    onChange={(next) => setForm((p) => ({ ...p, target_geographies: next }))}
                                />
                            </div>

                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Target Functions / Titles</label>
                                <textarea
                                    className="form-textarea"
                                    rows={2}
                                    required
                                    value={form.target_functions_titles}
                                    onChange={(e) => setForm((p) => ({ ...p, target_functions_titles: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h2 className="form-section__title">Call Setup</h2>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label">Current / Former / Both</label>
                                <select
                                    className="form-select"
                                    required
                                    value={form.current_former_both}
                                    onChange={(e) => setForm((p) => ({ ...p, current_former_both: e.target.value }))}
                                >
                                    <option value="Current">Current</option>
                                    <option value="Former">Former</option>
                                    <option value="Both">Both</option>
                                </select>
                            </div>

                            <div className="form-field">
                                <label className="form-label">Number of Calls</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    required
                                    value={form.number_of_calls}
                                    onChange={(e) => setForm((p) => ({ ...p, number_of_calls: e.target.value }))}
                                />
                            </div>

                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Profile Question 1</label>
                                <textarea
                                    className="form-textarea"
                                    rows={2}
                                    required
                                    value={form.profile_question_1}
                                    onChange={(e) => setForm((p) => ({ ...p, profile_question_1: e.target.value }))}
                                />
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Profile Question 2</label>
                                <textarea
                                    className="form-textarea"
                                    rows={2}
                                    required
                                    value={form.profile_question_2}
                                    onChange={(e) => setForm((p) => ({ ...p, profile_question_2: e.target.value }))}
                                />
                            </div>
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Profile Question 3</label>
                                <textarea
                                    className="form-textarea"
                                    rows={2}
                                    required
                                    value={form.profile_question_3}
                                    onChange={(e) => setForm((p) => ({ ...p, profile_question_3: e.target.value }))}
                                />
                            </div>

                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Compliance Question 1</label>
                                <textarea
                                    className="form-textarea"
                                    rows={2}
                                    required
                                    value={form.compliance_question_1}
                                    onChange={(e) => setForm((p) => ({ ...p, compliance_question_1: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <Button type="button" variant="secondary" onClick={() => navigate('/projects')}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" loading={isSaving}>
                            Create Project
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

