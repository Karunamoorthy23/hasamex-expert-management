import Checkbox from '../ui/Checkbox';
import Badge from '../ui/Badge';
import { getInitials } from '../../utils/format';
import { EditIcon, TrashIcon, CalendarIcon, UsersIcon, BriefcaseIcon } from '../icons/Icons';
import { Link } from 'react-router-dom';

function MoreDotsIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
        </svg>
    );
}

export default function ProjectCard({ project, selected, onSelect, onDelete, onOpenStatusModal }) {
    const title = project.project_title || project.title || `Project #${project.project_id}`;
    const initials = title ? title.slice(0, 2).toUpperCase() : 'PR';

    const totalExperts = 
        (project.leads_count || 0) + 
        (project.invited_count || 0) + 
        (project.accepted_count || 0) + 
        (project.expert_scheduled_count || 0) + 
        (project.expert_call_completed_count || 0);

    return (
        <div className="expert-wide-card">
            <style>{`
                .expert-wide-card {
                    display: flex;
                    flex-direction: row;
                    background: var(--table-bg, #fff);
                    border: 1px solid var(--border-app, #e0e0e0);
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 12px;
                    gap: 16px;
                    align-items: flex-start;
                    position: relative;
                    transition: box-shadow 0.2s, background 0.2s;
                }
                .expert-wide-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                :root[data-theme="dark"] .expert-wide-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                }
                .expert-wide-avatar-wrap {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-top: 2px;
                }
                .expert-wide-avatar {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #1A5CA8 0%, #0099FF 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    font-weight: 700;
                    flex-shrink: 0;
                    letter-spacing: 1px;
                }
                .expert-wide-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .expert-wide-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .expert-wide-name {
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: var(--text-app, #000);
                    margin: 0;
                    text-decoration: none;
                }
                .expert-wide-name:hover {
                    text-decoration: underline;
                }
                .expert-wide-headline {
                    font-size: 0.9rem;
                    color: #555;
                    margin: 0 0 4px 0;
                }
                :root[data-theme="dark"] .expert-wide-headline {
                    color: #aaa;
                }
                .expert-wide-contacts {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    font-size: 0.8rem;
                    color: #555;
                    margin-bottom: 2px;
                }
                :root[data-theme="dark"] .expert-wide-contacts {
                    color: #bbb;
                }
                .expert-wide-contact-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .expert-wide-skills {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                    margin-bottom: 6px;
                }
                .expert-wide-skill-pill {
                    background: var(--sidebar-hover);
                    color: var(--text-app);
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    border: 1px solid var(--border-app);
                    cursor: pointer;
                }
                .expert-wide-skill-pill:hover {
                    background: var(--table-hover);
                }
                .expert-wide-footer {
                    display: flex;
                    gap: 16px;
                    font-size: 0.8rem;
                    color: #777;
                    align-items: center;
                }
                :root[data-theme="dark"] .expert-wide-footer {
                    color: #999;
                }
                .expert-wide-footer-item {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .expert-wide-actions {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    margin-top: 2px;
                }
                .expert-btn-danger {
                    color: #e53e3e !important;
                    border-color: #fc8181 !important;
                }
                .expert-btn-danger:hover {
                    background: #fff5f5 !important;
                }
                :root[data-theme="dark"] .expert-btn-danger:hover {
                    background: #742a2a !important;
                }
                .expert-wide-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border: 1px solid var(--border-app, #e0e0e0);
                    border-radius: 6px;
                    background: transparent;
                    color: var(--text-app, #000);
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    text-decoration: none;
                    transition: all 0.2s ease;
                }
                .expert-wide-btn:hover {
                    background: var(--table-hover, #f5f5f5);
                }
            `}</style>

            <div className="expert-wide-avatar-wrap">
                <Checkbox checked={selected} onChange={onSelect} />
                <div className="expert-wide-avatar">{initials}</div>
            </div>

            <div className="expert-wide-content">
                <div className="expert-wide-header">
                    <Link to={`/projects/${project.project_id}`} className="expert-wide-name">{title}</Link>
                    {project.client_id ? (
                        <Link to={`/clients/${project.client_id}`} style={{ textDecoration: 'none' }}>
                            <Badge variant="neutral" style={{ cursor: 'pointer' }}>{project.client_name || 'No Client'}</Badge>
                        </Link>
                    ) : (
                        <Badge variant="neutral">{project.client_name || 'No Client'}</Badge>
                    )}
                </div>

                <p className="expert-wide-headline">
                    Research Analyst: {Array.isArray(project.client_solution_owner_names) && project.client_solution_owner_names.length ? project.client_solution_owner_names.join(', ') : '—'} • Account Manager: {Array.isArray(project.sales_team_names) && project.sales_team_names.length ? project.sales_team_names.join(', ') : '—'}
                </p>

                <div className="expert-wide-contacts">
                    {project.target_region && (
                        <div className="expert-wide-contact-item">
                            <BriefcaseIcon width={14} height={14} />
                            Region: {project.target_region}
                        </div>
                    )}
                    <div className="expert-wide-contact-item">
                        <UsersIcon width={14} height={14} />
                        Total Experts: {totalExperts}
                    </div>
                </div>

                <div className="expert-wide-skills">
                    {/* Utilizing the status pills requested by user */}
                    <span onClick={() => onOpenStatusModal?.(project)} className="expert-wide-skill-pill" title="View Leads">Leads: {project.leads_count ?? 0}</span>
                    <span onClick={() => onOpenStatusModal?.(project)} className="expert-wide-skill-pill" title="View Invited">Invited: {project.invited_count ?? 0}</span>
                    <span onClick={() => onOpenStatusModal?.(project)} className="expert-wide-skill-pill" title="View Accepted">Accepted: {project.accepted_count ?? 0}</span>
                    <span onClick={() => onOpenStatusModal?.(project)} className="expert-wide-skill-pill" title="View Scheduled">Scheduled: {(project.expert_scheduled_count ?? 0)}/{(project.scheduled_calls_count ?? 0)}</span>
                    <span onClick={() => onOpenStatusModal?.(project)} className="expert-wide-skill-pill" title="View Completed">Completed: {(project.expert_call_completed_count ?? 0)}/{(project.completed_calls_count ?? 0)}</span>
                </div>

                <div className="expert-wide-footer">
                    <div className="expert-wide-footer-item">
                        <CalendarIcon width={14} height={14} />
                        Deadline: {project.project_deadline ? new Date(project.project_deadline).toLocaleDateString() : 'N/A'}
                    </div>
                </div>
            </div>

            <div className="expert-wide-actions">
                <Link to={`/projects/${project.project_id}/edit`} className="expert-wide-btn">
                    <EditIcon width={14} height={14} /> Edit
                </Link>
                <button type="button" onClick={() => onDelete(project)} className="expert-wide-btn expert-btn-danger">
                    <TrashIcon width={14} height={14} /> Delete
                </button>
            </div>
        </div>
    );
}
