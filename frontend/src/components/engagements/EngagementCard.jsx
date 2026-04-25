import React from 'react';
import { VideoIcon, MailIcon, CalendarIcon, ClockIcon, EditIcon, TrashIcon } from '../icons/Icons';
import Badge from '../ui/Badge';
import { Link } from 'react-router-dom';

/**
 * EngagementCard - A card view for an engagement, matching the provided design.
 */
export default function EngagementCard({ engagement, onEdit, onDelete }) {
    const expertName = engagement.expert_name || 'Unnamed Expert';
    const clientName = engagement.client_name || 'N/A';
    const projectName = engagement.project_name || 'N/A';
    
    // Formatting date and time
    const callDate = engagement.call_date ? new Date(engagement.call_date) : null;
    const formattedDate = callDate 
        ? `${callDate.getDate().toString().padStart(2, '0')}/${(callDate.getMonth() + 1).toString().padStart(2, '0')}/${callDate.getFullYear()} at ${callDate.getHours().toString().padStart(2, '0')}:${callDate.getMinutes().toString().padStart(2, '0')}`
        : 'N/A';

    return (
        <div className="eng-card">
            <style>{`
                .eng-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: var(--table-bg, #fff);
                    border: 1px solid var(--border-app, #e0e0e0);
                    border-radius: 12px;
                    padding: 16px 20px;
                    margin-bottom: 12px;
                    transition: box-shadow 0.2s ease;
                    position: relative;
                }
                .eng-card__meta {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    display: flex;
                    gap: 8px;
                }
                .eng-card__icon-btn {
                    background: transparent;
                    border: none;
                    color: var(--text-muted, #777);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .eng-card__icon-btn:hover {
                    color: var(--text-app);
                    background: var(--table-bg-hover);
                }
                .eng-card__icon-btn--danger:hover {
                    color: #e53e3e;
                    background: #fff5f5;
                }
                :root[data-theme="dark"] .eng-card__icon-btn--danger:hover {
                    background: #2d1a1a;
                }
                .eng-card:hover {
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                }
                :root[data-theme="dark"] .eng-card:hover {
                    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                }
                .eng-card__content {
                    flex: 1;
                }
                .eng-card__header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                }
                .eng-card__name {
                    font-size: 1.15rem;
                    font-weight: 700;
                    margin: 0;
                    color: var(--text-app);
                }
                .eng-card__grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px 40px;
                }
                .eng-card__item {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .eng-card__label {
                    font-size: 0.85rem;
                    color: #888;
                    font-weight: 500;
                }
                .eng-card__value {
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: var(--text-app);
                }
                .eng-card__actions {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    min-width: 160px;
                }
                .eng-card__btn {
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    gap: 10px;
                    padding: 0 16px;
                    height: 38px;
                    border: 1px solid var(--table-border);
                    border-radius: 8px;
                    background: var(--table-bg);
                    color: var(--text-app);
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }
                .eng-card__btn:hover {
                    background: var(--table-bg-hover);
                    border-color: var(--text-app);
                }
                .eng-card__btn i, .eng-card__btn svg {
                    flex-shrink: 0;
                }
                @media (max-width: 768px) {
                    .eng-card {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 24px;
                    }
                    .eng-card__grid {
                        grid-template-columns: 1fr;
                    }
                    .eng-card__actions {
                        width: 100%;
                    }
                }
            `}</style>
            
            <div className="eng-card__meta">
                <button type="button" className="eng-card__icon-btn" onClick={() => onEdit(engagement.id)} title="Edit Engagement">
                    <EditIcon width={16} height={16} />
                </button>
                <button type="button" className="eng-card__icon-btn eng-card__icon-btn--danger" onClick={(e) => { e.stopPropagation(); onDelete(engagement.id); }} title="Delete Engagement">
                    <TrashIcon width={16} height={16} />
                </button>
            </div>

            <div className="eng-card__content">
                <div className="eng-card__header">
                    <h3 className="eng-card__name" onClick={() => onEdit(engagement.id)} style={{ cursor: 'pointer' }}>
                        {expertName}
                    </h3>
                    <code style={{ fontSize: '0.8rem', color: '#888', background: 'var(--table-bg-hover)', padding: '2px 6px', borderRadius: '4px' }}>
                        {engagement.engagement_id || 'ENG-XXXX'}
                    </code>
                    <Badge style={{ 
                        background: '#111122', 
                        color: '#fff', 
                        borderRadius: '20px', 
                        padding: '4px 14px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        letterSpacing: '0.5px',
                        textTransform: 'none',
                        border: 'none'
                    }}>Confirmed</Badge>
                </div>
                
                <div className="eng-card__grid">
                    <div className="eng-card__item">
                        <span className="eng-card__label">Client</span>
                        <span className="eng-card__value">{clientName}</span>
                    </div>
                    <div className="eng-card__item">
                        <span className="eng-card__label">Project</span>
                        <span className="eng-card__value">{projectName}</span>
                    </div>
                    <div className="eng-card__item">
                        <span className="eng-card__label">Date & Time</span>
                        <span className="eng-card__value" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{formattedDate}</span>
                    </div>
                    <div className="eng-card__item">
                        <span className="eng-card__label">Duration</span>
                        <span className="eng-card__value">{engagement.actual_call_duration_mins || 60} min</span>
                    </div>
                    <div className="eng-card__item">
                        <span className="eng-card__label">Expert Timeline</span>
                        <span className="eng-card__value">{engagement.expert_timezone || '—'}</span>
                    </div>
                    <div className="eng-card__item">
                        <span className="eng-card__label">Client Timeline</span>
                        <span className="eng-card__value">{engagement.client_timezone || '—'}</span>
                    </div>
                </div>
            </div>
            
            <div className="eng-card__actions">
                <button type="button" className="eng-card__btn" onClick={() => window.open(engagement.transcript_link_folder || '#', '_blank')}>
                    <VideoIcon width={16} height={16} />
                    Join Zoom
                </button>
                <button type="button" className="eng-card__btn" onClick={() => alert('Reminder sent to ' + expertName)}>
                    <MailIcon width={16} height={16} />
                    Send Reminder
                </button>
                <button type="button" className="eng-card__btn" onClick={() => onEdit(engagement.id)}>
                    <CalendarIcon width={16} height={16} />
                    Reschedule
                </button>
            </div>
        </div>
    );
}
