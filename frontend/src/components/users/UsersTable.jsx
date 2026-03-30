import { Fragment, useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { Link } from 'react-router-dom';
import Checkbox from '../ui/Checkbox';
import { EditIcon, TrashIcon } from '../icons/Icons';
import { http } from '../../api/http';

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
    const [counts, setCounts] = useState({});
    useEffect(() => {
        let cancelled = false;
        const ids = (users || []).map((u) => u.user_id).filter(Boolean);
        const missing = ids.filter((id) => counts[id] == null);
        if (!missing.length) return;
        (async () => {
            try {
                const results = await Promise.all(
                    missing.map(async (uid) => {
                        try {
                            const projRes = await http(`/projects?limit=1&poc_user_id=${uid}`);
                            const projCount = projRes?.meta?.total_records ?? 0;
                            const engRes = await http(`/engagements?limit=1000&poc_user_id=${uid}`);
                            const engCount = Array.isArray(engRes?.data) ? engRes.data.length : 0;
                            return [uid, { proj: projCount, eng: engCount }];
                        } catch {
                            return [uid, { proj: 0, eng: 0 }];
                        }
                    })
                );
                if (cancelled) return;
                const upd = { ...counts };
                for (const [uid, val] of results) {
                    if (upd[uid] == null) upd[uid] = val;
                }
                setCounts(upd);
            } catch {
                if (!cancelled) setCounts((prev) => ({ ...prev }));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [users]);
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
                        <th className="col-name">User</th>
                        <th className="col-name">Client Name</th>
                        <th className="col-compact">Client Type</th>
                        <th className="col-title">Designation / Title</th>
                        <th className="col-compact">Email</th>
                        <th className="col-id">Phone</th>
                        <th className="col-compact">Seniority</th>
                        <th className="col-id">LinkedIn</th>
                        <th className="col-sector">Location</th>
                        <th className="col-status">Status</th>
                        <th className="col-id">Project Count</th>
                        <th className="col-id">Engagements</th>
                        <th className="col-solution">Research Analyst</th>
                        <th className="col-solution">Account Manager</th>
                        <th className="col-actions">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => {
                        const displayName = u.full_name || u.user_name || '—';
                        const c = counts[u.user_id] || { proj: u.project_count ?? 0, eng: u.engagement_count ?? 0 };
                        return (
                            <tr key={u.user_id} className="user-row">
                                <td
                                    className="col-check"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    <Checkbox checked={selectedIds?.has(u.user_id) || false} onChange={() => onSelectUser?.(u.user_id)} />
                                </td>
                                <td className="col-name">
                                    <div className="user-name-cell">
                                        <div>
                                            <div className="user-name">
                                                <Link to={`/users/${u.user_id}`}>{displayName}</Link>
                                                {u.user_code ? (
                                                    <span className="user-code">({u.user_code})</span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="col-name">
                                    {u.client_id ? (
                                        <Link to={`/clients/${u.client_id}`}>{u.client_name || '—'}</Link>
                                    ) : (
                                        u.client_name || '—'
                                    )}
                                </td>
                                <td className="col-compact">{u.client_type || '—'}</td>
                                <td className="col-title">{u.designation_title || '—'}</td>
                                <td className="col-compact">{u.email || '—'}</td>
                                <td className="col-id">{u.phone || '—'}</td>
                                <td className="col-compact">{u.seniority || '—'}</td>
                                <td className="col-id">
                                    {u.linkedin_url ? (
                                        <a href={u.linkedin_url} target="_blank" rel="noreferrer">
                                            LinkedIn
                                        </a>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td className="col-sector">{u.location || '—'}</td>
                                <td className="col-status">
                                    <span className={cn(statusBadgeClass(u.status))}>{u.status || '—'}</span>
                                </td>
                                <td className="col-id"><span className="badge badge-outline-theme">{c.proj}</span></td>
                                <td className="col-id"><span className="badge badge-outline-theme">{c.eng}</span></td>
                                <td className="col-solution">
                                    {Array.isArray(u.client_solution_owner_names) && u.client_solution_owner_names.length
                                        ? u.client_solution_owner_names.join(', ')
                                        : '—'}
                                </td>
                                <td className="col-solution">
                                    {Array.isArray(u.sales_team_names) && u.sales_team_names.length
                                        ? u.sales_team_names.join(', ')
                                        : '—'}
                                </td>
                                <td className="col-actions" onClick={(e) => e.stopPropagation()}>
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
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
