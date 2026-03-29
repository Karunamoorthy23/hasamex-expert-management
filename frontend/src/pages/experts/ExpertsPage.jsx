import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { fetchExperts, getFilterOptions, deleteExpert, deleteExperts, exportExperts } from '../../api/experts';

import ExpertsActionBar from '../../components/experts/ExpertsActionBar';
import ExpertsFiltersPanel from '../../components/experts/ExpertsFiltersPanel';
import BulkActionsBar from '../../components/experts/BulkActionsBar';
import ExpertsTable from '../../components/experts/ExpertsTable';
import ExpertsCardGrid from '../../components/experts/ExpertsCardGrid';
import Pagination from '../../components/experts/Pagination';
import Skeletons from '../../components/experts/Skeletons';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import BulkImportModal from '../../components/experts/BulkImportModal';
import BulkEmailModal from '../../components/experts/BulkEmailModal';
import { TableIcon, CardsIcon, EmptySearchIcon } from '../../components/icons/Icons';
import { cn } from '../../utils/cn';

const LIMIT = 20; // Items per page (demo uses 5, production uses 20)

/**
 * ExpertsPage — main page composing all expert components.
 * Maps from the full <main> content in index.html
 */
export default function ExpertsPage() {
    const navigate = useNavigate();
    // ── UI State ──
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        region: [],
        sector: [],
        status: [],
        employment: [],
    });
    const [page, setPage] = useState(1);
    const [view, setView] = useState('table'); // 'table' | 'cards'
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
    const [expertToDelete, setExpertToDelete] = useState(null);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [emailViewIds, setEmailViewIds] = useState([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [sortBy, setSortBy] = useState('updated_at');
    const [sortOrder, setSortOrder] = useState('desc');

    // ── Server State (simulated) ──
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // ── Debounced search ──
    const debouncedSearch = useDebouncedValue(search, 400);

    // ── Filter options (lookups) ──
    const [lookups, setLookups] = useState({ region: [], sector: [], status: [], employment: [], hasamex_users: [] });

    useEffect(() => {
        getFilterOptions().then((data) => {
            setLookups(data);
        });
    }, []);

    // ── Active filters count ──
    const activeFiltersCount = useMemo(
        () => Object.values(filters).reduce((acc, arr) => acc + arr.length, 0),
        [filters]
    );

    // ── Reset page when search or filters change ──
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filters]);

    // ── Fetch experts ──
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        fetchExperts({
            page,
            limit: LIMIT,
            search: debouncedSearch,
            filters,
            sortBy,
            sortOrder,
        }).then((result) => {
            if (!cancelled) {
                setData(result);
                setIsLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [page, debouncedSearch, filters, sortBy, sortOrder]);

    // ── Handlers ──
    const handleToggleFilters = useCallback(() => {
        setFiltersPanelOpen((prev) => !prev);
    }, []);

    const handleClearAllFilters = useCallback(() => {
        setFilters({ region: [], sector: [], status: [], employment: [] });
    }, []);

    const handleSelectExpert = useCallback((id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        if (!data) return;
        const pageIds = data.data.map((e) => e.id);
        setSelectedIds((prev) => {
            const allSelected = pageIds.every((id) => prev.has(id));
            const next = new Set(prev);
            if (allSelected) {
                pageIds.forEach((id) => next.delete(id));
            } else {
                pageIds.forEach((id) => next.add(id));
            }
            return next;
        });
    }, [data]);

    const handleClearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const handleBulkEmail = useCallback(() => {
        if (selectedIds.size === 0) return;
        setEmailViewIds(Array.from(selectedIds));
        setEmailModalOpen(true);
    }, [selectedIds]);

    const handleSingleEmail = useCallback((id) => {
        setEmailViewIds([id]);
        setEmailModalOpen(true);
    }, []);

    const handleViewExpert = useCallback((id) => {
        navigate(`/experts/${id}`);
    }, [navigate]);


    const handleEditExpert = useCallback((id) => {
        navigate(`/experts/${id}/edit`);
    }, [navigate]);

    const handleDeleteClick = useCallback((expert) => {
        setExpertToDelete(expert);
    }, []);

    const handleSort = useCallback((column) => {
        setSortOrder((prevOrder) => {
            if (sortBy === column) {
                return prevOrder === 'asc' ? 'desc' : 'asc';
            }
            return 'asc';
        });
        setSortBy(column);
        setPage(1);
    }, [sortBy]);

    const handleConfirmDelete = useCallback(async () => {
        if (!expertToDelete) return;
        setIsDeleting(true);
        try {
            await deleteExpert(expertToDelete.id);
            // Refresh list
            setPage(1);
            const result = await fetchExperts({
                page: 1,
                limit: LIMIT,
                search: debouncedSearch,
                filters,
            });
            setData(result);
            setExpertToDelete(null);
        } catch (error) {
            console.error('Failed to delete expert', error);
            alert('Failed to delete expert.');
        } finally {
            setIsDeleting(false);
        }
    }, [expertToDelete, debouncedSearch, filters]);

    const handleConfirmBulkDelete = useCallback(async () => {
        if (selectedIds.size === 0) return;
        setIsDeleting(true);
        try {
            await deleteExperts(Array.from(selectedIds));
            setSelectedIds(new Set());
            // Refresh list
            setPage(1);
            const result = await fetchExperts({
                page: 1,
                limit: LIMIT,
                search: debouncedSearch,
                filters,
            });
            setData(result);
            setShowBulkDeleteConfirm(false);
        } catch (error) {
            console.error('Failed to delete experts', error);
            alert('Failed to delete selected experts.');
        } finally {
            setIsDeleting(false);
        }
    }, [selectedIds, debouncedSearch, filters]);

    // inline editing removed; handled in Edit page

    const handleAdd = useCallback(() => {
        navigate('/experts/new');
    }, [navigate]);

    const handleImport = useCallback(() => {
        setImportModalOpen(true);
    }, []);

    const handleImportComplete = useCallback(() => {
        // Refresh list
        setPage(1);
        fetchExperts({
            page: 1,
            limit: LIMIT,
            search: debouncedSearch,
            filters,
        }).then((result) => {
            setData(result);
        });
    }, [debouncedSearch, filters]);

    const handleExport = useCallback(async () => {
        try {
            await exportExperts({
                search: debouncedSearch,
                filters,
            });
        } catch (error) {
            console.error('Export failed', error);
            alert('Failed to export experts. Please try again.');
        }
    }, [debouncedSearch, filters]);

    const handleBulkExportSelected = useCallback(async () => {
        if (selectedIds.size === 0) return;
        try {
            await exportExperts({
                ids: Array.from(selectedIds),
            });
        } catch (error) {
            console.error('Bulk export failed', error);
            alert('Failed to export selected experts.');
        }
    }, [selectedIds]);

    // ── Derived values ──
    const experts = data?.data || [];
    const meta = data?.meta || { total_records: 0, current_page: 1, total_pages: 1, limit: LIMIT };
    const allPageSelected =
        experts.length > 0 && experts.every((e) => selectedIds.has(e.id));

    

    return (
        <>
            {/* Page Title */}
            <div className="page-header">
                <h1 className="page-title">Expert Management</h1>
            </div>

            {/* Card wrapper */}
            <div className="card">
                {/* Action Bar */}
                <ExpertsActionBar
                    search={search}
                    onSearchChange={setSearch}
                    onToggleFilters={handleToggleFilters}
                    activeFiltersCount={activeFiltersCount}
                    filtersPanelOpen={filtersPanelOpen}
                    onAdd={handleAdd}
                    onImport={handleImport}
                    onExport={handleExport}
                />

                {/* Filters Panel */}
                <ExpertsFiltersPanel
                    open={filtersPanelOpen}
                    onClose={() => setFiltersPanelOpen(false)}
                    onClearAll={handleClearAllFilters}
                    filters={filters}
                    setFilters={setFilters}
                    lookups={lookups}
                />

                {/* Bulk Actions Bar */}
                <BulkActionsBar
                    count={selectedIds.size}
                    onEmail={handleBulkEmail}
                    onExportSelected={handleBulkExportSelected}
                    onDelete={() => setShowBulkDeleteConfirm(true)}
                    onClear={handleClearSelection}
                />

                {/* View Toggle */}
                <div className="view-toggle-row">
                    <div className="view-toggle">
                        <button
                            type="button"
                            className={cn('view-btn', view === 'table' && 'view-btn--active')}
                            title="Table view"
                            aria-pressed={view === 'table'}
                            onClick={() => setView('table')}
                        >
                            <TableIcon />
                            Table
                        </button>
                        <button
                            type="button"
                            className={cn('view-btn', view === 'cards' && 'view-btn--active')}
                            title="Card view"
                            aria-pressed={view === 'cards'}
                            onClick={() => setView('cards')}
                        >
                            <CardsIcon />
                            Cards
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="content-area">
                    {isLoading ? (
                        <Skeletons rows={LIMIT} />
                    ) : experts.length === 0 ? (
                        <div className="empty-state">
                            <EmptySearchIcon className="empty-state__icon" />
                            <h3 className="empty-state__title">No experts found</h3>
                            <p className="empty-state__text">
                                Try adjusting your search or filters
                            </p>
                        </div>
                    ) : view === 'table' ? (
                        <ExpertsTable
                            experts={experts}
                            selectedIds={selectedIds}
                            onSelectExpert={handleSelectExpert}
                            onSelectAll={handleSelectAll}
                            allSelected={allPageSelected}
                            onViewExpert={handleViewExpert}
                            onEditExpert={handleEditExpert}
                            onDeleteExpert={handleDeleteClick}
                            onEmailExpert={handleSingleEmail}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={handleSort}
                        />
                    ) : (
                        <ExpertsCardGrid
                            experts={experts}
                            selectedIds={selectedIds}
                            onSelectExpert={handleSelectExpert}
                            onViewExpert={handleViewExpert}
                        />
                    )}
                </div>

                {/* Pagination */}
                {!isLoading && experts.length > 0 && (
                    <Pagination
                        page={meta.current_page}
                        totalPages={meta.total_pages}
                        totalRecords={meta.total_records}
                        onPageChange={setPage}
                        itemLabel="experts"
                    />
                )}
            </div>

            

            {/* Delete Confirmation Modal */}
            <ConfirmDialog
                open={expertToDelete !== null}
                onClose={() => !isDeleting && setExpertToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Expert"
                message={`Are you sure you want to delete ${expertToDelete?.first_name} ${expertToDelete?.last_name}? This action cannot be undone.`}
                confirmLabel="Delete"
                isDestructive={true}
                isLoading={isDeleting}
            />

            <ConfirmDialog
                open={showBulkDeleteConfirm}
                onClose={() => !isDeleting && setShowBulkDeleteConfirm(false)}
                onConfirm={handleConfirmBulkDelete}
                title="Delete Selected Experts"
                message={`Are you sure you want to delete ${selectedIds.size} experts? This action cannot be undone.`}
                confirmLabel="Delete All Selected"
                isDestructive={true}
                isLoading={isDeleting}
            />

            <BulkImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImportComplete={handleImportComplete}
            />

            <BulkEmailModal
                open={emailModalOpen}
                onClose={() => setEmailModalOpen(false)}
                ids={emailViewIds}
            />
        </>
    );
}
