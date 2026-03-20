import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchUserById } from '../../api/users';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';

function DetailItem({ label, value, full }) {
    return (
        <div className="form-field" style={full ? { gridColumn: 'span 2' } : undefined}>
            <label className="form-label" style={{ fontWeight: 700 }}>{label} :</label>
            <div className="form-value">{value ?? '—'}</div>
        </div>
    );
}

export default function UserDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchUserById(id).then((u) => {
            if (cancelled) return;
            setUser(u || null);
            setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [id]);

    const nameDisplay = useMemo(() => {
        if (!user) return 'User';
        return user.full_name || user.user_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
    }, [user]);

    if (isLoading || !user) return <Loader rows={8} />;

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">{nameDisplay}</h1>
                <p className="page-subtitle">User details overview</p>
            </div>

            <div className="card">
                <div className="form-section">
                    <h2 className="form-section__title">User</h2>
                    <div className="form-grid">
                        <DetailItem label="User Name" value={user.user_name} />
                        <DetailItem label="User ID" value={user.user_code} />
                        <DetailItem label="First Name" value={user.first_name} />
                        <DetailItem label="Last Name" value={user.last_name} />
                        <DetailItem label="Designation / Title" value={user.designation_title} />
                        <DetailItem label="Seniority" value={user.seniority} />
                        <DetailItem label="Status" value={user.status} />
                        <DetailItem label="User Manager" value={user.user_manager} />
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section__title">Client</h2>
                    <div className="form-grid">
                        <DetailItem label="Client Name" value={user.client_name} />
                        <DetailItem label="Client Type" value={user.client_type} />
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section__title">Contact</h2>
                    <div className="form-grid">
                        <DetailItem label="Email" value={user.email} />
                        <DetailItem label="Phone" value={user.phone} />
                        <DetailItem
                            label="LinkedIn"
                            value={
                                user.linkedin_url ? (
                                    <a href={user.linkedin_url} target="_blank" rel="noreferrer">
                                        LinkedIn
                                    </a>
                                ) : '—'
                            }
                        />
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section__title">Preferences</h2>
                    <div className="form-grid">
                        <DetailItem label="Location" value={user.location} />
                        <DetailItem label="Preferred Contact" value={user.preferred_contact_method} />
                        <DetailItem label="Time Zone" value={user.time_zone} />
                        <DetailItem label="Avg Calls / Month" value={user.avg_calls_per_month ?? '—'} />
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section__title">Solution & Team</h2>
                    <div className="form-grid">
                        <DetailItem
                            label="Client Solution"
                            value={
                                Array.isArray(user.client_solution_owner_names) && user.client_solution_owner_names.length
                                    ? user.client_solution_owner_names.join(', ')
                                    : '—'
                            }
                        />
                        <DetailItem
                            label="Sales Team"
                            value={
                                Array.isArray(user.sales_team_names) && user.sales_team_names.length
                                    ? user.sales_team_names.join(', ')
                                    : '—'
                            }
                        />
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section__title">Notes</h2>
                    <div className="form-grid">
                        <DetailItem label="Notes" value={user.notes} full />
                        <DetailItem label="AI-Generated BIO" value={user.ai_generated_bio} full />
                    </div>
                </div>

                <div className="form-actions">
                    <Button type="button" variant="secondary" onClick={() => navigate('/users')}>
                        Back to Users
                    </Button>
                    <Button type="button" variant="primary" onClick={() => navigate(`/users/${user.user_id}/edit`)}>
                        Edit User
                    </Button>
                </div>
            </div>
        </>
    );
}
