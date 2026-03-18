import { getToken, clearToken } from '../auth/token';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Base HTTP wrapper with interceptors.
 * @param {string} endpoint
 * @param {RequestInit} options
 * @returns {Promise<any>}
 */
export async function http(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const token = getToken();
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
        ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
        if (response.status === 401) {
            clearToken();
        }
        const error = new Error(`HTTP Error ${response.status}`);
        error.status = response.status;
        try {
            error.data = await response.json();
        } catch {
            // ignore parse errors
        }
        throw error;
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) return null;

    return response.json();
}
