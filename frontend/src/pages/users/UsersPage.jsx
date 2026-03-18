import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bulkDeleteUsers, deleteUser, fetchUsers } from '../../api/users';
import Loader from '../../components/ui/Loader';
import Pagination from '../../components/experts/Pagination';
import UsersTable from '../../components/users/UsersTable';
import Button from '../../components/ui/Button';
import BulkDeleteBar from '../../components/ui/BulkDeleteBar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

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

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        fetchUsers({ page, limit: LIMIT, search }).then((result) => {
            if (cancelled) return;
            setData(result);
            setIsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [page, search, refreshKey]);

    const users = data?.data || [];
    const meta = data?.meta || { total_records: 0, current_page: 1, total_pages: 1, limit: LIMIT };

    const stats = useMemo(() => {
        return { totalUsers: meta.total_records || 0 };
    }, [meta.total_records]);

    const allSelected = useMemo(() => {
        if (!users.length) return false;
        return users.every((u) => selectedIds.has(u.user_id));
    }, [users, selectedIds]);

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

            <div className="card">
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
                    ) : users.length === 0 ? (
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

