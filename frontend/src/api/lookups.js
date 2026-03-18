import { http } from './http';

export async function fetchLookups() {
    const result = await http('/lookups');
    return result.data || {};
}

