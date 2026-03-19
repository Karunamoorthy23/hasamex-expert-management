import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchProjectById } from '../../api/projects';
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

export default function ProjectDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [project, setProject] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchProjectById(id).then((p) => {
            if (cancelled) return;
            setProject(p || null);
            setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [id]);

    const receivedDate = useMemo(
        () => (project?.received_date ? new Date(project.received_date).toLocaleDateString() : '—'),
        [project?.received_date]
    );
    const deadlineDate = useMemo(
        () => (project?.project_deadline ? new Date(project.project_deadline).toLocaleDateString() : '—'),
        [project?.project_deadline]
    );
    const lastModified = useMemo(
        () => (project?.last_modified_time ? new Date(project.last_modified_time).toLocaleString() : '—'),
        [project?.last_modified_time]
    );

    if (isLoading || !project) return <Loader rows={8} />;

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">{project.project_title || project.title || 'Project'}</h1>
                <p className="page-subtitle">Project details overview</p>
            </div>

            <div className="card">
                <div className="form-section">
                    <h2 className="form-section__title">Core</h2>
                    <div className="form-grid">
                        <DetailItem label="Project Title" value={project.project_title || project.title} />
                        <DetailItem label="Status" value={project.status} />
                        <DetailItem label="Project Type" value={project.project_type} />
                        <DetailItem label="Sector" value={project.sector} />
                        <DetailItem label="Client ID" value={project.client_id} />
                        <DetailItem label="User (PoC)" value={project.poc_user_name} />
                        <DetailItem label="Received Date" value={receivedDate} />
                        <DetailItem label="Project Deadline" value={deadlineDate} />
                        <DetailItem label="Last Modified" value={lastModified} />
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section__title">Solution & Team</h2>
                    <div className="form-grid">
                        <DetailItem
                            label="Client Solution"
                            value={
                                Array.isArray(project.client_solution_owner_names) && project.client_solution_owner_names.length
                                    ? project.client_solution_owner_names.join(', ')
                                    : '—'
                            }
                        />
                        <DetailItem
                            label="Sales Team"
                            value={
                                Array.isArray(project.sales_team_names) && project.sales_team_names.length
                                    ? project.sales_team_names.join(', ')
                                    : '—'
                            }
                        />
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section__title">Targets</h2>
                    <div className="form-grid">
                        <DetailItem label="Target Region" value={project.target_region} />
                        <DetailItem
                            label="Target Geographies"
                            value={(project.target_geographies || []).length ? (project.target_geographies || []).join(', ') : '—'}
                            full
                        />
                        <DetailItem label="Target Companies" value={project.target_companies} full />
                        <DetailItem label="Target Functions / Titles" value={project.target_functions_titles} full />
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section__title">Call Setup</h2>
                    <div className="form-grid">
                        <DetailItem label="Current / Former / Both" value={project.current_former_both} />
                        <DetailItem label="Number of Calls" value={project.number_of_calls ?? '—'} />
                        <DetailItem label="Profile Question 1" value={project.profile_question_1} full />
                        <DetailItem label="Profile Question 2" value={project.profile_question_2} full />
                        <DetailItem label="Profile Question 3" value={project.profile_question_3} full />
                        <DetailItem label="Compliance Question 1" value={project.compliance_question_1} full />
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="form-section__title">Notes</h2>
                    <div className="form-grid">
                        <DetailItem label="Project Description" value={project.project_description} full />
                        <DetailItem label="Project Created By" value={project.project_created_by} />
                        <DetailItem label="Created At" value={project.created_at ? new Date(project.created_at).toLocaleString() : '—'} />
                        <DetailItem label="Updated At" value={project.updated_at ? new Date(project.updated_at).toLocaleString() : '—'} />
                    </div>
                </div>

                <div className="form-actions">
                    <Button type="button" variant="secondary" onClick={() => navigate('/projects')}>
                        Back to Projects
                    </Button>
                    <Button type="button" variant="primary" onClick={() => navigate(`/projects/${project.project_id}/edit`)}>
                        Edit Project
                    </Button>
                </div>
            </div>
        </>
    );
}
