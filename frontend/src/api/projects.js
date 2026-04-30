import { http } from './http';

export async function fetchProjectsPaged({ page = 1, limit = 20, search = '', clientId, pocUserId } = {}) {
    const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
    });
    if (clientId) query.set('client_id', String(clientId));
    if (pocUserId) query.set('poc_user_id', String(pocUserId));

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

export async function fetchProjectSummary({ page = 1, limit = 20, search = '', filters = {} } = {}) {
    const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: search || '',
    });
    const appendCsv = (key, arr) => {
        if (arr && arr.length > 0) query.append(key, arr.join(','));
    };
    appendCsv('client_id', filters.client_id);
    appendCsv('ra', filters.ra);
    appendCsv('month', filters.months);
    appendCsv('year', filters.years);

    try {
        const result = await http(`/projects/summary?${query.toString()}`);
        return {
            data: result.data || [],
            meta: result.meta || { total_records: 0, current_page: 1, total_pages: 1, limit },
        };
    } catch (error) {
        console.error('Failed to fetch project summary:', error);
        return { data: [], meta: { total_records: 0, current_page: 1, total_pages: 1, limit } };
    }
}

export async function fetchProjectFilterOptions() {
    try {
        const result = await http('/projects/filter-options');
        return result || { client_names: [], ra_names: [], months: [], years: [] };
    } catch (error) {
        console.error('Failed to fetch project filter options:', error);
        return { client_names: [], ra_names: [], months: [], years: [] };
    }
}

export async function fetchProjectFormLookups() {
    try {
        const result = await http('/projects/form-lookups');
        return result || { clients: [], users: [], lookups: {} };
    } catch (error) {
        console.error('Failed to fetch project form lookups:', error);
        return { clients: [], users: [], lookups: {} };
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

export async function sendProjectInvites(projectId, expertIds) {
    const result = await http(`/projects/${projectId}/send-invite`, {
        method: 'POST',
        body: JSON.stringify({ expert_ids: expertIds }),
    });
    return result;
}

export async function fetchExpertSubmission(projectId, expertId) {
    return await http(`/projects/${projectId}/expert-submission/${expertId}`);
}
export async function updateOutreachMessage(projectId, messageId, payload) {
    const result = await http(`/projects/${projectId}/outreach/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
    return result.data;
}

export async function generateOutreachMessages(projectId) {
    const result = await http(`/projects/${projectId}/generate-outreach`, {
        method: 'POST',
    });
    return result;
}

/**
 * Upload one or more expert PDF files to a project.
 * The backend will parse each PDF with Gemini and create/update experts as Leads.
 * @param {number} projectId
 * @param {File[]} files  - array of File objects (PDF only)
 * @returns {Promise<{total, created, updated, duplicate, error, results[]}>}
 */
export async function uploadExpertPdfs(projectId, files) {
    const { getToken } = await import('../auth/token');
    const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
    const token = getToken();

    const formData = new FormData();
    files.forEach((f) => formData.append('files[]', f));

    const response = await fetch(`${BASE_URL}/projects/${projectId}/upload-expert-pdfs`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });

    if (!response.ok) {
        const err = new Error(`HTTP Error ${response.status}`);
        err.status = response.status;
        try { err.data = await response.json(); } catch { /* ignore */ }
        throw err;
    }

    return response.json();
}

/**
 * Send an expert report email for the selected accepted experts.
 * @param {number} projectId
 * @param {string[]} expertIds   - selected expert UUIDs
 * @param {'myself'|'client'} recipient
 * @param {Object} rates         - { [expertId]: rateNumber }
 */
export async function sendExpertReport(projectId, expertIds, recipient, rates = {}) {
    const result = await http(`/projects/${projectId}/send-expert-report`, {
        method: 'POST',
        body: JSON.stringify({ expert_ids: expertIds, recipient, rates }),
    });
    return result;
}

export async function triggerExpertSearch(projectId) {
    const result = await http('/search/find-experts', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId }),
    });
    return result;
}
