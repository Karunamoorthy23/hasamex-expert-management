import { useMemo, useState } from 'react';
import ClientProjectsTable from './ClientProjectsTable';
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
    selectedIds,
    onSelectClient,
    onSelectAll,
    allSelected,
    onDeleteClient,
}) {
    const [expandedClientIds, setExpandedClientIds] = useState(() => new Set());

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

    const toggleExpanded = (clientId) => {
        setExpandedClientIds((prev) => {
            const next = new Set(prev);
            if (next.has(clientId)) next.delete(clientId);
            else next.add(clientId);
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
                        <th>Project Count</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const expanded = expandedClientIds.has(row.client_id);
                        return (
                            <FragmentRows
                                key={row.client_id}
                                row={row}
                                expanded={expanded}
                                onToggle={() => toggleExpanded(row.client_id)}
                                selected={selectedIds?.has(row.client_id) || false}
                                onSelect={() => onSelectClient?.(row.client_id)}
                                onDelete={() => onDeleteClient?.(row)}
                            />
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function FragmentRows({ row, expanded, onToggle, selected, onSelect, onDelete }) {
    return (
        <>
            <tr className={cn('client-row', expanded && 'client-row--expanded')} onClick={onToggle}>
                <td
                    className="col-check"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    <Checkbox checked={selected} onChange={onSelect} ariaLabel={`Select ${row.client_name}`} />
                </td>
                <td>
                    <div className="client-name-cell">
                        <i className={cn('fa-solid fa-chevron-right client-expand-icon', expanded && 'client-expand-icon--open')} aria-hidden="true" />
                        <div>
                            <div className="client-name">{row.client_name}</div>
                        </div>
                    </div>
                </td>
                <td>{row.client_type || row.type || '—'}</td>
                <td>{row.country || row.location || '—'}</td>
                <td>{row.office_locations || '—'}</td>
                <td>
                    {row.website ? (
                        <a href={row.website.startsWith('http') ? row.website : `https://${row.website}`} target="_blank" rel="noreferrer">
                            {row.website}
                        </a>
                    ) : (
                        '—'
                    )}
                </td>
                <td>
                    {row.linkedin_url ? (
                        <a href={row.linkedin_url} target="_blank" rel="noreferrer">
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
                    <span className="badge badge-outline-theme">{row.projectCount} projects</span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                        <Link to={`/clients/${row.client_id}/edit`} className="action-btn" title="Edit">
                            <EditIcon />
                        </Link>
                        <button
                            type="button"
                            className="action-btn action-btn--danger"
                            title="Delete"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.();
                            }}
                        >
                            <TrashIcon />
                        </button>
                    </div>
                </td>
            </tr>
            <tr className="client-nested-row" style={{ display: expanded ? undefined : 'none' }}>
                <td colSpan={17} className="p-0">
                    <div className="client-nested-wrapper">
                        <h4 className="client-nested-title">
                            Projects for {row.client_name}
                        </h4>
                        <div className="client-details-card">
                            <ul className="client-details-list">
                                <ClientDetail label="Business Activity Summary" value={row.business_activity_summary} />
                                <ClientDetail label="Notes" value={row.notes} />
                                <ClientDetail label="Commercial Model" value={row.commercial_model} />
                                <ClientDetail label="Agreed Pricing" value={row.agreed_pricing} />
                                <ClientDetail
                                    label="Signed MSA?"
                                    value={row.signed_msa === true ? 'Yes' : row.signed_msa === false ? 'No' : null}
                                />
                                <ClientDetail label="MSA" value={row.msa} />
                            </ul>
                        </div>
                        <ClientProjectsTable projects={row.projects} />
                    </div>
                </td>
            </tr>
        </>
    );
}

function ClientDetail({ label, value }) {
    return (
        <li className="client-details-item">
            <div className="client-details-item__label">{label}</div>
            <div className="client-details-item__value">{value ? String(value) : '—'}</div>
        </li>
    );
}

