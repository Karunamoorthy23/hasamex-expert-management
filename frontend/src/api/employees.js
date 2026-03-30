import { http } from './http';

export async function fetchEmployees({ page = 1, limit = 20, search = '' } = {}) {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', limit);
    if (search) params.set('search', search);
    const result = await http(`/employees?${params.toString()}`);
    return result;
}

export async function fetchEmployeeById(id) {
    const result = await http(`/employees/${id}`);
    return result.data;
}

export async function createEmployee(payload) {
    const result = await http('/employees', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return result.data;
}

export async function updateEmployee(id, payload) {
    const result = await http(`/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return result.data;
}
