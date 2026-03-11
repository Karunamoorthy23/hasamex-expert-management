/**
 * Skeletons — loading placeholder matching the table/card layout.
 * Maps from: <div id="skeletonView" class="skeleton-container"> in index.html
 *
 * @param {Object} props
 * @param {number} [props.rows=5] - Number of skeleton rows to display
 */
export default function Skeletons({ rows = 5 }) {
    return (
        <div className="skeleton-container">
            <div className="skeleton-table">
                {Array.from({ length: rows }, (_, i) => (
                    <div key={i} className="skeleton-row" />
                ))}
            </div>
        </div>
    );
}
