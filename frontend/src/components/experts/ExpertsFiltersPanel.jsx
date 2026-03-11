import FilterDropdown from './FilterDropdown';
import Button from '../ui/Button';
import { XIcon } from '../icons/Icons';

/**
 * ExpertsFiltersPanel — expandable panel with four FilterDropdown components.
 * Maps from: <div id="filtersPanel" class="filters-panel"> in index.html
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the panel is visible
 * @param {Function} props.onClose - Close the panel
 * @param {Function} props.onClearAll - Clear all filters
 * @param {Object} props.filters - Current filter state { region: [], sector: [], status: [], employment: [] }
 * @param {Function} props.setFilters - Update filter state
 * @param {Object} props.lookups - Available options { region: [], sector: [], status: [], employment: [] }
 */
export default function ExpertsFiltersPanel({
    open,
    onClose,
    onClearAll,
    filters,
    setFilters,
    lookups,
}) {
    if (!open) return null;

    function handleFilterChange(category, nextSelected) {
        setFilters((prev) => ({ ...prev, [category]: nextSelected }));
    }

    return (
        <div className="filters-panel">
            <div className="filters-panel__header">
                <div>
                    <div className="filters-panel__title">Filter Options</div>
                    <div className="filters-panel__subtitle">
                        Search, scroll, and multi-select filters
                    </div>
                </div>
                <div className="filters-panel__header-actions">
                    <Button variant="ghost" size="sm" onClick={onClearAll}>
                        Clear all
                    </Button>
                    <button
                        type="button"
                        className="filters-panel__close"
                        aria-label="Close filters"
                        onClick={onClose}
                    >
                        <XIcon />
                    </button>
                </div>
            </div>

            <div className="filters-panel__grid">
                <FilterDropdown
                    label="Region"
                    options={lookups.region}
                    selected={filters.region}
                    onChange={(next) => handleFilterChange('region', next)}
                />
                <FilterDropdown
                    label="Primary Sector"
                    options={lookups.primary_sector}
                    selected={filters.sector}
                    onChange={(next) => handleFilterChange('sector', next)}
                />
                <FilterDropdown
                    label="Expert Status"
                    options={lookups.expert_status}
                    selected={filters.status}
                    onChange={(next) => handleFilterChange('status', next)}
                />
                <FilterDropdown
                    label="Employment Status"
                    options={lookups.current_employment_status}
                    selected={filters.employment}
                    onChange={(next) => handleFilterChange('employment', next)}
                />
            </div>
        </div>
    );
}
