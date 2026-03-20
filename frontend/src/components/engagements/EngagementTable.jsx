import React from 'react';
import { format } from 'date-fns';
import { EditIcon, TrashIcon, SortIcon } from '../icons/Icons';
import { cn } from '../../utils/cn';

function statusBadgeClass(status) {
    if (!status) return 'badge badge-outline-theme';
    const val = String(status).toLowerCase();
    if (val === 'paid') return 'badge badge-active';
    if (val === 'pending') return 'badge badge-planning';
    if (val === 'processing') return 'badge badge-outline-theme';
    return 'badge badge-outline-theme';
}

export default function EngagementTable({
    engagements,
    onEdit,
    onDelete,
    sortBy,
    sortOrder,
    onSort,
}) {
    const renderHeader = (label, column, className) => {
        const isActive = sortBy === column;
        return (
            <th
                className={`${className} sortable-header`}
                onClick={() => onSort(column)}
                style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {label}
                    <SortIcon direction={isActive ? sortOrder : null} active={isActive} />
                </div>
            </th>
        );
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            return format(new Date(dateStr), 'dd MMM yyyy');
        } catch {
            return dateStr;
        }
    };

    const formatCurrency = (amount, currency) => {
        if (amount === null || amount === undefined) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
        }).format(amount);
    };

    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        {renderHeader('Project', 'project_name', 'col-project')}
                        {renderHeader('Expert', 'expert_name', 'col-expert')}
                        {renderHeader('Call Date', 'call_date', 'col-date')}
                        {renderHeader('Duration', 'actual_call_duration_mins', 'col-duration')}
                        {renderHeader('Client Rate', 'client_rate', 'col-rate')}
                        {renderHeader('Expert Rate', 'expert_rate', 'col-rate')}
                        {renderHeader('Gross Profit', 'gross_profit_usd', 'col-profit')}
                        {renderHeader('Margin', 'gross_margin_percent', 'col-margin')}
                        {renderHeader('Status', 'expert_payment_status', 'col-status')}
                        <th className="col-actions">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {engagements.map((eng) => (
                        <tr key={eng.id}>
                            <td className="col-project">
                                <div className="project-cell">
                                    <span className="project-name">{eng.project_name}</span>
                                    <span className="project-id">{eng.project_id}</span>
                                </div>
                            </td>
                            <td className="col-expert">
                                <div className="expert-cell">
                                    <span className="expert-name">{eng.expert_name}</span>
                                </div>
                            </td>
                            <td className="col-date">{formatDate(eng.call_date)}</td>
                            <td className="col-duration">{eng.actual_call_duration_mins ? `${eng.actual_call_duration_mins}m` : '-'}</td>
                            <td className="col-rate">{formatCurrency(eng.client_rate, eng.client_currency)}</td>
                            <td className="col-rate">{formatCurrency(eng.expert_rate, eng.expert_currency)}</td>
                            <td className={`col-profit ${eng.gross_profit_usd >= 0 ? 'text-success' : 'text-danger'}`}>
                                {formatCurrency(eng.gross_profit_usd, 'USD')}
                            </td>
                            <td className="col-margin">{eng.gross_margin_percent ? `${eng.gross_margin_percent}%` : '-'}</td>
                            <td className="col-status">
                                <span className={cn(statusBadgeClass(eng.expert_payment_status))}>
                                    {eng.expert_payment_status || 'Pending'}
                                </span>
                            </td>
                            <td className="col-actions">
                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                    <button type="button" className="action-btn" title="Edit" onClick={() => onEdit(eng.id)}>
                                        <EditIcon />
                                    </button>
                                    <button type="button" className="action-btn action-btn--danger" title="Delete" onClick={() => onDelete(eng.id)}>
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
