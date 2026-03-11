import Modal from './Modal';

/**
 * ConfirmDialog — Reusable confirmation popup for dangerous actions (e.g., delete).
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {Function} props.onConfirm
 * @param {string} props.title
 * @param {string} props.message
 * @param {string} [props.confirmLabel='Confirm']
 * @param {string} [props.cancelLabel='Cancel']
 * @param {boolean} [props.isDestructive=true] - If true, confirm button is red.
 * @param {boolean} [props.isLoading=false] - If true, show loading state.
 */
export default function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDestructive = true,
    isLoading = false,
}) {
    if (!open) return null;

    return (
        <Modal open={open} onClose={onClose} title={title}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--color-grey-700)', lineHeight: 1.5 }}>
                    {message}
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                    <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`btn ${isDestructive ? 'btn--destructive' : 'btn--primary'} ${isLoading ? 'btn--loading' : ''}`}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="btn__loading">
                                <span className="loader-dots">···</span> Deleting
                            </span>
                        ) : (
                            confirmLabel
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
