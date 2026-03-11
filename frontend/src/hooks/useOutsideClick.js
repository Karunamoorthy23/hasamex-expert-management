import { useEffect, useRef } from 'react';

/**
 * Calls handler when a click occurs outside the given ref element.
 * @param {React.RefObject} ref
 * @param {Function} handler
 */
export function useOutsideClick(ref, handler) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        function listener(event) {
            if (!ref.current || ref.current.contains(event.target)) {
                return;
            }
            handlerRef.current(event);
        }

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref]);
}
