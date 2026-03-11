/**
 * Reusable Badge component for tags, labels, statuses.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function Badge({ children, className = '' }) {
    return (
        <span className={`expert-card__badge ${className}`}>
            {children}
        </span>
    );
}
