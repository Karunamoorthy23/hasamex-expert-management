import { useMemo, useState } from 'react';
import { cn } from '../../utils/cn';
import { Link } from 'react-router-dom';
import Checkbox from '../ui/Checkbox';
import { EditIcon, TrashIcon } from '../icons/Icons';

function statusBadgeClass(status) {
    if (!status) return 'badge badge-outline-theme';
    const val = String(status).toLowerCase();
    if (val === 'active') return 'badge badge-active';
    if (val === 'planning') return 'badge badge-planning';
    return 'badge badge-outline-theme';
}

export default function ClientsTable({
    clients = [],
    usersById = {},
    projectsByClientId = {},
    usersByClientId = {},
    selectedIds,
    onSelectClient,
    onSelectAll,
    allSelected,
    onDeleteClient,
}) {
    const [expandedClientIds, setExpandedClientIds] = useState(() => new Set());
    const toggleExpanded = (clientId) => {
        setExpandedClientIds((prev) => {
            const next = new Set(prev);
            if (next.has(clientId)) next.delete(clientId);
            else next.add(clientId);
            return next;
        });
    };
    const compactCellStyle = { padding: '6px 10px' };
    const rows = useMemo(() => {
        return clients.map((c) => {
            const primary = c.primary_contact_user_id ? usersById[c.primary_contact_user_id] : null;
            const projects = projectsByClientId[c.client_id] || [];
            return {
                ...c,
                primaryContactName: primary?.user_name || '—',
                projectCount: projects.length,
                projects,
            };
        });
    }, [clients, usersById, projectsByClientId]);

    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        <th className="col-check" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                                id="selectAllClients"
                                checked={allSelected}
                                onChange={onSelectAll}
                                ariaLabel="Select all clients"
                            />
                        </th>
                        <th>Client Name</th>
                        <th>Client Type</th>
                        <th>Country</th>
                        <th>Office Locations</th>
                        <th>Website</th>
                        <th>LinkedIn</th>
                        <th>Primary Contact</th>
                        <th>Client Manager (Internal)</th>
                        <th>Billing Currency</th>
                        <th>Payment Terms</th>
                        <th>Invoicing Email</th>
                        <th>Client Status</th>
                        <th>Engagement Start</th>
                        <th>Users</th>
                        <th>Client Solution</th>
                        <th>Sales Team</th>
                        <th>Project Count</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const expanded = expandedClientIds.has(row.client_id);
                        const clientUsers = usersByClientId[row.client_id] || [];
                        return (
                            <>
                                <tr
                                    key={row.client_id}
                                    className={cn('client-row', expanded && 'client-row--expanded')}
                                    onClick={() => toggleExpanded(row.client_id)}
                                >
                                    <td
                                        className="col-check"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                        }}
                                    >
                                        <Checkbox checked={selectedIds?.has(row.client_id) || false} onChange={() => onSelectClient?.(row.client_id)} ariaLabel={`Select ${row.client_name}`} />
                                    </td>
                                    <td>
                                        <div className="client-name-cell">
                                            <i className={cn('fa-solid fa-chevron-right client-expand-icon', expanded && 'client-expand-icon--open')} aria-hidden="true" />
                                            <div>
                                                <div className="client-name">
                                                    <Link to={`/clients/${row.client_id}`} onClick={(e) => e.stopPropagation()}>{row.client_name}</Link>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{row.client_type || row.type || '—'}</td>
                                    <td>{row.country || row.location || '—'}</td>
                                    <td>{row.office_locations || '—'}</td>
                                    <td>
                                        {row.website ? (
                                            <a href={row.website.startsWith('http') ? row.website : `https://${row.website}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                                {row.website}
                                            </a>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td>
                                        {row.linkedin_url ? (
                                            <a href={row.linkedin_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                                LinkedIn
                                            </a>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td>{row.primaryContactName}</td>
                                    <td>{row.client_manager_internal || '—'}</td>
                                    <td>{row.billing_currency || '—'}</td>
                                    <td>{row.payment_terms || '—'}</td>
                                    <td>{row.invoicing_email || '—'}</td>
                                    <td>
                                        <span className={cn(statusBadgeClass(row.client_status || row.status))}>
                                            {row.client_status || row.status || '—'}
                                        </span>
                                    </td>
                                    <td>{row.engagement_start_date ? new Date(row.engagement_start_date).toLocaleDateString() : '—'}</td>
                                    <td>{row.users || '—'}</td>
                                    <td>
                                        {Array.isArray(row.client_solution_owner_names) && row.client_solution_owner_names.length
                                            ? row.client_solution_owner_names.join(', ')
                                            : '—'}
                                    </td>
                                    <td>
                                        {Array.isArray(row.sales_team_names) && row.sales_team_names.length
                                            ? row.sales_team_names.join(', ')
                                            : '—'}
                                    </td>
                                    <td>
                                        <span className="badge badge-outline-theme">{row.projectCount} projects</span>
                                    </td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                            <Link to={`/clients/${row.client_id}/edit`} className="action-btn" title="Edit" onClick={(e) => e.stopPropagation()}>
                                                <EditIcon />
                                            </Link>
                                            <button
                                                type="button"
                                                className="action-btn action-btn--danger"
                                                title="Delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteClient?.(row);
                                                }}
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                <tr
                                    key={`${row.client_id}-users`}
                                    className="client-nested-row"
                                    style={{ display: expanded ? undefined : 'none' }}
                                >
                                    <td colSpan={19} className="p-0">
                                        <div className="client-nested-wrapper" style={{ padding: '8px 12px' }}>
                                            <h4 className="client-nested-title" style={{ marginBottom: 8 }}>Users for {row.client_name}</h4>
                                            {clientUsers.length === 0 ? (
                                                <p className="empty-state__text">No users found for this client.</p>
                                            ) : (
                                                <div className="client-details-card" style={{ padding: 0, margin: 0 }}>
                                                    <table className="data-table">
                                                        <thead>
                                                            <tr>
                                                                <th style={compactCellStyle}>User</th>
                                                                <th style={compactCellStyle}>Designation</th>
                                                                <th style={compactCellStyle}>Email</th>
                                                                <th>Phone</th>
                                                                <th>Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {clientUsers.map((u) => (
                                                                <tr key={u.user_id}>
                                                                    <td style={compactCellStyle}>
                                                                        <Link to={`/users/${u.user_id}`} onClick={(e) => e.stopPropagation()}>
                                                                            {u.user_name || '—'}
                                                                        </Link>
                                                                    </td>
                                                                    <td style={compactCellStyle}>{u.designation_title || '—'}</td>
                                                                    <td style={compactCellStyle}>{u.email || '—'}</td>
                                                                    <td style={compactCellStyle}>{u.phone || '—'}</td>
                                                                    <td style={compactCellStyle}>
                                                                        <span className={cn(statusBadgeClass(u.status))}>{u.status || '—'}</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
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

