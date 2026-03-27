import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import Checkbox from '../ui/Checkbox';
import { EditIcon, TrashIcon } from '../icons/Icons';

export default function ProjectsTable({
    projects = [],
    selectedIds,
    onSelectProject,
    onSelectAll,
    allSelected,
    onDeleteProject,
    onOpenStatusModal,
}) {
    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        <th className="col-check" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                                id="selectAllProjects"
                                checked={allSelected}
                                onChange={onSelectAll}
                                ariaLabel="Select all projects"
                            />
                        </th>
                        <th className="col-title">Project Title</th>
                        <th className="col-id">Received Date</th>
                        <th className="col-name">Client</th>
                        <th className="col-compact">User (PoC)</th>
                        <th className="col-compact">Project Type</th>
                        <th className="col-region">Target Region</th>
                        <th className="col-solution">Research Analyst</th>
                        <th className="col-solution">Account Manager</th>
                        <th className="col-id" title="Leads">L</th>
                        <th className="col-id" title="Invited">I</th>
                        <th className="col-id" title="Accepted">A</th>
                        <th className="col-id" title="Declined">D</th>
                        <th className="col-id" title="Scheduled">S</th>
                        <th className="col-id" title="Completed">C</th>
                        <th className="col-id" title="Goal">G</th>
                        <th className="col-id" title="Progress">P (%)</th>
                        <th className="col-id">Deadline</th>
                        <th className="col-compact">Last Modified</th>
                        <th className="col-actions">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {projects.map((p) => (
                        <tr key={p.project_id} className="project-row">
                            <td
                                className="col-check"
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                            >
                                <Checkbox checked={selectedIds?.has(p.project_id) || false} onChange={() => onSelectProject?.(p.project_id)} />
                            </td>
                            <td className="col-title">
                                <Link to={`/projects/${p.project_id}`}>{p.project_title || p.title || '—'}</Link>
                            </td>
                            <td className="col-id">{p.received_date ? new Date(p.received_date).toLocaleDateString() : '—'}</td>
                            <td className="col-name">
                                {p.client_id ? (
                                    <Link to={`/clients/${p.client_id}`}>{p.client_name || '—'}</Link>
                                ) : (
                                    p.client_name || '—'
                                )}
                            </td>
                            <td className="col-compact">
                                {p.poc_user_id ? (
                                    <Link to={`/users/${p.poc_user_id}`}>{p.poc_user_name || '—'}</Link>
                                ) : (
                                    p.poc_user_name || '—'
                                )}
                            </td>
                            <td className="col-compact">{p.project_type || '—'}</td>
                            <td className="col-region">{p.target_region || '—'}</td>
                            <td className="col-solution">
                                {Array.isArray(p.client_solution_owner_names) && p.client_solution_owner_names.length
                                    ? p.client_solution_owner_names.join(', ')
                                    : '—'}
                            </td>
                            <td className="col-solution">
                                {Array.isArray(p.sales_team_names) && p.sales_team_names.length
                                    ? p.sales_team_names.join(', ')
                                    : '—'}
                            </td>
                            <td className="col-id">
                                <button
                                    type="button"
                                    className="link-btn"
                                    onClick={() => onOpenStatusModal?.(p)}
                                    title="View Leads"
                                >
                                    {p.leads_count ?? 0}
                                </button>
                            </td>
                            <td className="col-id">
                                <button
                                    type="button"
                                    className="link-btn"
                                    onClick={() => onOpenStatusModal?.(p)}
                                    title="View Invited"
                                >
                                    {p.invited_count ?? 0}
                                </button>
                            </td>
                            <td className="col-id">
                                <button
                                    type="button"
                                    className="link-btn"
                                    onClick={() => onOpenStatusModal?.(p)}
                                    title="View Accepted"
                                >
                                    {p.accepted_count ?? 0}
                                </button>
                            </td>
                            <td className="col-id">
                                <button
                                    type="button"
                                    className="link-btn"
                                    onClick={() => onOpenStatusModal?.(p)}
                                    title="View Declined"
                                >
                                    {p.declined_count ?? 0}
                                </button>
                            </td>
                            <td className="col-id">
                                <button
                                    type="button"
                                    className="link-btn"
                                    onClick={() => onOpenStatusModal?.(p)}
                                    title="View Scheduled"
                                >
                                    {(p.expert_scheduled_count ?? 0)}/{p.scheduled_calls_count ?? 0}
                                </button>
                            </td>
                            <td className="col-id">
                                <button
                                    type="button"
                                    className="link-btn"
                                    onClick={() => onOpenStatusModal?.(p)}
                                    title="View Completed"
                                >
                                    {(p.expert_call_completed_count ?? 0)}/{p.completed_calls_count ?? 0}
                                </button>
                            </td>
                            <td className="col-id">{p.goal_calls_count ?? 0}</td>
                            <td className="col-id">{typeof p.progress_percent === 'number' ? p.progress_percent.toFixed(2) : '0.00'}</td>
                            <td className="col-id">{p.project_deadline ? new Date(p.project_deadline).toLocaleDateString() : '—'}</td>
                            <td className="col-compact">{p.last_modified_time ? new Date(p.last_modified_time).toLocaleString() : '—'}</td>
                            <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                    <Link to={`/projects/${p.project_id}/edit`} className="action-btn" title="Edit">
                                        <EditIcon />
                                    </Link>
                                    <button
                                        type="button"
                                        className="action-btn action-btn--danger"
                                        title="Delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteProject?.(p);
                                        }}
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
