import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchProjectById, updateProject, fetchProjectFormLookups } from '../../api/projects';
import { http } from '../../api/http';
import FilterDropdown from '../../components/experts/FilterDropdown';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';

export default function ProjectEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [lookups, setLookups] = useState({});
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);
    const [outreachToast, setOutreachToast] = useState(null);
    const [pendingOutreach, setPendingOutreach] = useState(null);

    const [form, setForm] = useState(null);
    const [assignedExpertIds, setAssignedExpertIds] = useState([]);

    useEffect(() => {
        let mounted = true;
        fetchProjectFormLookups().then(data => {
            if (!mounted) return;
            setLookups(data.lookups || {});
            setClients(data.clients || []);
            setUsers(data.users || []);
        });
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchProjectById(id).then((p) => {
            if (cancelled) return;

            // Extract all experts who are in advanced stages (not leads)
            const assigned = [
                ...(Array.isArray(p?.invited_expert_ids) ? p.invited_expert_ids : []),
                ...(Array.isArray(p?.accepted_expert_ids) ? p.accepted_expert_ids : []),
                ...(Array.isArray(p?.declined_expert_ids) ? p.declined_expert_ids : []),
                ...(Array.isArray(p?.expert_scheduled) ? p.expert_scheduled : []),
                ...(Array.isArray(p?.expert_call_completed) ? p.expert_call_completed : []),
            ];
            setAssignedExpertIds(assigned);

            setForm({
                client_id: p?.client_id ? String(p.client_id) : '',
                poc_user_ids: Array.isArray(p?.poc_user_ids) ? p.poc_user_ids.map(String) : [],
                received_date: p?.received_date || '',
                project_title: p?.project_title || p?.title || '',
                project_type: p?.project_type || '',
                project_description: p?.project_description || '',
                target_companies: Array.isArray(p?.target_companies) && p.target_companies.length > 0 ? p.target_companies : [''],
                target_region: p?.target_region || '',
                target_geographies: p?.target_geographies || [],
                target_functions_titles: p?.target_functions_titles || '',
                target_functions: Array.isArray(p?.target_functions) && p.target_functions.length > 0 ? p.target_functions : [''],
                current_former_both: p?.current_former_both || 'Both',
                number_of_calls: p?.number_of_calls ?? '',
                scheduled_calls_count: p?.scheduled_calls_count ?? 0,
                completed_calls_count: p?.completed_calls_count ?? 0,
                goal_calls_count: p?.goal_calls_count ?? 0,
                project_questions: Array.isArray(p?.project_questions) && p.project_questions.length > 0 ? p.project_questions : [''],
                compliance_question_1: p?.compliance_question_1 || '',
                project_deadline: p?.project_deadline || '',
                project_created_by: p?.project_created_by || '',
                client_solution_owner_ids: Array.isArray(p?.client_solution_owner_ids) ? p.client_solution_owner_ids : [],
                sales_team_ids: Array.isArray(p?.sales_team_ids) ? p.sales_team_ids : [],
                leads_expert_ids: Array.isArray(p?.leads_expert_ids) ? p.leads_expert_ids : [],
            });
            setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [id]);

    const clientOptions = useMemo(() => (clients || []).map((c) => c.client_name), [clients]);
    const filteredUsers = useMemo(() => {
        if (!form?.client_id) return users || [];
        return (users || []).filter((u) => String(u.client_id) === String(form.client_id));
    }, [users, form?.client_id]);
    const userOptions = useMemo(() => (filteredUsers || []).map((u) => u.user_name), [filteredUsers]);
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
    const expertLabelById = useMemo(() => {
        const map = {};
        (lookups.experts_codes || []).forEach((e) => {
            map[e.id] = `${e.code} — ${e.name}`;
        });
        return map;
    }, [lookups.experts_codes]);
    const expertIdByLabel = useMemo(() => {
        const map = {};
        (lookups.experts_codes || []).forEach((e) => {
            const label = `${e.code} — ${e.name}`;
            map[label] = e.id;
        });
        return map;
    }, [lookups.experts_codes]);
    const selectedClientName = useMemo(() => clients.find((c) => String(c.client_id) === String(form?.client_id))?.client_name, [clients, form?.client_id]);
    const selectedUserNames = useMemo(() => (form?.poc_user_ids || []).map(id => users.find(u => String(u.user_id) === String(id))?.user_name).filter(Boolean), [users, form?.poc_user_ids]);

    const disabledExpertLabels = useMemo(() => {
        return (assignedExpertIds || []).map(id => expertLabelById[id]).filter(Boolean);
    }, [assignedExpertIds, expertLabelById]);

    const clientId = form?.client_id;
    const pocUserIds = form?.poc_user_ids || [];
    useEffect(() => {
        if (!clientId && pocUserIds.length === 0) return;
        if (!users || users.length === 0) return;
        const currentUsers = (users || []).filter(u => pocUserIds.includes(String(u.user_id)));
        const validUserIds = currentUsers.filter(u => String(u.client_id) === String(clientId)).map(u => String(u.user_id));
        if (validUserIds.length !== pocUserIds.length) {
            setForm((p) => ({ ...p, poc_user_ids: validUserIds }));
        }
    }, [clientId, form?.poc_user_ids, users]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form) return;
        setIsSaving(true);
        try {
            const requiredStrings = [
                'client_id',
                'received_date',
                'project_title',
                'project_type',
                'project_description',
                'target_region',
                'target_functions_titles',
                'current_former_both',
                'compliance_question_1',
                'project_deadline',
            ];
            const requiredArrays = ['poc_user_ids', 'target_geographies', 'target_functions', 'client_solution_owner_ids', 'sales_team_ids'];
            const missing = [];
            for (const key of requiredStrings) {
                if (!String(form[key] ?? '').trim()) missing.push(key);
            }
            for (const key of requiredArrays) {
                const val = form[key];
                if (!Array.isArray(val) || val.length === 0) missing.push(key);
            }
            
            // Check project questions
            if ((form.project_questions || []).some(q => !q.trim())) {
                missing.push('All project questions must be filled');
            }

            // Check target companies
            if ((form.target_companies || []).some(c => !c.trim())) {
                missing.push('All target companies must be filled');
            }

            // Check target functions
            if ((form.target_functions || []).some(f => !f.trim())) {
                missing.push('All target functions must be filled');
            }

            if (missing.length) {
                alert('Please fill all required fields: ' + missing.join(', '));
                return;
            }
            const payload = {
                ...form,
                client_id: form.client_id ? Number(form.client_id) : null,
                poc_user_ids: (form.poc_user_ids || []).map(Number),
                number_of_calls: form.number_of_calls ? Number(form.number_of_calls) : null,
                scheduled_calls_count: form.scheduled_calls_count ? Number(form.scheduled_calls_count) : 0,
                completed_calls_count: form.completed_calls_count ? Number(form.completed_calls_count) : 0,
                goal_calls_count: form.goal_calls_count ? Number(form.goal_calls_count) : 0,
                leads_expert_ids: form.leads_expert_ids || [],
            };
            await updateProject(id, payload);
            navigate('/projects');
        } finally {
            setIsSaving(false);
        }
    }

    const addQuestion = () => {
        setForm(p => ({ ...p, project_questions: [...(p.project_questions || []), ''] }));
    };

    const removeQuestion = (index) => {
        setForm(p => ({
            ...p,
            project_questions: p.project_questions.filter((_, i) => i !== index)
        }));
    };

    const updateQuestion = (index, value) => {
        const next = [...(form.project_questions || [])];
        next[index] = value;
        setForm(p => ({ ...p, project_questions: next }));
    };

    const addTargetCompany = () => {
        setForm(p => ({ ...p, target_companies: [...(p.target_companies || []), ''] }));
    };

    const removeTargetCompany = (index) => {
        setForm(p => ({
            ...p,
            target_companies: p.target_companies.filter((_, i) => i !== index)
        }));
    };

    const updateTargetCompany = (index, value) => {
        const next = [...(form.target_companies || [])];
        next[index] = value;
        setForm(p => ({ ...p, target_companies: next }));
    };

    const addTargetFunction = () => {
        setForm(p => ({ ...p, target_functions: [...(p.target_functions || []), ''] }));
    };

    const removeTargetFunction = (index) => {
        setForm(p => ({
            ...p,
            target_functions: p.target_functions.filter((_, i) => i !== index)
        }));
    };

    const updateTargetFunction = (index, value) => {
        const next = [...(form.target_functions || [])];
        next[index] = value;
        setForm(p => ({ ...p, target_functions: next }));
    };

    if (isLoading || !form) {
        return <Loader rows={8} />;
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Edit project details</h1>
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
                                <label className="form-label">User Names (PoC)</label>
                                <FilterDropdown
                                    label={selectedUserNames.length ? selectedUserNames.join(', ') : 'Select users'}
                                    options={userOptions}
                                    selected={selectedUserNames}
                                    onChange={(names) => {
                                        const ids = names.map(n => users.find(u => u.user_name === n)?.user_id).filter(Boolean).map(String);
                                        setForm((p) => ({ ...p, poc_user_ids: ids }));
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
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Leads Experts (IDs)</label>
                                <FilterDropdown
                                    label="Select experts"
                                    options={(lookups.experts_codes || []).map((e) => `${e.code} — ${e.name}`)}
                                    selected={(form.leads_expert_ids || []).map((id) => expertLabelById[id]).filter(Boolean)}
                                    disabled={disabledExpertLabels}
                                    onChange={(labels) => {
                                        const ids = labels.map((lbl) => expertIdByLabel[lbl]).filter(Boolean);
                                        setForm((p) => ({ ...p, leads_expert_ids: ids }));
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <label className="form-label" style={{ marginBottom: 0 }}>Target Companies</label>
                                    <Button type="button" variant="secondary" size="small" onClick={addTargetCompany} style={{ padding: '4px 12px', fontSize: '12px' }}>
                                        + Add Company
                                    </Button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {(form.target_companies || []).map((c, index) => (
                                        <div key={index} style={{ position: 'relative' }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                <div style={{ flex: 1 }}>
                                                    <input
                                                        className="form-input"
                                                        required
                                                        placeholder={`Target Company #${index + 1}`}
                                                        value={c}
                                                        onChange={(e) => updateTargetCompany(index, e.target.value)}
                                                    />
                                                </div>
                                                {form.target_companies.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeTargetCompany(index)}
                                                        style={{ 
                                                            background: 'none', 
                                                            border: 'none', 
                                                            color: '#ff4d4f', 
                                                            cursor: 'pointer',
                                                            padding: '8px'
                                                        }}
                                                        title="Remove company"
                                                    >
                                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                                <label className="form-label">Target Titles</label>
                                <textarea
                                    className="form-textarea"
                                    rows={2}
                                    required
                                    value={form.target_functions_titles}
                                    onChange={(e) => setForm((p) => ({ ...p, target_functions_titles: e.target.value }))}
                                />
                            </div>

                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <label className="form-label" style={{ marginBottom: 0 }}>Target Functions (Seniority)</label>
                                    <Button type="button" variant="secondary" size="small" onClick={addTargetFunction} style={{ padding: '4px 12px', fontSize: '12px' }}>
                                        + Add Function
                                    </Button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {(form.target_functions || []).map((f, index) => (
                                        <div key={index} style={{ position: 'relative' }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                <div style={{ flex: 1 }}>
                                                    <input
                                                        className="form-input"
                                                        required
                                                        placeholder={`Target Function #${index + 1}`}
                                                        value={f}
                                                        onChange={(e) => updateTargetFunction(index, e.target.value)}
                                                    />
                                                </div>
                                                {form.target_functions.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeTargetFunction(index)}
                                                        style={{ 
                                                            background: 'none', 
                                                            border: 'none', 
                                                            color: '#ff4d4f', 
                                                            cursor: 'pointer',
                                                            padding: '8px'
                                                        }}
                                                        title="Remove function"
                                                    >
                                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                            <div className="form-field">
                                <label className="form-label">Calls Scheduled (S)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    value={form.scheduled_calls_count}
                                    onChange={(e) => setForm((p) => ({ ...p, scheduled_calls_count: e.target.value }))}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Calls Completed (C)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    value={form.completed_calls_count}
                                    onChange={(e) => setForm((p) => ({ ...p, completed_calls_count: e.target.value }))}
                                />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Goal Calls (G)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    value={form.goal_calls_count}
                                    onChange={(e) => setForm((p) => ({ ...p, goal_calls_count: e.target.value }))}
                                />
                            </div>

                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <label className="form-label" style={{ marginBottom: 0 }}>Project Profile Questions</label>
                                    <Button type="button" variant="secondary" size="small" onClick={addQuestion} style={{ padding: '4px 12px', fontSize: '12px' }}>
                                        + Add Question
                                    </Button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {(form.project_questions || []).map((q, index) => (
                                        <div key={index} style={{ position: 'relative' }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <textarea
                                                        className="form-textarea"
                                                        rows={2}
                                                        required
                                                        placeholder={`Project Question #${index + 1}`}
                                                        value={q}
                                                        onChange={(e) => updateQuestion(index, e.target.value)}
                                                    />
                                                </div>
                                                {form.project_questions.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeQuestion(index)}
                                                        style={{ 
                                                            background: 'none', 
                                                            border: 'none', 
                                                            color: '#ff4d4f', 
                                                            cursor: 'pointer',
                                                            padding: '8px',
                                                            marginTop: '4px'
                                                        }}
                                                        title="Remove question"
                                                    >
                                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
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

                    <div className="form-section" style={{ border: '2px dashed #1a6e3c', borderRadius: 8, padding: '20px 24px', background: '#f0faf4' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div>
                                <h2 className="form-section__title" style={{ color: '#1a6e3c', marginBottom: 4 }}>📩 Generate Outreach Messages</h2>
                                <p style={{ fontSize: '0.82rem', color: '#555', margin: 0 }}>
                                    Optional — generate AI-powered outreach templates (Email, LinkedIn, WhatsApp) based on the updated project details.
                                    These will be saved to the project automatically.
                                </p>
                            </div>
                        </div>
                        {outreachToast && (
                            <div style={{
                                marginBottom: 16, padding: '10px 18px', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem',
                                background: outreachToast === 'success' ? '#1a6e3c' : '#b91c1c',
                                color: '#fff', display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                {outreachToast === 'success'
                                    ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Outreach templates generated and saved!
                                    </>
                                    : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Could not generate outreach. Fill in project details first.</>
                                }
                            </div>
                        )}
                        {pendingOutreach && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                {[{ key: 'email', label: '📧 Email', color: '#1a5ca8' }, { key: 'linkedin_connection', label: '🔗 LinkedIn Connection', color: '#0a66c2' }, { key: 'linkedin_inmail', label: '💼 LinkedIn InMail', color: '#004182' }, { key: 'whatsapp_sms', label: '💬 WhatsApp/SMS', color: '#25d366' }].map(({ key, label, color }) => pendingOutreach[key] ? (
                                    <div key={key} style={{ background: '#fff', border: `1px solid ${color}30`, borderRadius: 6, padding: 12 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color, marginBottom: 6 }}>{label}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#333', lineHeight: 1.55, whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'hidden' }}>{pendingOutreach[key]}</div>
                                    </div>
                                ) : null)}
                            </div>
                        )}
                        <Button
                            type="button"
                            variant="secondary"
                            loading={isGeneratingOutreach}
                            disabled={isGeneratingOutreach}
                            onClick={async () => {
                                if (!form.project_title || !form.project_description) {
                                    setOutreachToast('error');
                                    setTimeout(() => setOutreachToast(null), 3500);
                                    return;
                                }
                                setIsGeneratingOutreach(true);
                                setOutreachToast(null);
                                try {
                                    // Project already exists — use the persisting endpoint
                                    const res = await http(`/projects/${id}/generate-outreach`, {
                                        method: 'POST',
                                    });
                                    if (res?.data) {
                                        const d = res.data;
                                        setPendingOutreach({
                                            email: d.email_content,
                                            linkedin_connection: d.linkedin_content,
                                            linkedin_inmail: d.linkedin_inmail_content,
                                            whatsapp_sms: d.whatsapp_sms_content,
                                        });
                                        setOutreachToast('success');
                                        setTimeout(() => setOutreachToast(null), 5000);
                                    }
                                } catch (err) {
                                    console.error(err);
                                    setOutreachToast('error');
                                    setTimeout(() => setOutreachToast(null), 4000);
                                } finally {
                                    setIsGeneratingOutreach(false);
                                }
                            }}
                            style={{ borderColor: '#1a6e3c', color: '#1a6e3c', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                <polyline points="22,6 12,13 2,6"/>
                            </svg>
                            {isGeneratingOutreach ? 'Generating Outreach Messages…' : pendingOutreach ? 'Regenerate Outreach Messages' : 'Generate Outreach Messages'}
                        </Button>
                    </div>

                    <div className="form-actions">
                        <Button type="button" variant="secondary" onClick={() => navigate('/projects')}>
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
