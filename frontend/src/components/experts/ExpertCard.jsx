import Checkbox from '../ui/Checkbox';
import Badge from '../ui/Badge';
import { getInitials } from '../../utils/format';
import { BriefcaseIcon, PhoneIcon, LinkedInIcon, MailIcon, EditIcon, TrashIcon } from '../icons/Icons';

function MoreDotsIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
        </svg>
    );
}

export default function ExpertCard({ expert, selected, onSelect, onView, onEdit, onDelete }) {
    const initials = getInitials(expert.first_name, expert.last_name);
    
    // Attempt robust parsing of skills across different delimiting formats (comma, newline, semicolon)
    let skills = [];
    if (expert.strength_topics) {
        skills = expert.strength_topics
            .split(/[\n,;]+/)
            .map(s => s.replace(/^[•\-\*]\s*/, '').trim())
            .filter(Boolean)
            .slice(0, 3);
        
        // Final fallback: if it's still a massive single string, just truncate it so it doesn't break the UI
        if (skills.length === 1 && skills[0].length > 40) {
            skills = [
                skills[0].slice(0, 37) + '...'
            ];
        }
    }

    return (
        <div className="expert-wide-card">
            <style>{`
                .expert-wide-card {
                    display: flex;
                    flex-direction: row;
                    background: var(--table-bg, #fff);
                    border: 1px solid var(--border-app, #e0e0e0);
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 12px;
                    gap: 16px;
                    align-items: flex-start;
                    position: relative;
                    transition: box-shadow 0.2s, background 0.2s;
                }
                .expert-wide-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                :root[data-theme="dark"] .expert-wide-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
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
                    background: linear-gradient(135deg, #6C38FF 0%, #A25FFF 100%);
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
                    gap: 8px;
                }
                .expert-wide-name {
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: var(--text-app, #000);
                    margin: 0;
                }
                .expert-wide-headline {
                    font-size: 0.9rem;
                    color: #555;
                    margin: 0 0 4px 0;
                }
                :root[data-theme="dark"] .expert-wide-headline {
                    color: #aaa;
                }
                .expert-wide-contacts {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    font-size: 0.8rem;
                    color: #555;
                    margin-bottom: 2px;
                }
                :root[data-theme="dark"] .expert-wide-contacts {
                    color: #bbb;
                }
                .expert-wide-contact-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .expert-wide-skills {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                    margin-bottom: 6px;
                }
                .expert-wide-skill-pill {
                    background: var(--sidebar-hover);
                    color: var(--text-app);
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    border: 1px solid var(--border-app);
                }
                .expert-wide-footer {
                    display: flex;
                    gap: 16px;
                    font-size: 0.8rem;
                    color: #777;
                    align-items: center;
                }
                :root[data-theme="dark"] .expert-wide-footer {
                    color: #999;
                }
                .expert-wide-footer-item {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .expert-wide-actions {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    margin-top: 2px;
                }
                .expert-wide-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border: 1px solid var(--border-app, #e0e0e0);
                    border-radius: 6px;
                    background: transparent;
                    color: var(--text-app, #000);
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    text-decoration: none;
                    transition: all 0.2s ease;
                }
                .expert-wide-btn:hover {
                    background: var(--table-hover, #f5f5f5);
                }
                .expert-wide-btn--danger:hover {
                    color: #e53e3e;
                    background: #fff5f5;
                }
                :root[data-theme="dark"] .expert-wide-btn--danger:hover {
                    background: #2d1a1a;
                }
                .expert-wide-dots {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: var(--text-app, #000);
                    padding: 6px;
                    display: flex;
                    border-radius: 50%;
                    transition: background 0.2s;
                }
                .expert-wide-dots:hover {
                    background: var(--table-hover);
                }
            `}</style>

            <div className="expert-wide-avatar-wrap">
                <Checkbox checked={selected} onChange={onSelect} />
                <div className="expert-wide-avatar">{initials}</div>
            </div>

            <div className="expert-wide-content">
                <div className="expert-wide-header">
                    <h3 className="expert-wide-name">{expert.first_name} {expert.last_name}</h3>
                    <Badge variant="neutral">{expert.primary_sector || 'General'}</Badge>
                </div>

                <p className="expert-wide-headline">
                    {expert.title_headline || 'Expertise Title Missing'}
                </p>

                <div className="expert-wide-contacts">
                    {expert.primary_email && (
                        <div className="expert-wide-contact-item">
                            <MailIcon width={14} height={14} />
                            {expert.primary_email}
                        </div>
                    )}
                    {expert.primary_phone && (
                        <div className="expert-wide-contact-item">
                            <PhoneIcon width={14} height={14} />
                            {expert.primary_phone}
                        </div>
                    )}
                </div>

                {skills.length > 0 && (
                    <div className="expert-wide-skills">
                        {skills.map((skill, idx) => (
                            <span key={idx} className="expert-wide-skill-pill">{skill}</span>
                        ))}
                    </div>
                )}

                <div className="expert-wide-footer">
                    <div className="expert-wide-footer-item">
                        <BriefcaseIcon width={14} height={14} />
                        {expert.project_count || 0} projects
                    </div>
                    <div className="expert-wide-footer-item">
                        <PhoneIcon width={14} height={14} />
                        {expert.total_calls_completed || 0} calls completed
                    </div>
                    <div className="expert-wide-footer-item" style={{marginLeft: '24px'}}>
                        Last engaged: {expert.updated_at ? new Date(expert.updated_at).toLocaleDateString('en-GB') : 'N/A'}
                    </div>
                </div>
            </div>

            <div className="expert-wide-actions">
                <a href={expert.linkedin_url || '#'} target="_blank" rel="noopener noreferrer" className="expert-wide-btn">
                    <LinkedInIcon width={14} height={14} /> LinkedIn
                </a>
                <a href={`mailto:${expert.primary_email}`} className="expert-wide-btn">
                    <MailIcon width={14} height={14} /> Email
                </a>
                
                <button type="button" className="expert-wide-btn" onClick={onEdit} title="Edit Expert">
                    <EditIcon width={14} height={14} />
                </button>
                <button type="button" className="expert-wide-btn expert-wide-btn--danger" onClick={onDelete} title="Delete Expert">
                    <TrashIcon width={14} height={14} />
                </button>

                <button onClick={onView} className="expert-wide-dots" title="View Options">
                    <MoreDotsIcon />
                </button>
            </div>
        </div>
    );
}
