import { http } from './http';

export async function fetchUsers({ page = 1, limit = 20, search = '', filters = {} } = {}) {
    const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
    });
    const appendCsv = (key, arr) => {
        if (Array.isArray(arr) && arr.length) {
            query.append(key, arr.join(','));
        }
    };
    appendCsv('client_id', filters.client_id);
    appendCsv('client_type', filters.client_type);
    appendCsv('seniority', filters.seniority);
    appendCsv('location', filters.location);

    try {
        const result = await http(`/users?${query.toString()}`);
        return {
            data: result.data || [],
            meta: result.meta || { total_records: 0, current_page: 1, total_pages: 1, limit },
        };
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return { data: [], meta: { total_records: 0, current_page: 1, total_pages: 1, limit } };
    }
}

export async function fetchUserById(userId) {
    const result = await http(`/users/${userId}`);
    return result.data || null;
}

export async function createUser(payload) {
    const result = await http('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return result.data;
}

export async function updateUser(userId, payload) {
    const result = await http(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return result.data;
}

export async function deleteUser(userId) {
    const result = await http(`/users/${userId}`, { method: 'DELETE' });
    return result;
}

export async function bulkDeleteUsers(ids) {
    const result = await http('/users/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
    });
    return result;
}

export async function fetchUsersSummary({ page = 1, limit = 20, search = '', filters = {} } = {}) {
    const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
    });
    const appendCsv = (key, arr) => {
        if (Array.isArray(arr) && arr.length) {
            query.append(key, arr.join(','));
        }
    };
    appendCsv('client_id', filters.client_id);
    appendCsv('client_type', filters.client_type);
    appendCsv('seniority', filters.seniority);
    appendCsv('location', filters.location);

    try {
        const result = await http(`/users/summary?${query.toString()}`);
        return {
            data: result.data || [],
            meta: result.meta || { total_records: 0, current_page: 1, total_pages: 1, limit },
        };
    } catch (error) {
        console.error('Failed to fetch users summary:', error);
        return { data: [], meta: { total_records: 0, current_page: 1, total_pages: 1, limit } };
    }
}

export async function fetchUserFilterOptions() {
    try {
        const result = await http('/users/filter-options');
        return result.data || { client_names: [], client_types: [], seniorities: [], locations: [] };
    } catch (error) {
        console.error('Failed to fetch filter options:', error);
        return { client_names: [], client_types: [], seniorities: [], locations: [] };
    }
}

export async function fetchUserFormLookups() {
    try {
        const result = await http('/users/form-lookups');
        return result || { clients: [], hasamex_users: [] };
    } catch (error) {
        console.error('Failed to fetch user form lookups:', error);
        return { clients: [], hasamex_users: [] };
    }
}

