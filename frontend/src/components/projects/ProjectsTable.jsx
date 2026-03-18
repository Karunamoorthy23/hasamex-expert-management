import { useState } from 'react';
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
}) {
    const [expandedIds, setExpandedIds] = useState(() => new Set());

    const toggleExpanded = (projectId) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(projectId)) next.delete(projectId);
            else next.add(projectId);
            return next;
        });
    };

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
                        <th />
                        <th>Received Date</th>
                        <th>Client</th>
                        <th>User (PoC)</th>
                        <th>Project Title</th>
                        <th>Project Type</th>
                        <th>Target Region</th>
                        <th>Deadline</th>
                        <th>Last Modified</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {projects.map((p) => {
                        const expanded = expandedIds.has(p.project_id);
                        return (
                            <>
                                <tr
                                    key={p.project_id}
                                    className={cn('project-row', expanded && 'project-row--expanded')}
                                    onClick={() => toggleExpanded(p.project_id)}
                                >
                                    <td
                                        className="col-check"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                        }}
                                    >
                                        <Checkbox checked={selectedIds?.has(p.project_id) || false} onChange={() => onSelectProject?.(p.project_id)} />
                                    </td>
                                    <td className="col-check">
                                        <i
                                            className={cn(
                                                'fa-solid fa-chevron-right project-expand-icon',
                                                expanded && 'project-expand-icon--open'
                                            )}
                                            aria-hidden="true"
                                        />
                                    </td>
                                    <td>{p.received_date ? new Date(p.received_date).toLocaleDateString() : '—'}</td>
                                    <td>{p.client_name || '—'}</td>
                                    <td>{p.poc_user_name || '—'}</td>
                                    <td>{p.project_title || p.title || '—'}</td>
                                    <td>{p.project_type || '—'}</td>
                                    <td>{p.target_region || '—'}</td>
                                    <td>{p.project_deadline ? new Date(p.project_deadline).toLocaleDateString() : '—'}</td>
                                    <td>{p.last_modified_time ? new Date(p.last_modified_time).toLocaleString() : '—'}</td>
                                    <td onClick={(e) => e.stopPropagation()}>
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

                                <tr
                                    key={`${p.project_id}-expanded`}
                                    className="project-nested-row"
                                    style={{ display: expanded ? undefined : 'none' }}
                                >
                                    <td colSpan={11} className="p-0">
                                        <div className="project-nested-wrapper">
                                            <h4 className="project-nested-title">Project Details</h4>
                                            <div className="project-details-card">
                                                <ul className="project-details-list">
                                                    <Detail label="Project Description" value={p.project_description} />
                                                    <Detail label="Target Companies" value={p.target_companies} />
                                                    <Detail
                                                        label="Target Geographies"
                                                        value={(p.target_geographies || []).join(', ')}
                                                    />
                                                    <Detail label="Target Functions / Titles" value={p.target_functions_titles} />
                                                    <Detail label="Current / Former / Both" value={p.current_former_both} />
                                                    <Detail label="Number of Calls" value={p.number_of_calls ?? '—'} />
                                                    <Detail label="Profile Question 1" value={p.profile_question_1} />
                                                    <Detail label="Profile Question 2" value={p.profile_question_2} />
                                                    <Detail label="Profile Question 3" value={p.profile_question_3} />
                                                    <Detail label="Compliance Question 1" value={p.compliance_question_1} />
                                                    <Detail label="Project Created By" value={p.project_created_by} />
                                                </ul>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function Detail({ label, value }) {
    return (
        <li className="project-details-item">
            <div className="project-details-item__label">{label}</div>
            <div className="project-details-item__value">{value ? String(value) : '—'}</div>
        </li>
    );
}

