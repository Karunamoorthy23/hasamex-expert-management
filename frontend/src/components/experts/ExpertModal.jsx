import Modal from '../ui/Modal';
import { MailIcon, PhoneIcon, MapPinIcon, LinkIcon, BriefcaseIcon, CreditCardIcon, CalendarIcon } from '../icons/Icons';

/**
 * ExpertModal — view profile modal for a selected expert.
 * Premium design for expert details overview.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is visible
 * @param {Function} props.onClose - Close the modal
 * @param {Object|null} props.expert - Expert data to display
 */
export default function ExpertModal({ open, onClose, expert }) {
    if (!expert) return null;

    const fullName = `${expert.salutation ? expert.salutation + ' ' : ''}${expert.first_name} ${expert.last_name}`.trim();

    return (
        <Modal open={open} onClose={onClose} title="Expert Profile">
            <div className="expert-modal-content">
                {/* Header section inside body */}
                <div className="expert-modal-header">
                    <div className="expert-modal-header-info">
                        <h2 className="expert-modal-name">{fullName}</h2>
                        <div className="expert-modal-headline">{expert.title_headline || 'No headline provided'}</div>
                        <div className="expert-modal-tags">
                            <span className="badge badge-outline-theme">{expert.expert_id}</span>
                            {expert.expert_status && (
                                <span className={`badge ${expert.expert_status.includes('Active') ? 'badge-active' : 'badge-outline-theme'}`}>
                                    {expert.expert_status}
                                </span>
                            )}
                            {expert.hcms_classification && (
                                <span className="badge badge-outline-theme">{expert.hcms_classification}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="expert-modal-grid">
                    {/* Left Column: Details */}
                    <div className="expert-modal-column">
                        <div className="expert-modal-section">
                            <h3>Contact & Location</h3>
                            <ul className="expert-modal-list">
                                {expert.primary_email && (
                                    <li>
                                        <MailIcon className="expert-icon" />
                                        <a href={`mailto:${expert.primary_email}`}>{expert.primary_email}</a>
                                    </li>
                                )}
                                {expert.primary_phone && (
                                    <li>
                                        <PhoneIcon className="expert-icon" />
                                        <span>{expert.primary_phone}</span>
                                    </li>
                                )}
                                {expert.location && (
                                    <li>
                                        <MapPinIcon className="expert-icon" />
                                        <span>{expert.location} {expert.region && `(${expert.region})`}</span>
                                    </li>
                                )}
                                {expert.linkedin_url && (
                                    <li>
                                        <LinkIcon className="expert-icon" />
                                        <a href={expert.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn Profile</a>
                                    </li>
                                )}
                                {expert.profile_pdf_url && (
                                    <li>
                                        <LinkIcon className="expert-icon" />
                                        <a href={expert.profile_pdf_url} target="_blank" rel="noopener noreferrer">Profile PDF / CV</a>
                                    </li>
                                )}
                            </ul>
                        </div>

                        <div className="expert-modal-section">
                            <h3>Professional Details</h3>
                            <ul className="expert-modal-list">
                                <li>
                                    <BriefcaseIcon className="expert-icon" />
                                    <span><strong>Sector:</strong> {expert.primary_sector || '—'}</span>
                                </li>
                                <li>
                                    <BriefcaseIcon className="expert-icon" />
                                    <span><strong>Company Role:</strong> {expert.company_role || '—'}</span>
                                </li>
                                <li>
                                    <BriefcaseIcon className="expert-icon" />
                                    <span><strong>Function:</strong> {expert.expert_function || '—'}</span>
                                </li>
                                <li>
                                    <BriefcaseIcon className="expert-icon" />
                                    <span><strong>Seniority:</strong> {expert.seniority || '—'}</span>
                                </li>
                                <li>
                                    <BriefcaseIcon className="expert-icon" />
                                    <span><strong>Employment:</strong> {expert.current_employment_status || '—'}</span>
                                </li>
                            </ul>
                        </div>

                        {(expert.hourly_rate || expert.currency) && (
                            <div className="expert-modal-section">
                                <h3>Engagement Details</h3>
                                <ul className="expert-modal-list">
                                    <li>
                                        <span className="expert-icon-text">$</span>
                                        <span><strong>Rate:</strong> {expert.hourly_rate ? `${expert.hourly_rate} ${expert.currency || 'USD'}/hr` : '—'}</span>
                                    </li>
                                    <li>
                                        <span className="expert-icon-text">✓</span>
                                        <span><strong>Calls Completed:</strong> {expert.total_calls_completed || 0}</span>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Bio and Text */}
                    <div className="expert-modal-column">
                        <div className="expert-modal-section">
                            <h3>Biography</h3>
                            <p className="expert-modal-text">{expert.bio || 'No biography provided.'}</p>
                        </div>

                        <div className="expert-modal-section">
                            <h3>Employment History</h3>
                            <p className="expert-modal-text">{expert.employment_history || 'No employment history provided.'}</p>
                        </div>

                        <div className="expert-modal-section">
                            <h3>Strength Topics</h3>
                            <div className="expert-modal-topics">
                                {expert.strength_topics ? (
                                    expert.strength_topics.split(',').map((topic, i) => (
                                        <span
                                            key={i}
                                            className="badge"
                                            style={{ background: 'transparent', border: 'none', color: 'inherit', padding: 0, marginRight: 8, whiteSpace: 'normal' }}
                                        >
                                            {topic.trim()}
                                        </span>
                                    ))
                                ) : (
                                    <p className="expert-modal-text">No topics listed.</p>
                                )}
                            </div>
                        </div>

                        {expert.payment_details && (
                            <div className="expert-modal-section">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <CreditCardIcon className="expert-icon" />
                                    <h3 style={{ margin: 0 }}>Payment Details</h3>
                                </div>
                                <p className="expert-modal-text expert-modal-notes">{expert.payment_details}</p>
                            </div>
                        )}

                        {expert.events_invited_to && (
                            <div className="expert-modal-section">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <CalendarIcon className="expert-icon" />
                                    <h3 style={{ margin: 0 }}>Events Invited To</h3>
                                </div>
                                <p className="expert-modal-text expert-modal-notes">{expert.events_invited_to}</p>
                            </div>
                        )}

                        {expert.notes && (
                            <div className="expert-modal-section">
                                <h3>Internal Notes</h3>
                                <p className="expert-modal-text expert-modal-notes">{expert.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
