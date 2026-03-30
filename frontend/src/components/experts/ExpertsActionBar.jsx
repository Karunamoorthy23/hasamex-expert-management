import { SearchIcon, FilterIcon, PlusIcon, UploadIcon, DownloadIcon, XIcon, ChevronDownIcon } from '../icons/Icons';
import Button from '../ui/Button';

/**
 * ExpertsActionBar — search + Filters button + Add/Import/Export.
 * Maps from: <div class="action-bar"> in index.html
 *
 * @param {Object} props
 * @param {string} props.search - Current search value
 * @param {Function} props.onSearchChange - Callback with new search string
 * @param {Function} props.onToggleFilters - Toggle filters panel open/close
 * @param {number} props.activeFiltersCount - Number of active filters
 * @param {boolean} props.filtersPanelOpen - Whether filters panel is open
 * @param {Function} props.onAdd - Callback for "Add Expert"
 * @param {Function} props.onImport - Callback for "Import"
 * @param {Function} props.onExport - Callback for "Export"
 */
export default function ExpertsActionBar({
    search,
    onSearchChange,
    onToggleFilters,
    activeFiltersCount,
    filtersPanelOpen,
    onAdd,
    onImport,
    onExport,
}) {
    return (
        <div className="action-bar">
            {/* Search */}
            <div className="search-wrapper">
                <SearchIcon className="search-icon" />
                <input
                    
                    id="searchInput"
                    className="search-input"
                    placeholder="Search experts by name, title, sector, location..."
                    autoComplete="off"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                {search.trim() && (
                    <button
                        type="button"
                        className="search-clear"
                        aria-label="Clear search"
                        onClick={() => onSearchChange('')}
                    >
                        <XIcon width={14} height={14} />
                    </button>
                )}
            </div>

            {/* Filters Button */}
            <div className="action-bar__filters">
                <button
                    type="button"
                    id="btnFilters"
                    className="btn btn--secondary btn--sm btn-filters"
                    aria-expanded={filtersPanelOpen}
                    onClick={onToggleFilters}
                >
                    <FilterIcon />
                    Filters
                    {activeFiltersCount > 0 && (
                        <span className="filters-count">{activeFiltersCount}</span>
                    )}
                    <ChevronDownIcon className="chev" />
                </button>
            </div>

            {/* Divider */}
            <div className="action-bar__divider" />

            {/* Action Buttons */}
            <div className="action-bar__actions">
                <Button id="btnAddExpert" variant="primary" size="sm" onClick={onAdd}>
                    <PlusIcon />
                    Create Expert
                </Button>
                <Button id="btnImport" variant="secondary" size="sm" onClick={onImport}>
                    <UploadIcon />
                    Import
                </Button>
                <Button id="btnExport" variant="secondary" size="sm" onClick={onExport}>
                    <DownloadIcon />
                    Export
                </Button>
            </div>
        </div>
    );
}
