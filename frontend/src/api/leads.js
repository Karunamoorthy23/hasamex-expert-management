import { http } from './http';

export async function fetchLeadClients({ page = 1, limit = 20, search = '' } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
    const res = await http(`/leads/clients?${params.toString()}`);
    return { data: res.data || [], meta: res.meta || { total_records: 0, current_page: 1, total_pages: 1, limit } };
}

export async function fetchLeadClientById(id) {
    const res = await http(`/leads/clients/${id}`);
    return res.data || null;
}

export async function createLeadClient(payload) {
    const res = await http('/leads/clients', { method: 'POST', body: JSON.stringify(payload) });
    return res.data;
}

export async function updateLeadClient(id, payload) {
    const res = await http(`/leads/clients/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    return res.data;
}

export async function deleteLeadClient(id) {
    await http(`/leads/clients/${id}`, { method: 'DELETE' });
    return true;
}

export async function fetchLeadExperts({ page = 1, limit = 20, search = '' } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
    const res = await http(`/leads/experts?${params.toString()}`);
    return { data: res.data || [], meta: res.meta || { total_records: 0, current_page: 1, total_pages: 1, limit } };
}

export async function fetchLeadExpertById(id) {
    const res = await http(`/leads/experts/${id}`);
    return res.data || null;
}

export async function createLeadExpert(payload) {
    const res = await http('/leads/experts', { method: 'POST', body: JSON.stringify(payload) });
    return res.data;
}

export async function updateLeadExpert(id, payload) {
    const res = await http(`/leads/experts/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    return res.data;
}

export async function deleteLeadExpert(id) {
    await http(`/leads/experts/${id}`, { method: 'DELETE' });
    return true;
}

export async function fetchLeadCandidates({ page = 1, limit = 20, search = '' } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
    const res = await http(`/leads/candidates?${params.toString()}`);
    return { data: res.data || [], meta: res.meta || { total_records: 0, current_page: 1, total_pages: 1, limit } };
}

export async function fetchLeadCandidateById(id) {
    const res = await http(`/leads/candidates/${id}`);
    return res.data || null;
}

export async function createLeadCandidate(payload) {
    const res = await http('/leads/candidates', { method: 'POST', body: JSON.stringify(payload) });
    return res.data;
}

export async function updateLeadCandidate(id, payload) {
    const res = await http(`/leads/candidates/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    return res.data;
}

export async function deleteLeadCandidate(id) {
    await http(`/leads/candidates/${id}`, { method: 'DELETE' });
    return true;
}
