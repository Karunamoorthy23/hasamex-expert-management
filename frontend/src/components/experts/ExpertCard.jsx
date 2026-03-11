import Checkbox from '../ui/Checkbox';
import Badge from '../ui/Badge';
import { truncate, getInitials } from '../../utils/format';

/**
 * ExpertCard — individual card in the card grid view.
 * Maps from: <div class="expert-card"> in app.js renderCards()
 *
 * @param {Object} props
 * @param {Object} props.expert - Expert data object
 * @param {boolean} props.selected - Whether the card is selected
 * @param {Function} props.onSelect - Toggle selection
 * @param {Function} props.onView - View expert detail
 */
export default function ExpertCard({ expert, selected, onSelect, onView }) {
    const initials = getInitials(expert.first_name, expert.last_name);

    return (
        <div className="expert-card">
            <div className="expert-card__header">
                <Checkbox
                    className="expert-card__checkbox"
                    checked={selected}
                    onChange={onSelect}
                />
                <div className="expert-card__avatar">{initials}</div>
                <div>
                    <h3 className="expert-card__name">
                        {expert.first_name} {expert.last_name}
                    </h3>
                    <span className="expert-card__id">{expert.expert_id}</span>
                </div>
            </div>

            <div className="expert-card__meta">
                <Badge>{expert.primary_sector || '—'}</Badge>
                <Badge>{expert.region || '—'}</Badge>
            </div>

            <p className="expert-card__title">
                {truncate(expert.title_headline, 80)}
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
                <a
                    href={expert.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-link"
                >
                    LinkedIn
                </a>
            </div>
        </div>
    );
}
