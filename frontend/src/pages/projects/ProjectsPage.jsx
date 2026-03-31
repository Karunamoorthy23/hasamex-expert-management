import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { bulkDeleteProjects, deleteProject, fetchProjectSummary, fetchProjectFilterOptions, fetchProjectExpertStatus, setProjectExpertStatus, setProjectCallAssignment } from '../../api/projects';
import Loader from '../../components/ui/Loader';
import Pagination from '../../components/experts/Pagination';
import Button from '../../components/ui/Button';
import ProjectsTable from '../../components/projects/ProjectsTable';
import BulkDeleteBar from '../../components/ui/BulkDeleteBar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import { FilterIcon, ChevronDownIcon, XIcon } from '../../components/icons/Icons';
import ProjectsFiltersPanel from '../../components/projects/ProjectsFiltersPanel';

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
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);

    // Filters hold the human-readable names
    const [filters, setFilters] = useState({ clients: [], ra: [], months: [], years: [] });
    const [filterOptionsData, setFilterOptionsData] = useState(null);
    const clientNameToIdMap = useRef({});

    // 1. Fetch filter dropdown options ONCE on mount
    useEffect(() => {
        let mounted = true;
        fetchProjectFilterOptions().then((opts) => {
            if (mounted) setFilterOptionsData(opts);
        });
        return () => { mounted = false; };
    }, []);

    // 2. Fetch mapping dictionary for client names -> IDs
    useEffect(() => {
        let mounted = true;
        import('../../api/projects').then(({ fetchProjectFormLookups }) => {
            fetchProjectFormLookups().then(data => {
                if (!mounted) return;
                const map = {};
                (data.clients || []).forEach(c => map[c.client_name] = c.client_id);
                clientNameToIdMap.current = map;
            });
        });
        return () => { mounted = false; };
    }, []);

    // 3. Main paginated fetch loop (server-side filtering)
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        const selectedClientIds = (filters.clients || []).map((n) => clientNameToIdMap.current[n]).filter(Boolean);

        fetchProjectSummary({
            page,
            limit: LIMIT,
            search,
            filters: {
                client_id: selectedClientIds.length > 0 ? selectedClientIds : [],
                ra: filters.ra || [],
                months: filters.months || [],
                years: filters.years || [],
            },
        }).then((result) => {
            if (cancelled) return;
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

    const projects = data?.data || [];
    const meta = data?.meta || { total_records: 0, current_page: 1, total_pages: 1, limit: LIMIT };

    const allSelected = useMemo(() => {
        if (!projects.length) return false;
        return projects.every((p) => selectedIds.has(p.project_id));
    }, [projects, selectedIds]);

    const activeFiltersCount = useMemo(() => {
        return (filters.clients?.length || 0) + (filters.ra?.length || 0) + (filters.months?.length || 0) + (filters.years?.length || 0);
    }, [filters]);

    const filterOptions = useMemo(() => {
        if (!filterOptionsData) return { clientNames: [], raNames: [], months: [], years: [] };
        return {
            clientNames: filterOptionsData.client_names || [],
            raNames: filterOptionsData.ra_names || [],
            months: filterOptionsData.months || [],
            years: filterOptionsData.years || []
        };
    }, [filterOptionsData]);

    const handleToggleFilters = useCallback(() => {
        setFiltersPanelOpen((prev) => !prev);
    }, []);
    const handleClearAllFilters = useCallback(() => {
        setFilters({ clients: [], ra: [], months: [], years: [] });
        setPage(1);
    }, []);

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

    const [statusOpen, setStatusOpen] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [activeProject, setActiveProject] = useState(null);
    const [statusData, setStatusData] = useState({ leads: [], invited: [], accepted: [], declined: [], scheduled: [], completed: [], counts: { L: 0, I: 0, A: 0, D: 0, S: 0, C: 0 } });
    const [statusSearch, setStatusSearch] = useState('');
    const [updatingId, setUpdatingId] = useState(null);

    const onOpenStatusModal = async (project) => {
        setActiveProject(project);
        setStatusOpen(true);
        setStatusLoading(true);
        try {
            const res = await fetchProjectExpertStatus(project.project_id);
            setStatusData(res);
        } finally {
            setStatusLoading(false);
        }
    };

    const changeExpertCategory = async (expertId, nextCategory, currentCategory) => {
        if (!activeProject) return;
        try {
            setUpdatingId(expertId);
            let updatedProject = null;
            const isNextSC = nextCategory === 'S' || nextCategory === 'C';
            const isCurrSC = currentCategory === 'S' || currentCategory === 'C';
            if (isNextSC) {
                const cap = nextCategory === 'S' ? (activeProject?.scheduled_calls_count ?? 0) : (activeProject?.completed_calls_count ?? 0);
                const currentAssigned = nextCategory === 'S' ? ((statusData?.counts?.S ?? 0)) : ((statusData?.counts?.C ?? 0));
                if (currentCategory !== nextCategory) {
                    if (cap === 0 || currentAssigned >= cap) {
                        alert(nextCategory === 'S' ? 'Scheduled capacity reached' : 'Completed capacity reached');
                        return;
                    }
                }
            }
            if (isNextSC) {
                if (isCurrSC && nextCategory !== currentCategory) {
                    await setProjectCallAssignment(activeProject.project_id, { expert_id: expertId, category: currentCategory, action: 'REMOVE' });
                }
                updatedProject = await setProjectCallAssignment(activeProject.project_id, { expert_id: expertId, category: nextCategory, action: 'ADD' });
            } else {
                if (isCurrSC) {
                    await setProjectCallAssignment(activeProject.project_id, { expert_id: expertId, category: currentCategory, action: 'REMOVE' });
                }
                updatedProject = await setProjectExpertStatus(activeProject.project_id, { expert_id: expertId, category: nextCategory });
            }
            // Update counts in table data
            setData((prev) => {
                if (!prev) return prev;
                const nextRows = prev.data.map((p) => (p.project_id === updatedProject.project_id ? { ...p, ...updatedProject } : p));
                return { ...prev, data: nextRows };
            });
            // Optimistically move expert across lists locally
            setStatusData((prev) => {
                const lists = {
                    leads: [...prev.leads],
                    invited: [...prev.invited],
                    accepted: [...prev.accepted],
                    declined: [...prev.declined],
                    scheduled: [...prev.scheduled],
                    completed: [...prev.completed],
                };
                let obj = null;
                for (const key of ['leads', 'invited', 'accepted', 'declined', 'scheduled', 'completed']) {
                    const idx = lists[key].findIndex((e) => e.id === expertId);
                    if (idx >= 0) {
                        obj = lists[key][idx];
                        lists[key].splice(idx, 1);
                        break;
                    }
                }
                const targetKey = nextCategory === 'L' ? 'leads' : nextCategory === 'I' ? 'invited' : nextCategory === 'A' ? 'accepted' : nextCategory === 'D' ? 'declined' : nextCategory === 'S' ? 'scheduled' : 'completed';
                if (!obj) {
                    const sourceKey = currentCategory === 'L' ? 'leads' : currentCategory === 'I' ? 'invited' : currentCategory === 'A' ? 'accepted' : currentCategory === 'D' ? 'declined' : currentCategory === 'S' ? 'scheduled' : 'completed';
                    const idx2 = lists[sourceKey].findIndex((e) => e.id === expertId);
                    if (idx2 >= 0) {
                        obj = lists[sourceKey][idx2];
                        lists[sourceKey].splice(idx2, 1);
                    }
                }
                if (obj) {
                    lists[targetKey] = [obj, ...lists[targetKey]];
                }
                const counts = {
                    L: lists.leads.length,
                    I: lists.invited.length,
                    A: lists.accepted.length,
                    D: lists.declined.length,
                    S: lists.scheduled.length,
                    C: lists.completed.length,
                };
                return { leads: lists.leads, invited: lists.invited, accepted: lists.accepted, declined: lists.declined, scheduled: lists.scheduled, completed: lists.completed, counts };
            });
        } catch (err) {
            console.error('Failed to update expert category', err);
            const msg = (err && err.data && err.data.error) ? err.data.error : 'Failed to update expert category';
            alert(msg);
        } finally {
            setUpdatingId(null);
        }
    };


    return (
        <>
            <div className="page-header">
                <h1 className="page-title">Project Management</h1>
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
                            placeholder="Search projects..."
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
                        <Button variant="primary" onClick={() => navigate('/projects/new')}>
                            + Create Project
                        </Button>
                    </div>
                </div>

                <div className="content-area">
                    {isLoading ? (
                        <Loader rows={8} />
                    ) : (
                        <>
                            <ProjectsFiltersPanel
                                open={filtersPanelOpen}
                                onClose={() => setFiltersPanelOpen(false)}
                                onClearAll={handleClearAllFilters}
                                filters={filters}
                                setFilters={setFilters}
                                options={filterOptions}
                            />
                            {projects.length === 0 ? (
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
                                        onOpenStatusModal={onOpenStatusModal}
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

            {statusOpen && (
                <Modal
                    open={statusOpen}
                    onClose={() => setStatusOpen(false)}
                    title={`Experts by Status — ${activeProject?.project_title || activeProject?.title || 'Project'}`}
                >
                    {statusLoading ? (
                        <Loader rows={6} />
                    ) : (
                        <div className="form-grid">
                            <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Search Experts</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="Search by name, email, or title"
                                    value={statusSearch}
                                    onChange={(e) => setStatusSearch(e.target.value)}
                                />
                            </div>
                            {(() => {
                                const q = statusSearch.trim().toLowerCase();
                                const match = (e) =>
                                    !q ||
                                    (e.name && e.name.toLowerCase().includes(q)) ||
                                    (e.email && e.email.toLowerCase().includes(q)) ||
                                    (e.title && String(e.title).toLowerCase().includes(q));
                                const leadsList = statusData.leads.filter(match);
                                const invitedList = statusData.invited.filter(match);
                                const acceptedList = statusData.accepted.filter(match);
                                const declinedList = (statusData.declined || []).filter(match);
                                const scheduledList = (statusData.scheduled || []).filter(match);
                                const completedList = (statusData.completed || []).filter(match);
                                const scheduledCapReached = (() => {
                                    const cap = activeProject?.scheduled_calls_count ?? 0;
                                    const assigned = statusData?.counts?.S ?? 0;
                                    if (cap === 0) return true;
                                    return assigned >= cap;
                                })();
                                const completedCapReached = (() => {
                                    const cap = activeProject?.completed_calls_count ?? 0;
                                    const assigned = statusData?.counts?.C ?? 0;
                                    if (cap === 0) return true;
                                    return assigned >= cap;
                                })();
                                return (
                                    <>
                                        <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                            <label className="form-label">Leads (L)</label>
                                            <table className="data-table">
                                                <thead>
                                                    <tr><th>Name</th><th>Email</th><th>Title</th><th>Category</th></tr>
                                                </thead>
                                                <tbody>
                                                    {leadsList.map((e) => (
                                                        <tr key={`L-${e.id}`}>
                                                            <td>{e.name}</td>
                                                            <td>{e.email}</td>
                                                            <td>{e.title || '—'}</td>
                                                            <td>
                                                                <select value="L" onChange={(ev) => changeExpertCategory(e.id, ev.target.value, 'L')} disabled={updatingId === e.id}>
                                                                    <option value="L">Leads</option>
                                                                    <option value="I">Invited</option>
                                                                    <option value="A">Accepted</option>
                                                                    <option value="D">Declined</option>
                                                                    <option value="S" disabled={scheduledCapReached}>Scheduled</option>
                                                                    <option value="C" disabled={completedCapReached}>Completed</option>
                                                                </select>
                                                                {updatingId === e.id && (
                                                                    <svg width="14" height="14" viewBox="0 0 50 50" style={{ marginLeft: 6 }}>
                                                                        <circle cx="25" cy="25" r="20" stroke="#888" strokeWidth="5" fill="none" strokeDasharray="31.4 31.4">
                                                                            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                                                                        </circle>
                                                                    </svg>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {leadsList.length === 0 && (
                                                        <tr><td colSpan="4">No matching leads</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                            <label className="form-label">Invited (I)</label>
                                            <table className="data-table">
                                                <thead>
                                                    <tr><th>Name</th><th>Email</th><th>Title</th><th>Category</th></tr>
                                                </thead>
                                                <tbody>
                                                    {invitedList.map((e) => (
                                                        <tr key={`I-${e.id}`}>
                                                            <td>{e.name}</td>
                                                            <td>{e.email}</td>
                                                            <td>{e.title || '—'}</td>
                                                            <td>
                                                                <select value="I" onChange={(ev) => changeExpertCategory(e.id, ev.target.value, 'I')} disabled={updatingId === e.id}>
                                                                    <option value="L">Leads</option>
                                                                    <option value="I">Invited</option>
                                                                    <option value="A">Accepted</option>
                                                                    <option value="D">Declined</option>
                                                                    <option value="S" disabled={scheduledCapReached}>Scheduled</option>
                                                                    <option value="C" disabled={completedCapReached}>Completed</option>
                                                                </select>
                                                                {updatingId === e.id && (
                                                                    <svg width="14" height="14" viewBox="0 0 50 50" style={{ marginLeft: 6 }}>
                                                                        <circle cx="25" cy="25" r="20" stroke="#888" strokeWidth="5" fill="none" strokeDasharray="31.4 31.4">
                                                                            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                                                                        </circle>
                                                                    </svg>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {invitedList.length === 0 && (
                                                        <tr><td colSpan="4">No matching invited experts</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                            <label className="form-label">Accepted (A)</label>
                                            <table className="data-table">
                                                <thead>
                                                    <tr><th>Name</th><th>Email</th><th>Title</th><th>Category</th></tr>
                                                </thead>
                                                <tbody>
                                                    {acceptedList.map((e) => (
                                                        <tr key={`A-${e.id}`}>
                                                            <td>{e.name}</td>
                                                            <td>{e.email}</td>
                                                            <td>{e.title || '—'}</td>
                                                            <td>
                                                                <select value="A" onChange={(ev) => changeExpertCategory(e.id, ev.target.value, 'A')} disabled={updatingId === e.id}>
                                                                    <option value="L">Leads</option>
                                                                    <option value="I">Invited</option>
                                                                    <option value="A">Accepted</option>
                                                                    <option value="D">Declined</option>
                                                                    <option value="S" disabled={scheduledCapReached}>Scheduled</option>
                                                                    <option value="C" disabled={completedCapReached}>Completed</option>
                                                                </select>
                                                                {updatingId === e.id && (
                                                                    <svg width="14" height="14" viewBox="0 0 50 50" style={{ marginLeft: 6 }}>
                                                                        <circle cx="25" cy="25" r="20" stroke="#888" strokeWidth="5" fill="none" strokeDasharray="31.4 31.4">
                                                                            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                                                                        </circle>
                                                                    </svg>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {acceptedList.length === 0 && (
                                                        <tr><td colSpan="4">No matching accepted experts</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                            <label className="form-label">Scheduled (S)</label>
                                            <table className="data-table">
                                                <thead>
                                                    <tr><th>Name</th><th>Email</th><th>Title</th><th>Category</th></tr>
                                                </thead>
                                                <tbody>
                                                    {scheduledList.map((e) => (
                                                        <tr key={`S-${e.id}`}>
                                                            <td>{e.name}</td>
                                                            <td>{e.email}</td>
                                                            <td>{e.title || '—'}</td>
                                                            <td>
                                                                <select value="S" onChange={(ev) => changeExpertCategory(e.id, ev.target.value, 'S')} disabled={updatingId === e.id}>
                                                                    <option value="L">Leads</option>
                                                                    <option value="I">Invited</option>
                                                                    <option value="A">Accepted</option>
                                                                    <option value="S">Scheduled</option>
                                                                    <option value="C" disabled={completedCapReached}>Completed</option>
                                                                </select>
                                                                {updatingId === e.id && (
                                                                    <svg width="14" height="14" viewBox="0 0 50 50" style={{ marginLeft: 6 }}>
                                                                        <circle cx="25" cy="25" r="20" stroke="#888" strokeWidth="5" fill="none" strokeDasharray="31.4 31.4">
                                                                            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                                                                        </circle>
                                                                    </svg>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {scheduledList.length === 0 && (
                                                        <tr><td colSpan="4">No scheduled experts</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                            <label className="form-label">Completed (C)</label>
                                            <table className="data-table">
                                                <thead>
                                                    <tr><th>Name</th><th>Email</th><th>Title</th><th>Category</th></tr>
                                                </thead>
                                                <tbody>
                                                    {completedList.map((e) => (
                                                        <tr key={`C-${e.id}`}>
                                                            <td>{e.name}</td>
                                                            <td>{e.email}</td>
                                                            <td>{e.title || '—'}</td>
                                                            <td>
                                                                <select value="C" onChange={(ev) => changeExpertCategory(e.id, ev.target.value, 'C')} disabled={updatingId === e.id}>
                                                                    <option value="L">Leads</option>
                                                                    <option value="I">Invited</option>
                                                                    <option value="A">Accepted</option>
                                                                    <option value="S" disabled={scheduledCapReached}>Scheduled</option>
                                                                    <option value="C">Completed</option>
                                                                </select>
                                                                {updatingId === e.id && (
                                                                    <svg width="14" height="14" viewBox="0 0 50 50" style={{ marginLeft: 6 }}>
                                                                        <circle cx="25" cy="25" r="20" stroke="#888" strokeWidth="5" fill="none" strokeDasharray="31.4 31.4">
                                                                            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                                                                        </circle>
                                                                    </svg>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {completedList.length === 0 && (
                                                        <tr><td colSpan="4">No completed experts</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                            <label className="form-label">Declined (D)</label>
                                            <table className="data-table">
                                                <thead>
                                                    <tr><th>Name</th><th>Email</th><th>Title</th><th>Category</th></tr>
                                                </thead>
                                                <tbody>
                                                    {declinedList.map((e) => (
                                                        <tr key={`D-${e.id}`}>
                                                            <td>{e.name}</td>
                                                            <td>{e.email}</td>
                                                            <td>{e.title || '—'}</td>
                                                            <td>
                                                                <select value="D" onChange={(ev) => changeExpertCategory(e.id, ev.target.value, 'D')} disabled={updatingId === e.id}>
                                                                    <option value="L">Leads</option>
                                                                    <option value="I">Invited</option>
                                                                    <option value="A">Accepted</option>
                                                                    <option value="D">Declined</option>
                                                                    <option value="S" disabled={scheduledCapReached}>Scheduled</option>
                                                                    <option value="C" disabled={completedCapReached}>Completed</option>
                                                                </select>
                                                                {updatingId === e.id && (
                                                                    <svg width="14" height="14" viewBox="0 0 50 50" style={{ marginLeft: 6 }}>
                                                                        <circle cx="25" cy="25" r="20" stroke="#888" strokeWidth="5" fill="none" strokeDasharray="31.4 31.4">
                                                                            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                                                                        </circle>
                                                                    </svg>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {declinedList.length === 0 && (
                                                        <tr><td colSpan="4">No declined experts</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </Modal>
            )}
        </>
    );
}
