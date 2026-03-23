import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchEmployees, fetchEmployeeById, updateEmployee } from '../../api/employees';
import FilterDropdown from '../../components/experts/FilterDropdown';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';

export default function EmployeeEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [emps, setEmps] = useState([]);
    const [form, setForm] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchEmployees({ page: 1, limit: 1000, search: '' }).then((r) => setEmps(r.data || []));
        setIsLoading(true);
        fetchEmployeeById(id).then((e) => {
            setForm({
                first_name: e?.first_name || '',
                last_name: e?.last_name || '',
                email: e?.email || '',
                title: e?.title || '',
                role: e?.role || '',
                pan_number: e?.pan_number || '',
                aadhar_number: e?.aadhar_number || '',
                date_of_joining: e?.date_of_joining || '',
                linkedin_url: e?.linkedin_url || '',
                mobile: e?.mobile || '',
                reporting_manager_id: e?.reporting_manager_id ?? null,
            });
            setIsLoading(false);
        });
    }, [id]);

    const managerOptions = useMemo(() => (emps || []).map((u) => (u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.username)), [emps]);
    const managerIdByName = useMemo(() => {
        const map = {};
        (emps || []).forEach((u) => {
            const name = (u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.username;
            map[name] = u.id;
        });
        return map;
    }, [emps]);
    const selectedManager = useMemo(() => {
        const match = (emps || []).find((u) => u.id === form?.reporting_manager_id);
        return match ? ((match.first_name || match.last_name) ? `${match.first_name || ''} ${match.last_name || ''}`.trim() : match.username) : null;
    }, [emps, form?.reporting_manager_id]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form) return;
        setIsSaving(true);
        try {
            await updateEmployee(id, { ...form });
            navigate('/employees');
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading || !form) return <Loader rows={8} />;

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Edit Employee</h1>
                <p className="page-subtitle">Update employee details</p>
            </div>
            <div className="card">
                <form className="expert-form" onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h2 className="form-section__title">Basic</h2>
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
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Role</label>
                                <input className="form-input" required value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Title</label>
                                <input className="form-input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">LinkedIn URL</label>
                                <input className="form-input" type="url" value={form.linkedin_url} onChange={(e) => setForm((p) => ({ ...p, linkedin_url: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Mobile</label>
                                <input className="form-input" value={form.mobile} onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">PAN Number</label>
                                <input className="form-input" value={form.pan_number} onChange={(e) => setForm((p) => ({ ...p, pan_number: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Aadhar Number</label>
                                <input className="form-input" value={form.aadhar_number} onChange={(e) => setForm((p) => ({ ...p, aadhar_number: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Date of Joining</label>
                                <input className="form-input" type="date" value={form.date_of_joining} onChange={(e) => setForm((p) => ({ ...p, date_of_joining: e.target.value }))} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Reporting Manager</label>
                                <FilterDropdown
                                    label={selectedManager || 'Select manager'}
                                    options={managerOptions}
                                    selected={selectedManager ? [selectedManager] : []}
                                    onChange={(names) => {
                                        const id = managerIdByName[names[0]] || null;
                                        setForm((p) => ({ ...p, reporting_manager_id: id }));
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="form-actions">
                        <Button type="button" variant="secondary" onClick={() => navigate('/employees')}>
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
