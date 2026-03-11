import ExpertCard from './ExpertCard';

/**
 * ExpertsCardGrid — card-based grid view for expert list.
 * Maps from: <div id="cardView" class="card-grid"> in index.html
 *
 * @param {Object} props
 * @param {Array} props.experts - Array of expert objects
 * @param {Set} props.selectedIds - Set of selected expert IDs
 * @param {Function} props.onSelectExpert - Toggle selection for one expert
 * @param {Function} props.onViewExpert - Open expert detail modal
 */
export default function ExpertsCardGrid({
    experts,
    selectedIds,
    onSelectExpert,
    onViewExpert,
}) {
    return (
        <div className="card-grid">
            {experts.map((expert) => (
                <ExpertCard
                    key={expert.id}
                    expert={expert}
                    selected={selectedIds.has(expert.id)}
                    onSelect={() => onSelectExpert(expert.id)}
                    onView={() => onViewExpert(expert.id)}
                />
            ))}
        </div>
    );
}
