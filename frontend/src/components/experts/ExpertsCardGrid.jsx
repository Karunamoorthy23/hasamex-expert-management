import ExpertCard from './ExpertCard';

/**
 * ExpertsCardGrid — list view for expert wide horizontal cards.
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
    onEditExpert,
    onDeleteExpert,
}) {
    return (
        <div className="expert-wide-card-list">
            <style>{`
                .expert-wide-card-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                }
            `}</style>
            {experts.map((expert) => (
                <ExpertCard
                    key={expert.id}
                    expert={expert}
                    selected={selectedIds.has(expert.id)}
                    onSelect={() => onSelectExpert(expert.id)}
                    onView={() => onViewExpert(expert.id)}
                    onEdit={() => onEditExpert(expert.id)}
                    onDelete={() => onDeleteExpert(expert)}
                />
            ))}
        </div>
    );
}
