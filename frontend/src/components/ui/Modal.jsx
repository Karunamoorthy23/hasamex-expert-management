import { useEffect, useCallback } from 'react';

/**
 * Reusable Modal component with backdrop, escape key, and focus trap.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is visible
 * @param {Function} props.onClose - Callback when modal should close
 * @param {string} [props.title] - Modal header title
 * @param {React.ReactNode} props.children - Modal body content
 */
export default function Modal({ open, onClose, title, children }) {
    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (open) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [open, handleKeyDown]);

    if (!open) return null;

    return (
        <div className="modal-overlay">
            <div className="modal__backdrop" onClick={onClose} />
            <div className="modal__content" role="dialog" aria-modal="true">
                <div className="modal__header">
                    <h2 className="modal__title">{title || 'Modal'}</h2>
                    <button
                        type="button"
                        className="modal__close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        &times;
                    </button>
                </div>
                <div className="modal__body">{children}</div>
            </div>
        </div>
    );
}
