import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { bulkDeleteUsers, deleteUser, fetchUsersSummary, fetchUserFilterOptions } from '../../api/users';
import Loader from '../../components/ui/Loader';
import Pagination from '../../components/experts/Pagination';
import UsersTable from '../../components/users/UsersTable';
import Button from '../../components/ui/Button';
import BulkDeleteBar from '../../components/ui/BulkDeleteBar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import UsersFiltersPanel from '../../components/users/UsersFiltersPanel';
import { FilterIcon, ChevronDownIcon, XIcon } from '../../components/icons/Icons';

export default function UsersPage() {
    const LIMIT = 20;
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmIds, setConfirmIds] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);

    // Filters hold the human-readable names
    const [filters, setFilters] = useState({ clients: [], client_type: [], seniority: [], locations: [] });
    const [filterOptionsData, setFilterOptionsData] = useState(null);
    const clientNameToIdMap = useRef({});

    // 1. Fetch filter options ONCE on mount instead of all users and clients
    useEffect(() => {
        let mounted = true;
        fetchUserFilterOptions().then((opts) => {
            if (mounted) setFilterOptionsData(opts);
        });
        return () => { mounted = false; };
    }, []);

    // 2. We still need client_id mapping for the filter parameters, but we only have names
    useEffect(() => {
        let mounted = true;
        import('../../api/users').then(({ fetchUserFormLookups }) => {
            fetchUserFormLookups().then(data => {
                if (!mounted) return;
                const map = {};
                (data.clients || []).forEach(c => map[c.client_name] = c.client_id);
                clientNameToIdMap.current = map;
            });
        });
        return () => { mounted = false; };
    }, []);

    // 3. Main Data Fetching (Replaces fetchUsers with fetchUsersSummary)
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        const selectedClientIds = (filters.clients || []).map((n) => clientNameToIdMap.current[n]).filter(Boolean);

        fetchUsersSummary({
            page,
            limit: LIMIT,
            search,
            filters: {
                // Pass IDs if available, else passing empty array handles it gracefully
                client_id: selectedClientIds.length > 0 ? selectedClientIds : [],
                client_type: filters.client_type || [],
                seniority: filters.seniority || [],
                location: filters.locations || [],
            },
        }).then((result) => {
            if (cancelled) return;
            // Removed client-side filtering completely!
            // Backend now handles all filtering correctly.
            setData(result);
            setIsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [page, search, refreshKey, filters]);

    useEffect(() => {
        setPage(1);
        setSelectedIds(new Set());
    }, [filters]);

    const users = data?.data || [];
    const meta = data?.meta || { total_records: 0, current_page: 1, total_pages: 1, limit: LIMIT };

    const stats = useMemo(() => {
        return { totalUsers: meta.total_records || 0 };
    }, [meta.total_records]);

    const allSelected = useMemo(() => {
        if (!users.length) return false;
        return users.every((u) => selectedIds.has(u.user_id));
    }, [users, selectedIds]);

    const activeFiltersCount = useMemo(() => {
        return (filters.clients?.length || 0) + (filters.client_type?.length || 0) + (filters.seniority?.length || 0) + (filters.locations?.length || 0);
    }, [filters]);

    const filterOptions = useMemo(() => {
        if (!filterOptionsData) return { clientNames: [], clientTypes: [], seniority: [], locations: [] };
        return {
            clientNames: filterOptionsData.client_names || [],
            clientTypes: filterOptionsData.client_types || [],
            seniority: filterOptionsData.seniorities || [],
            locations: filterOptionsData.locations || []
        };
    }, [filterOptionsData]);

    const onSelectUser = (userId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const onSelectAll = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const shouldSelectAll = !users.every((u) => next.has(u.user_id));
            if (shouldSelectAll) {
                for (const u of users) next.add(u.user_id);
            } else {
                for (const u of users) next.delete(u.user_id);
            }
            return next;
        });
    };

    const handleToggleFilters = useCallback(() => {
        setFiltersPanelOpen((prev) => !prev);
    }, []);

    const handleClearAllFilters = useCallback(() => {
        setFilters({ clients: [], client_type: [], seniority: [], locations: [] });
        setPage(1);
    }, []);

    const openConfirmForIds = (ids) => {
        setConfirmIds(ids);
        setConfirmOpen(true);
    };

    const handleDeleteConfirmed = async () => {
        if (!confirmIds.length) return;
        setIsDeleting(true);
        try {
            if (confirmIds.length === 1) {
                await deleteUser(confirmIds[0]);
            } else {
                await bulkDeleteUsers(confirmIds);
            }
            setSelectedIds((prev) => {
                const next = new Set(prev);
                for (const id of confirmIds) next.delete(id);
                return next;
            });
            setConfirmOpen(false);
            setConfirmIds([]);
            setRefreshKey((k) => k + 1);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">User Management</h1>
            </div>

            <div className={`card${filtersPanelOpen ? ' card--overflow-visible' : ''}`}>
                <div className="action-bar">
                    <div className="search-wrapper">
                        <i className="fa-solid fa-magnifying-glass search-icon" aria-hidden="true" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setSelectedIds(new Set());
                                setPage(1);
                            }}
                            placeholder="Search users..."
                            className="search-input"
                        />
                        {search?.trim() && (
                            <button
                                type="button"
                                className="search-clear"
                                aria-label="Clear search"
                                onClick={() => setSearch('')}
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
                            onClick={handleToggleFilters}
                        >
                            <FilterIcon />
                            Filters
                            {activeFiltersCount > 0 && <span className="filters-count">{activeFiltersCount}</span>}
                            <ChevronDownIcon className="chev" />
                        </button>
                    </div>

                    <div className="action-bar__divider" aria-hidden="true" />

                    <div className="action-bar__actions">
                        <span className="badge badge-outline-theme">Users: {stats.totalUsers}</span>
                        <Button variant="primary" onClick={() => navigate('/users/new')}>
                            + Create User
                        </Button>
                    </div>
                </div>

                <div className="content-area">
                    {isLoading ? (
                        <Loader rows={8} />
                    ) : (
                        <>
                            <UsersFiltersPanel
                                open={filtersPanelOpen}
                                onClose={() => setFiltersPanelOpen(false)}
                                onClearAll={handleClearAllFilters}
                                filters={filters}
                                setFilters={setFilters}
                                options={filterOptions}
                            />
                            {users.length === 0 ? (
                                <div className="empty-state">
                                    <p className="empty-state__text">No users found</p>
                                </div>
                            ) : (
                                <>
                                    <BulkDeleteBar
                                        count={selectedIds.size}
                                        label="users selected"
                                        onDelete={() => openConfirmForIds(Array.from(selectedIds))}
                                        onClear={() => setSelectedIds(new Set())}
                                    />
                                    <UsersTable
                                        users={users}
                                        selectedIds={selectedIds}
                                        onSelectUser={onSelectUser}
                                        onSelectAll={onSelectAll}
                                        allSelected={allSelected}
                                        onDeleteUser={(u) => openConfirmForIds([u.user_id])}
                                    />
                                    <Pagination
                                        page={meta.current_page}
                                        totalPages={meta.total_pages}
                                        totalRecords={meta.total_records}
                                        onPageChange={(nextPage) => {
                                            setSelectedIds(new Set());
                                            setPage(nextPage);
                                        }}
                                        itemLabel="users"
                                    />
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => {
                    if (!isDeleting) setConfirmOpen(false);
                }}
                onConfirm={handleDeleteConfirmed}
                title={confirmIds.length > 1 ? 'Delete users?' : 'Delete user?'}
                message={
                    confirmIds.length > 1
                        ? `This will permanently delete ${confirmIds.length} users. This action cannot be undone.`
                        : 'This will permanently delete this user. This action cannot be undone.'
                }
                confirmLabel="Delete"
                isDestructive={true}
                isLoading={isDeleting}
            />
        </>
    );
}
