import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bulkDeleteClients, deleteClient, fetchClients, fetchClientUsers, fetchProjects } from '../../api/clients';
import ClientsTable from '../../components/clients/ClientsTable';
import Loader from '../../components/ui/Loader';
import Pagination from '../../components/experts/Pagination';
import Button from '../../components/ui/Button';
import BulkDeleteBar from '../../components/ui/BulkDeleteBar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function ClientsPage() {
    const LIMIT = 20;
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ total_records: 0, current_page: 1, total_pages: 1, limit: LIMIT });
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmIds, setConfirmIds] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        Promise.all([
            fetchClients({ page, limit: LIMIT, search }),
            fetchClientUsers(),
            fetchProjects(),
        ])
            .then(([clientsResult, usersData, projectsData]) => {
                if (cancelled) return;
                setClients(clientsResult.data);
                setMeta(clientsResult.meta);
                setUsers(usersData);
                setProjects(projectsData);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [page, search, refreshKey]);

    const usersById = useMemo(() => {
        const map = {};
        for (const u of users) map[u.user_id] = u;
        return map;
    }, [users]);

    const projectsByClientId = useMemo(() => {
        const map = {};
        for (const p of projects) {
            const key = p.client_id;
            if (!map[key]) map[key] = [];
            map[key].push(p);
        }
        return map;
    }, [projects]);

    // Search is handled server-side for pagination correctness.
    const filteredClients = clients;

    const allSelected = useMemo(() => {
        if (!filteredClients.length) return false;
        return filteredClients.every((c) => selectedIds.has(c.client_id));
    }, [filteredClients, selectedIds]);

    const onSelectClient = (clientId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(clientId)) next.delete(clientId);
            else next.add(clientId);
            return next;
        });
    };

    const onSelectAll = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const shouldSelectAll = !filteredClients.every((c) => next.has(c.client_id));
            if (shouldSelectAll) {
                for (const c of filteredClients) next.add(c.client_id);
            } else {
                for (const c of filteredClients) next.delete(c.client_id);
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
                await deleteClient(confirmIds[0]);
            } else {
                await bulkDeleteClients(confirmIds);
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

    const stats = useMemo(() => {
        const totalClients = clients.length;
        const totalProjects = projects.length;
        return { totalClients, totalProjects };
    }, [clients, projects]);

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Client Management</h1>
                <p className="page-subtitle">Search and manage client accounts</p>
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
                            placeholder="Search clients..."
                            className="search-input"
                        />
                    </div>

                    <div className="action-bar__divider" aria-hidden="true" />

                    <div className="action-bar__actions">
                        <span className="badge badge-outline-theme">Clients: {stats.totalClients}</span>
                        <span className="badge badge-outline-theme">Projects: {stats.totalProjects}</span>
                        <Button variant="primary" onClick={() => navigate('/clients/new')}>
                            + Add Client
                        </Button>
                    </div>
                </div>

                <div className="content-area">
                    {isLoading ? (
                        <Loader rows={8} />
                    ) : (
                        <>
                            <BulkDeleteBar
                                count={selectedIds.size}
                                label="clients selected"
                                onDelete={() => openConfirmForIds(Array.from(selectedIds))}
                                onClear={() => setSelectedIds(new Set())}
                            />
                            <ClientsTable
                                clients={filteredClients}
                                usersById={usersById}
                                projectsByClientId={projectsByClientId}
                                selectedIds={selectedIds}
                                onSelectClient={onSelectClient}
                                onSelectAll={onSelectAll}
                                allSelected={allSelected}
                                onDeleteClient={(row) => openConfirmForIds([row.client_id])}
                            />

                            {filteredClients.length > 0 && (
                                <Pagination
                                    page={meta.current_page}
                                    totalPages={meta.total_pages}
                                    totalRecords={meta.total_records}
                                    onPageChange={(nextPage) => {
                                        setSelectedIds(new Set());
                                        setPage(nextPage);
                                    }}
                                    itemLabel="clients"
                                />
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
                title={confirmIds.length > 1 ? 'Delete clients?' : 'Delete client?'}
                message={
                    confirmIds.length > 1
                        ? `This will permanently delete ${confirmIds.length} clients. This action cannot be undone.`
                        : 'This will permanently delete this client. This action cannot be undone.'
                }
                confirmLabel="Delete"
                isDestructive={true}
                isLoading={isDeleting}
            />
        </>
    );
}

