import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bulkDeleteProjects, deleteProject, fetchProjectsPaged } from '../../api/projects';
import { fetchClients } from '../../api/clients';
import { fetchUsers } from '../../api/users';
import Loader from '../../components/ui/Loader';
import Pagination from '../../components/experts/Pagination';
import Button from '../../components/ui/Button';
import ProjectsTable from '../../components/projects/ProjectsTable';
import BulkDeleteBar from '../../components/ui/BulkDeleteBar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function ProjectsPage() {
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

    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        // lightweight caches for label mapping
        fetchClients({ page: 1, limit: 1000, search: '' }).then((r) => setClients(r.data || []));
        fetchUsers({ page: 1, limit: 1000, search: '' }).then((r) => setUsers(r.data || []));
    }, []);

    const clientById = useMemo(() => {
        const map = new Map();
        for (const c of clients) map.set(c.client_id, c);
        return map;
    }, [clients]);

    const userById = useMemo(() => {
        const map = new Map();
        for (const u of users) map.set(u.user_id, u);
        return map;
    }, [users]);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchProjectsPaged({ page, limit: LIMIT, search }).then((result) => {
            if (cancelled) return;
            setData(result);
            setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [page, search, refreshKey]);

    const projects = useMemo(() => {
        const rows = data?.data || [];
        return rows.map((p) => ({
            ...p,
            client_name: p.client_name || clientById.get(p.client_id)?.client_name || null,
            poc_user_name: p.poc_user_name || userById.get(p.poc_user_id)?.user_name || null,
        }));
    }, [data, clientById, userById]);

    const meta = data?.meta || { total_records: 0, current_page: 1, total_pages: 1, limit: LIMIT };

    const allSelected = useMemo(() => {
        if (!projects.length) return false;
        return projects.every((p) => selectedIds.has(p.project_id));
    }, [projects, selectedIds]);

    const onSelectProject = (projectId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(projectId)) next.delete(projectId);
            else next.add(projectId);
            return next;
        });
    };

    const onSelectAll = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const shouldSelectAll = !projects.every((p) => next.has(p.project_id));
            if (shouldSelectAll) {
                for (const p of projects) next.add(p.project_id);
            } else {
                for (const p of projects) next.delete(p.project_id);
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
                await deleteProject(confirmIds[0]);
            } else {
                await bulkDeleteProjects(confirmIds);
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
                <h1 className="page-title">Project Management</h1>
                <p className="page-subtitle">Create and manage projects</p>
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
                            placeholder="Search projects..."
                            className="search-input"
                        />
                    </div>

                    <div className="action-bar__divider" aria-hidden="true" />

                    <div className="action-bar__actions">
                        <Button variant="primary" onClick={() => navigate('/projects/new')}>
                            + Add Project
                        </Button>
                    </div>
                </div>

                <div className="content-area">
                    {isLoading ? (
                        <Loader rows={8} />
                    ) : projects.length === 0 ? (
                        <div className="empty-state">
                            <p className="empty-state__text">No projects found</p>
                        </div>
                    ) : (
                        <>
                            <BulkDeleteBar
                                count={selectedIds.size}
                                label="projects selected"
                                onDelete={() => openConfirmForIds(Array.from(selectedIds))}
                                onClear={() => setSelectedIds(new Set())}
                            />
                            <ProjectsTable
                                projects={projects}
                                selectedIds={selectedIds}
                                onSelectProject={onSelectProject}
                                onSelectAll={onSelectAll}
                                allSelected={allSelected}
                                onDeleteProject={(p) => openConfirmForIds([p.project_id])}
                            />
                            <Pagination
                                page={meta.current_page}
                                totalPages={meta.total_pages}
                                totalRecords={meta.total_records}
                                onPageChange={(nextPage) => {
                                    setSelectedIds(new Set());
                                    setPage(nextPage);
                                }}
                                itemLabel="projects"
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
                title={confirmIds.length > 1 ? 'Delete projects?' : 'Delete project?'}
                message={
                    confirmIds.length > 1
                        ? `This will permanently delete ${confirmIds.length} projects. This action cannot be undone.`
                        : 'This will permanently delete this project. This action cannot be undone.'
                }
                confirmLabel="Delete"
                isDestructive={true}
                isLoading={isDeleting}
            />
        </>
    );
}

