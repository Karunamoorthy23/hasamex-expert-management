import { http } from './http';

export async function fetchClients({ page = 1, limit = 20, search = '' } = {}) {
    const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
    });
    try {
        const result = await http(`/clients?${query.toString()}`);
        return {
            data: result.data || [],
            meta: result.meta || { total_records: 0, current_page: 1, total_pages: 1, limit },
        };
    } catch (error) {
        console.error('Failed to fetch clients:', error);
        return { data: [], meta: { total_records: 0, current_page: 1, total_pages: 1, limit } };
    }
}

export async function fetchClientById(clientId) {
    const result = await http(`/clients/${clientId}`);
    return result.data || null;
}

export async function createClient(payload) {
    const result = await http('/clients', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return result.data;
}

export async function updateClient(clientId, payload) {
    const result = await http(`/clients/${clientId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return result.data;
}

export async function deleteClient(clientId) {
    const result = await http(`/clients/${clientId}`, { method: 'DELETE' });
    return result;
}

export async function bulkDeleteClients(ids) {
    const result = await http('/clients/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
    });
    return result;
}

export async function fetchClientUsers() {
    try {
        const result = await http('/clients/users');
        return result.data || [];
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return [];
    }
}

export async function fetchProjects({ clientId } = {}) {
    const query = new URLSearchParams();
    if (clientId) query.set('client_id', String(clientId));

    try {
        const result = await http(`/projects${query.size ? `?${query.toString()}` : ''}`);
        return result.data || [];
    } catch (error) {
        console.error('Failed to fetch projects:', error);
        return [];
    }
}

