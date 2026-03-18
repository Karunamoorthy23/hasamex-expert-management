import { useState } from 'react';
import { cn } from '../../utils/cn';
import { Link } from 'react-router-dom';
import Checkbox from '../ui/Checkbox';
import { EditIcon, TrashIcon } from '../icons/Icons';

function statusBadgeClass(status) {
    if (!status) return 'badge badge-outline-theme';
    const val = String(status).toLowerCase();
    if (val === 'active') return 'badge badge-active';
    if (val === 'planning') return 'badge badge-planning';
    if (val === 'dormant') return 'badge badge-outline-theme';
    return 'badge badge-outline-theme';
}

export default function UsersTable({
    users = [],
    selectedIds,
    onSelectUser,
    onSelectAll,
    allSelected,
    onDeleteUser,
}) {
    const [expandedUserIds, setExpandedUserIds] = useState(() => new Set());

    const toggleExpanded = (userId) => {
        setExpandedUserIds((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
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
                                id="selectAllUsers"
                                checked={allSelected}
                                onChange={onSelectAll}
                                ariaLabel="Select all users"
                            />
                        </th>
                        <th>User</th>
                        <th>Client Name</th>
                        <th>Client Type</th>
                        <th>Designation / Title</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Seniority</th>
                        <th>LinkedIn</th>
                        <th>Location</th>
                        <th>Preferred Contact</th>
                        <th>Time Zone</th>
                        <th>Avg Calls / Month</th>
                        <th>Status</th>
                        <th>User Manager</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => {
                        const expanded = expandedUserIds.has(u.user_id);
                        const displayName = u.full_name || u.user_name || '—';
                        return (
                            <>
                                <tr
                                    key={u.user_id}
                                    className={cn('user-row', expanded && 'user-row--expanded')}
                                    onClick={() => toggleExpanded(u.user_id)}
                                >
                                    <td
                                        className="col-check"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                        }}
                                    >
                                        <Checkbox checked={selectedIds?.has(u.user_id) || false} onChange={() => onSelectUser?.(u.user_id)} />
                                    </td>
                                    <td>
                                        <div className="user-name-cell">
                                            <i
                                                className={cn(
                                                    'fa-solid fa-chevron-right user-expand-icon',
                                                    expanded && 'user-expand-icon--open'
                                                )}
                                                aria-hidden="true"
                                            />
                                            <div>
                                                <div className="user-name">
                                                    {displayName}
                                                    {u.user_code ? (
                                                        <span className="user-code">({u.user_code})</span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{u.client_name || '—'}</td>
                                    <td>{u.client_type || '—'}</td>
                                    <td>{u.designation_title || '—'}</td>
                                    <td>{u.email || '—'}</td>
                                    <td>{u.phone || '—'}</td>
                                    <td>{u.seniority || '—'}</td>
                                    <td>
                                        {u.linkedin_url ? (
                                            <a href={u.linkedin_url} target="_blank" rel="noreferrer">
                                                LinkedIn
                                            </a>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td>{u.location || '—'}</td>
                                    <td>{u.preferred_contact_method || '—'}</td>
                                    <td>{u.time_zone || '—'}</td>
                                    <td>{u.avg_calls_per_month ?? '—'}</td>
                                    <td>
                                        <span className={cn(statusBadgeClass(u.status))}>{u.status || '—'}</span>
                                    </td>
                                    <td>{u.user_manager || '—'}</td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                            <Link to={`/users/${u.user_id}/edit`} className="action-btn" title="Edit">
                                                <EditIcon />
                                            </Link>
                                            <button
                                                type="button"
                                                className="action-btn action-btn--danger"
                                                title="Delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteUser?.(u);
                                                }}
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                <tr
                                    key={`${u.user_id}-expanded`}
                                    className="user-nested-row"
                                    style={{ display: expanded ? undefined : 'none' }}
                                >
                                    <td colSpan={16} className="p-0">
                                        <div className="user-nested-wrapper">
                                            <h4 className="user-nested-title">Details</h4>
                                            <div className="user-details-card">
                                                <ul className="user-details-list">
                                                    <UserDetail label="Notes" value={u.notes} />
                                                    <UserDetail label="AI-Generated BIO" value={u.ai_generated_bio} />
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

function UserDetail({ label, value }) {
    return (
        <li className="user-details-item">
            <div className="user-details-item__label">{label}</div>
            <div className="user-details-item__value">{value ? String(value) : '—'}</div>
        </li>
    );
}

