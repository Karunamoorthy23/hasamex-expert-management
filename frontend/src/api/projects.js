import { http } from './http';

export async function fetchProjectsPaged({ page = 1, limit = 20, search = '', clientId } = {}) {
    const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
    });
    if (clientId) query.set('client_id', String(clientId));

    try {
        const result = await http(`/projects?${query.toString()}`);
        return {
            data: result.data || [],
            meta: result.meta || { total_records: 0, current_page: 1, total_pages: 1, limit },
        };
    } catch (error) {
        console.error('Failed to fetch projects:', error);
        return { data: [], meta: { total_records: 0, current_page: 1, total_pages: 1, limit } };
    }
}

export async function fetchProjectById(projectId) {
    const result = await http(`/projects/${projectId}`);
    return result.data || null;
}

export async function fetchProjectExperts(projectId) {
    const result = await http(`/projects/${projectId}/experts`);
    return result.data || [];
}

export async function createProject(payload) {
    const result = await http('/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return result.data;
}

export async function updateProject(projectId, payload) {
    const result = await http(`/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return result.data;
}

export async function deleteProject(projectId) {
    const result = await http(`/projects/${projectId}`, { method: 'DELETE' });
    return result;
}

export async function bulkDeleteProjects(ids) {
    const result = await http('/projects/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
    });
    return result;
}

export async function fetchProjectExpertStatus(projectId) {
    const result = await http(`/projects/${projectId}/expert-status`);
    return result.data || { leads: [], invited: [], accepted: [], counts: { L: 0, I: 0, A: 0 } };
}

export async function setProjectExpertStatus(projectId, { expert_id, category }) {
    const result = await http(`/projects/${projectId}/expert-status`, {
        method: 'POST',
        body: JSON.stringify({ expert_id, category }),
    });
    return result.data;
}

export async function setProjectCallAssignment(projectId, { expert_id, category, action }) {
    const result = await http(`/projects/${projectId}/expert-calls`, {
        method: 'POST',
        body: JSON.stringify({ expert_id, category, action }),
    });
    return result.data;
}


