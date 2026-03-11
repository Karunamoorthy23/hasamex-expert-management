/**
 * Reusable Checkbox component.
 *
 * @param {Object} props
 * @param {string} [props.id]
 * @param {boolean} [props.checked]
 * @param {Function} [props.onChange]
 * @param {string} [props.ariaLabel]
 * @param {string} [props.className]
 */
export default function Checkbox({
    id,
    checked = false,
    onChange,
    ariaLabel,
    className = '',
    ...rest
}) {
    return (
        <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={onChange}
            aria-label={ariaLabel}
            className={className}
            {...rest}
        />
    );
}
