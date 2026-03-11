import { cn } from '../../utils/cn';

/**
 * Reusable Button component.
 *
 * @param {Object} props
 * @param {'primary'|'secondary'|'ghost'} [props.variant='primary']
 * @param {'sm'|'md'} [props.size='md']
 * @param {React.ReactNode} [props.icon] - Optional icon element
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {Object} rest - Additional HTML button attributes
 */
export default function Button({
    variant = 'primary',
    size = 'md',
    icon,
    loading = false,
    children,
    className,
    ...rest
}) {
    return (
        <button
            className={cn(
                'btn',
                `btn--${variant}`,
                size === 'sm' && 'btn--sm',
                loading && 'btn--loading',
                className
            )}
            disabled={loading || rest.disabled}
            {...rest}
        >
            {loading ? (
                <span className="btn__loading">Processing...</span>
            ) : (
                <>
                    {icon && <span className="btn__icon">{icon}</span>}
                    {children}
                </>
            )}
        </button>
    );
}
