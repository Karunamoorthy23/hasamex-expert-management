import { http } from './http';

/**
 * Sample expert data for development fallback.
 */
export const SAMPLE_EXPERTS = [
    // ... existing mock data kept internally for fallback reference if needed
];

/**
 * Fetch experts from the backend API.
 * 
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @param {string} params.search
 * @param {Object} params.filters
 * @returns {Promise<{data: Array, meta: Object}>}
 */
export async function fetchExperts({ page = 1, limit = 20, search = '', filters = {} }) {
    const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
    });

    // Add filters as comma-separated strings
    if (filters.region?.length) query.append('region', filters.region.join(','));
    if (filters.sector?.length) query.append('primary_sector', filters.sector.join(','));
    if (filters.status?.length) query.append('expert_status', filters.status.join(','));
    if (filters.employment?.length) query.append('current_employment_status', filters.employment.join(','));

    try {
        const result = await http(`/experts?${query.toString()}`);
        return result;
    } catch (error) {
        console.error('API Fetch failed, check if backend is running:', error);
        // Fallback or empty state
        return { data: [], meta: { total_records: 0, current_page: 1, total_pages: 1 } };
    }
}

/**
 * Get filter options (lookups) from the backend.
 * @returns {Promise<Object>}
 */
export async function getFilterOptions() {
    try {
        const result = await http('/lookups');
        return result.data || {};
    } catch (error) {
        console.error('Failed to fetch lookups:', error);
        return { region: [], sector: [], status: [], employment: [] };
    }
}

export async function fetchExpertById(id) {
    try {
        const result = await http(`/experts/${id}`);
        return result.data || null;
    } catch (error) {
        console.error(`Failed to fetch expert ${id}:`, error);
        return null;
    }
}

/**
 * Update an existing expert.
 * @param {string} id 
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
export async function updateExpert(id, data) {
    return await http(`/experts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * Delete an expert.
 * @param {string} id 
 * @returns {Promise<Object>}
 */
export async function deleteExpert(id) {
    return await http(`/experts/${id}`, {
        method: 'DELETE',
    });
}

/**
 * Delete multiple experts.
 * @param {Array<string>} ids 
 * @returns {Promise<Object>}
 */
export async function deleteExperts(ids) {
    return await http('/experts/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
    });
}
/**
 * Download the Excel template for expert import.
 */
export async function downloadImportTemplate() {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/import/template`, {
            method: 'GET',
        });
        if (!response.ok) throw new Error('Failed to download template');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'expert_import_template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Template download failed:', error);
        throw error;
    }
}

/**
 * Upload Excel file for preview/categorization.
 * @param {File} file 
 */
export async function previewImport(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${import.meta.env.VITE_API_URL}/import/preview`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to process import file');
    }

    return await response.json();
}

/**
 * Confirm the import of categorized records.
 * @param {Array} records 
 */
export async function confirmImport(records) {
    return await http('/import/confirm', {
        method: 'POST',
        body: JSON.stringify({ records }),
    });
}

/**
 * Export experts based on filters.
 * @param {Object} params - search, filters, etc.
 */
export async function exportExperts(params = {}) {
    const { search, filters, ids } = params;

    const query = new URLSearchParams();
    if (search) query.append('search', search);
    if (ids && ids.length > 0) query.append('ids', ids.join(','));

    if (filters) {
        Object.keys(filters).forEach(key => {
            const val = filters[key];
            if (Array.isArray(val) && val.length > 0) {
                query.append(key, val.join(','));
            } else if (val && !Array.isArray(val)) {
                query.append(key, val);
            }
        });
    }

    const url = `${import.meta.env.VITE_API_URL}/experts/export?${query.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to export experts');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.setAttribute('download', `experts_export_${timestamp}.xlsx`);

    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Fetch and format expert contact info for an email-ready list.
 * @param {Array<string>} expertIds - List of expert IDs to export
 */
export async function fetchEmailExport(expertIds) {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/experts/email-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expert_ids: expertIds }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch contact details for email export');
    }

    return await response.json();
}
