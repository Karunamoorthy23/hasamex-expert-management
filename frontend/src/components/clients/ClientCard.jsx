import Checkbox from '../ui/Checkbox';
import Badge from '../ui/Badge';
import { truncate, getInitials } from '../../utils/format';
import { EditIcon, TrashIcon } from '../icons/Icons';

export default function ClientCard({ client, projectCount = 0, userCount = 0, selected, onSelect, onView, onDelete, onOpenRules, onEdit }) {
    const [first, second] = String(client.client_name || '').split(' ');
    const initials = getInitials(first || '', second || '');
    const ra = Array.isArray(client.client_solution_owner_names) && client.client_solution_owner_names.length
        ? client.client_solution_owner_names.join(', ')
        : '—';
    const am = Array.isArray(client.sales_team_names) && client.sales_team_names.length
        ? client.sales_team_names.join(', ')
        : '—';
    return (
        <div className="expert-card">
            <div className="expert-card__header">
                <Checkbox className="expert-card__checkbox" checked={selected} onChange={onSelect} />
                <div className="expert-card__avatar">{initials || 'CL'}</div>
                <div>
                    <h3 className="expert-card__name">{client.client_name || 'Client'}</h3>
                    <span className="expert-card__id">{client.client_id}</span>
                </div>
            </div>
            <div className="expert-card__meta">
                <Badge>{client.client_type || client.type || '—'}</Badge>
                <Badge>{client.country || client.location || '—'}</Badge>
                <Badge>{projectCount} Projects</Badge>
                <Badge>{userCount} Users</Badge>
            </div>
            <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
                <div style={{ fontSize: 12.5, color: '#333' }}>
                    <span style={{ fontWeight: 700 }}>Research Analyst:</span> {ra}
                </div>
                <div style={{ fontSize: 12.5, color: '#333' }}>
                    <span style={{ fontWeight: 700 }}>Account Manager:</span> {am}
                </div>
            </div>
            <p className="expert-card__title">
                {truncate(client.business_activity_summary, 80)}
            </p>
            <div className="expert-card__actions">
                <a
                    href="#"
                    className="action-link"
                    onClick={(e) => {
                        e.preventDefault();
                        onView();
                    }}
                >
                    View
                </a>
                {client.service_rules ? (
                    <a
                        href="#"
                        className="action-link"
                        onClick={(e) => {
                            e.preventDefault();
                            onOpenRules && onOpenRules();
                        }}
                    >
                        Service Rules
                    </a>
                ) : (
                    <span className="action-link" style={{ opacity: 0.6, cursor: 'default' }}>Service Rules</span>
                )}
                {client.website ? (
                    <a
                        href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="action-link"
                    >
                        Website
                    </a>
                ) : null}
                <a
                    href="#"
                    className="action-link"
                    title="Edit"
                    onClick={(e) => {
                        e.preventDefault();
                        onEdit && onEdit();
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center' }}
                >
                    <EditIcon />
                </a>
                <a
                    href="#"
                    className="action-link"
                    title="Delete"
                    onClick={(e) => {
                        e.preventDefault();
                        onDelete();
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center' }}
                >
                    <TrashIcon />
                </a>
            </div>
        </div>
    );
}
