import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import EngagementTable from '../components/engagements/EngagementTable';
import EngagementFilters from '../components/engagements/EngagementFilters';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import Loader from '../components/ui/Loader';
import Pagination from '../components/experts/Pagination';
import Button from '../components/ui/Button';
import { FilterIcon, ChevronDownIcon, XIcon } from '../components/icons/Icons';
import { http } from '../api/http';

export default function EngagementDashboardPage() {
    const navigate = useNavigate();
    const [engagements, setEngagements] = useState([]);
    const [lookups, setLookups] = useState({});
    const [meta, setMeta] = useState({ total_records: 0, current_page: 1, total_pages: 1, limit: 20 });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', status: '', month: '' });
    const debouncedSearch = useDebouncedValue(filters.search, 500);
    const [sort, setSort] = useState({ field: 'call_date', order: 'desc' });
    const [page, setPage] = useState(1);
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);

    const fetchLookups = async () => {
        try {
            const result = await http('/lookups');
            setLookups(result.data || {});
        } catch (error) {
            console.error('Error fetching lookups:', error);
        }
    };

    const fetchEngagements = useCallback(async (pageNum = 1, currentFilters = filters, currentSort = sort) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pageNum.toString(),
                limit: '20',
                sort_by: currentSort.field,
                order: currentSort.order,
                ...Object.fromEntries(Object.entries(currentFilters).filter(([, v]) => v !== ''))
            });
            const result = await http(`/engagements?${params}`);
            setEngagements(result.data || []);
            setMeta(result.meta || { total_records: 0, current_page: pageNum, total_pages: 1, limit: 20 });
        } catch (error) {
            console.error('Error fetching engagements:', error);
        } finally {
            setLoading(false);
        }
    }, [sort, filters]);

    useEffect(() => {
        fetchLookups();
    }, []);

    useEffect(() => {
        const currentFilters = { ...filters, search: debouncedSearch };
        fetchEngagements(page, currentFilters);
    }, [debouncedSearch, filters, page, fetchEngagements]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPage(1);
    };

    const handleSort = (field) => {
        const order = sort.field === field && sort.order === 'asc' ? 'desc' : 'asc';
        setSort({ field, order });
        setPage(1);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this engagement?')) return;
        await http(`/engagements/${id}`, { method: 'DELETE' });
        fetchEngagements(page);
    };

    const stats = useMemo(() => {
        return { totalEngagements: meta.total_records || engagements.length || 0 };
    }, [meta.total_records, engagements.length]);
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.status) count += 1;
        if (filters.month) count += 1;
        return count;
    }, [filters.status, filters.month]);

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Engagement Management</h1>
            </div>

            <div className={`card${filtersPanelOpen ? ' card--overflow-visible' : ''}`}>
                <div className="action-bar">
                    <div className="search-wrapper">
                        <i className="fa-solid fa-magnifying-glass search-icon" aria-hidden="true" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => {
                                setFilters((prev) => ({ ...prev, search: e.target.value }));
                                setPage(1);
                            }}
                            placeholder="Search by project or expert..."
                            className="search-input"
                        />
                        {filters.search?.trim() && (
                            <button
                                type="button"
                                className="search-clear"
                                aria-label="Clear search"
                                onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                            >
                                <XIcon width={14} height={14} />
                            </button>
                        )}
                    </div>

                    <div className="action-bar__filters">
                        <button
                            type="button"
                            className="btn btn--secondary btn--sm btn-filters"
                            aria-expanded={filtersPanelOpen}
                            onClick={() => setFiltersPanelOpen((o) => !o)}
                        >
                            <FilterIcon />
                            Filters
                            {activeFiltersCount > 0 && <span className="filters-count">{activeFiltersCount}</span>}
                            <ChevronDownIcon className="chev" />
                        </button>
                    </div>

                    <div className="action-bar__divider" aria-hidden="true" />

                    <div className="action-bar__actions">
                        <span className="badge badge-outline-theme">Engagements: {stats.totalEngagements}</span>
                        <Button variant="primary" onClick={() => navigate('/engagements/new')}>
                            + Create Engagement
                        </Button>
                    </div>
                </div>

                <div className="content-area">
                    {loading ? (
                        <Loader rows={8} />
                    ) : (
                        <>
                            <EngagementFilters
                                open={filtersPanelOpen}
                                onClose={() => setFiltersPanelOpen(false)}
                                onClearAll={() => setFilters((prev) => ({ ...prev, status: '', month: '' }))}
                                filters={filters}
                                onFilterChange={handleFilterChange}
                                lookups={lookups}
                            />
                            <EngagementTable
                                engagements={engagements}
                                onEdit={(id) => navigate(`/engagements/${id}/edit`)}
                                onDelete={handleDelete}
                                onRowClick={(id) => navigate(`/engagements/${id}`)}
                                sortBy={sort.field}
                                sortOrder={sort.order}
                                onSort={handleSort}
                            />
                            {engagements.length > 0 && (
                                <Pagination
                                    page={meta.current_page}
                                    totalPages={meta.total_pages}
                                    totalRecords={meta.total_records}
                                    onPageChange={setPage}
                                    itemLabel="engagements"
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
