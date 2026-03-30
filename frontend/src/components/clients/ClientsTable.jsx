import { useMemo, useState } from 'react';
import { cn } from '../../utils/cn';
import { Link } from 'react-router-dom';
import Checkbox from '../ui/Checkbox';
import { EditIcon, TrashIcon, LinkIcon } from '../icons/Icons';

function statusBadgeClass(status) {
    if (!status) return 'badge badge-outline-theme';
    const val = String(status).toLowerCase();
    if (val === 'active') return 'badge badge-active';
    if (val === 'planning') return 'badge badge-planning';
    return 'badge badge-outline-theme';
}

export default function ClientsTable({
    clients = [],
    selectedIds,
    onSelectClient,
    onSelectAll,
    allSelected,
    onDeleteClient,
    onOpenRules,
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
        return clients.map((c) => ({
            ...c,
            primaryContactName: '—',
            projectCount: c.project_count ?? 0,
            engagementCount: c.engagement_count ?? 0,
            userCount: c.user_count ?? 0,
        }));
    }, [clients]);

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
                        <th className="col-name">Client Name</th>
                        <th className="col-compact">Client Type</th>
                        <th className="col-region">Country</th>
                        <th className="col-id">Website</th>
                        <th className="col-id">LinkedIn</th>
                        <th className="col-compact">Client Manager (Internal)</th>
                        <th className="col-id">Billing Currency</th>
                        <th className="col-status">Client Status</th>
                        <th className="col-solution">Research Analyst</th>
                        <th className="col-solution">Account Manager</th>
                        <th className="col-id">Project Count</th>
                        <th className="col-id">Engagements</th>
                        <th className="col-id">Service Rules</th>
                        <th className="col-actions">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const expanded = expandedClientIds.has(row.client_id);
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
                                    <td className="col-name">
                                        <div className="client-name-cell">
                                            <i className={cn('fa-solid fa-chevron-right client-expand-icon', expanded && 'client-expand-icon--open')} aria-hidden="true" />
                                            <div>
                                                <div className="client-name">
                                                    <Link to={`/clients/${row.client_id}`} onClick={(e) => e.stopPropagation()}>{row.client_name}</Link>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="col-compact">{row.client_type || row.type || '—'}</td>
                                    <td className="col-region">{row.country || row.location || '—'}</td>
                                    <td className="col-id">
                                        {row.website ? (
                                            <a
                                                href={row.website.startsWith('http') ? row.website : `https://${row.website}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="action-btn"
                                                title="Website"
                                            >
                                                <LinkIcon /> Website
                                            </a>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td className="col-id">
                                        {row.linkedin_url ? (
                                            <a href={row.linkedin_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                                LinkedIn
                                            </a>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td className="col-compact">{row.client_manager_internal || '—'}</td>
                                    <td className="col-id">{row.billing_currency || '—'}</td>
                                    <td className="col-status">
                                        <span className={cn(statusBadgeClass(row.client_status || row.status))}>
                                            {row.client_status || row.status || '—'}
                                        </span>
                                    </td>
                                    <td className="col-solution">
                                        {Array.isArray(row.client_solution_owner_names) && row.client_solution_owner_names.length
                                            ? row.client_solution_owner_names.join(', ')
                                            : '—'}
                                    </td>
                                    <td className="col-solution">
                                        {Array.isArray(row.sales_team_names) && row.sales_team_names.length
                                            ? row.sales_team_names.join(', ')
                                            : '—'}
                                    </td>
                                    <td className="col-id">
                                        <span className="badge badge-outline-theme">{row.projectCount} projects</span>
                                    </td>
                                    <td className="col-id">
                                        <span className="badge badge-outline-theme">{row.engagementCount}</span>
                                    </td>
                                    <td className="col-id">
                                        {row.service_rules ? (
                                            <a
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    onOpenRules?.(row.service_rules);
                                                }}
                                            >
                                                Service Rules
                                            </a>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td className="col-actions" onClick={(e) => e.stopPropagation()}>
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
                            </>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
