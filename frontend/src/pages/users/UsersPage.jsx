import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { bulkDeleteUsers, deleteUser, fetchUsers } from '../../api/users';
import { fetchClients } from '../../api/clients';
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
    const [filters, setFilters] = useState({ clients: [], client_type: [], seniority: [], locations: [] });
    const [clientList, setClientList] = useState([]);
    const [optionsSourceUsers, setOptionsSourceUsers] = useState([]);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        const clientNameToId = {};
        (clientList || []).forEach((c) => (clientNameToId[c.client_name] = c.client_id));
        const selectedClientIds = (filters.clients || []).map((n) => clientNameToId[n]).filter(Boolean);

        fetchUsers({
            page,
            limit: LIMIT,
            search,
            filters: {
                client_id: selectedClientIds,
                client_type: filters.client_type || [],
                seniority: filters.seniority || [],
                location: filters.locations || [],
            },
        }).then((result) => {
            if (cancelled) return;
            const s = (v) => String(v || '').trim().toLowerCase();
            const nameSet = new Set((filters.clients || []).map(s));
            const typeSet = new Set((filters.client_type || []).map(s));
            const senSet = new Set((filters.seniority || []).map(s));
            const locSet = new Set((filters.locations || []).map(s));
            const idSet = new Set(selectedClientIds.map((id) => String(id)));
            const filtered = (result.data || []).filter((u) => {
                const byClient =
                    nameSet.size === 0 &&
                    idSet.size === 0
                        ? true
                        : idSet.has(String(u.client_id)) || nameSet.has(s(u.client_name));
                const byType = typeSet.size === 0 ? true : typeSet.has(s(u.client_type));
                const bySeniority = senSet.size === 0 ? true : senSet.has(s(u.seniority));
                const byLocation = locSet.size === 0 ? true : locSet.has(s(u.location));
                return byClient && byType && bySeniority && byLocation;
            });
            setData({ data: filtered, meta: { total_records: filtered.length, current_page: 1, total_pages: 1, limit: LIMIT } });
            setIsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [page, search, refreshKey, filters, clientList]);

    useEffect(() => {
        setPage(1);
        setSelectedIds(new Set());
    }, [filters]);
    useEffect(() => {
        fetchClients({ page: 1, limit: 1000, search: '' }).then((r) => setClientList(r.data || []));
        fetchUsers({ page: 1, limit: 1000, search: '' }).then((r) => setOptionsSourceUsers(r.data || []));
    }, []);

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
        const names = Array.from(new Set((clientList || []).map((c) => c.client_name).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        const types = Array.from(new Set((optionsSourceUsers || []).map((u) => u.client_type).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        const sen = Array.from(new Set((optionsSourceUsers || []).map((u) => u.seniority).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        const locs = Array.from(new Set((optionsSourceUsers || []).map((u) => u.location).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        return { clientNames: names, clientTypes: types, seniority: sen, locations: locs };
    }, [clientList, optionsSourceUsers]);

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
                <p className="page-subtitle">Search and manage client users</p>
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
                            + Add User
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

