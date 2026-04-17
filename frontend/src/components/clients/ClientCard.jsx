import Checkbox from '../ui/Checkbox';
import Badge from '../ui/Badge';
import { truncate, getInitials } from '../../utils/format';
import { EditIcon, TrashIcon, BriefcaseIcon, UsersIcon, LinkIcon, FileIcon } from '../icons/Icons';
import { Link } from 'react-router-dom';

export default function ClientCard({ client, projectCount = 0, userCount = 0, selected, onSelect, onView, onDelete, onOpenRules, onEdit }) {
    const title = client.client_name || 'Unnamed Client';
    const initials = getInitials(title, '');
    const ra = Array.isArray(client.client_solution_owner_names) && client.client_solution_owner_names.length
        ? client.client_solution_owner_names.join(', ')
        : '—';
    const am = Array.isArray(client.sales_team_names) && client.sales_team_names.length
        ? client.sales_team_names.join(', ')
        : '—';

    return (
        <div className="expert-wide-card">
            <style>{`
                .expert-wide-card {
                    display: flex;
                    flex-direction: row;
                    background: var(--table-bg);
                    border: 1px solid var(--border-app);
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 12px;
                    gap: 16px;
                    align-items: flex-start;
                    position: relative;
                    transition: box-shadow 0.2s, background 0.2s;
                }
                .expert-wide-meta {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    display: flex;
                    gap: 8px;
                }
                .expert-wide-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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
                    gap: 12px;
                    flex-wrap: wrap;
                }
                .expert-wide-name {
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: var(--text-app);
                    margin: 0;
                    text-decoration: none;
                }
                .expert-wide-name:hover {
                    text-decoration: underline;
                }
                .expert-wide-headline {
                    font-size: 0.9rem;
                    color: var(--text-app);
                    opacity: 0.8;
                    margin: 4px 0;
                    line-height: 1.4;
                }
                .expert-wide-contacts {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    font-size: 0.85rem;
                    color: var(--text-app);
                    opacity: 0.7;
                    margin-bottom: 4px;
                }
                .expert-wide-contact-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .expert-wide-skills {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin: 8px 0;
                }
                .expert-wide-skill-pill {
                    background: var(--table-th-bg);
                    color: var(--text-app);
                    padding: 3px 12px;
                    border-radius: 12px;
                    font-size: 0.75rem;
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
                    font-size: 0.85rem;
                    color: var(--text-app);
                    opacity: 0.6;
                    align-items: center;
                    margin-top: 4px;
                }
                .expert-wide-actions {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-top: 12px;
                    border-top: 1px solid var(--border-app);
                    padding-top: 12px;
                }
                .expert-wide-action-link {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-app);
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                }
                .expert-wide-action-link:hover {
                    opacity: 1;
                    text-decoration: underline;
                }
                .expert-wide-btn {
                    padding: 8px;
                    border-radius: 8px;
                    background: transparent;
                    border: 1px solid var(--border-app);
                    color: var(--text-app);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .expert-wide-btn:hover {
                    background: var(--table-hover);
                    border-color: var(--text-app);
                }
                .expert-wide-btn--danger:hover {
                    color: #e53e3e;
                    border-color: #e53e3e;
                    background: rgba(229, 62, 62, 0.1);
                }
            `}</style>

            <div className="expert-wide-meta">
                <button type="button" className="expert-wide-btn" onClick={onEdit} title="Edit Client">
                    <EditIcon width={18} height={18} />
                </button>
                <button type="button" className="expert-wide-btn expert-wide-btn--danger" onClick={onDelete} title="Delete Client">
                    <TrashIcon width={18} height={18} />
                </button>
            </div>

            <div className="expert-wide-avatar-wrap">
                <Checkbox checked={selected} onChange={onSelect} />
                <div className="expert-wide-avatar" style={{ background: 'linear-gradient(135deg, #2D3748 0%, #1A202C 100%)' }}>
                    {initials || 'CL'}
                </div>
            </div>

            <div className="expert-wide-content">
                <div className="expert-wide-header">
                    <span className="expert-wide-name" onClick={onView} style={{ cursor: 'pointer' }}>{title}</span>
                    <Badge variant="neutral" style={{ border: '1px solid var(--border-app)', opacity: 0.7 }}>ID: {client.client_id}</Badge>
                </div>

                <div className="expert-wide-skills">
                    <span className="expert-wide-skill-pill">{client.client_type || client.type || '—'}</span>
                    <span className="expert-wide-skill-pill">{client.country || client.location || '—'}</span>
                    <span className="expert-wide-skill-pill">{projectCount} Projects</span>
                    <span className="expert-wide-skill-pill">{userCount} Users</span>
                </div>

                <p className="expert-wide-headline">
                    Research Analyst: <span style={{ fontWeight: 600 }}>{ra}</span> • Account Manager: <span style={{ fontWeight: 600 }}>{am}</span>
                </p>

                <div className="expert-wide-actions">
                    <a href="#" className="expert-wide-action-link" onClick={(e) => { e.preventDefault(); onView(); }}>
                        View Details
                    </a>
                    {client.service_rules && (
                        <a href="#" className="expert-wide-action-link" onClick={(e) => { e.preventDefault(); onOpenRules(); }}>
                            <FileIcon width={16} height={16} /> Service Rules
                        </a>
                    )}
                    {client.website && (
                        <a 
                            href={client.website.startsWith('http') ? client.website : `https://${client.website}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="expert-wide-action-link"
                        >
                            <LinkIcon width={16} height={16} /> Website
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
