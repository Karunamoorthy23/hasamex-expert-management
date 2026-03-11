/**
 * Truncate a string to a given length with ellipsis.
 * @param {string|null|undefined} str
 * @param {number} len
 * @returns {string}
 */
export function truncate(str, len = 50) {
    if (!str) return '—';
    return str.length > len ? str.slice(0, len) + '…' : str;
}

/**
 * Get initials from first and last name.
 * @param {string} firstName
 * @param {string} lastName
 * @returns {string}
 */
export function getInitials(firstName, lastName) {
    return (firstName?.[0] || '') + (lastName?.[0] || '');
}

/**
 * Escape HTML entities for safe rendering.
 * @param {string} s
 * @returns {string}
 */
export function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
