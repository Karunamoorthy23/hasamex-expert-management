import FilterDropdown from '../experts/FilterDropdown';
import Button from '../ui/Button';
import { XIcon } from '../icons/Icons';

export default function ProjectsFiltersPanel({
    open,
    onClose,
    onClearAll,
    filters,
    setFilters,
    options,
}) {
    if (!open) return null;

    function handleFilterChange(category, nextSelected) {
        setFilters((prev) => ({ ...prev, [category]: nextSelected }));
    }

    const clientNameOptions = options?.clientNames || [];
    const raOptions = options?.raNames || [];
    const monthOptions = options?.months || [];
    const yearOptions = options?.years || [];

    return (
        <div className="filters-panel">
            <div className="filters-panel__header">
                <div>
                    <div className="filters-panel__title">Filter Options</div>
                    <div className="filters-panel__subtitle">Search, scroll, and multi-select filters</div>
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
                    label="Client Name"
                    options={clientNameOptions}
                    selected={filters.clients}
                    onChange={(next) => handleFilterChange('clients', next)}
                />
                <FilterDropdown
                    label="Research Analyst"
                    options={raOptions}
                    selected={filters.ra}
                    onChange={(next) => handleFilterChange('ra', next)}
                />
                <FilterDropdown
                    label="Month"
                    options={monthOptions}
                    selected={filters.months}
                    onChange={(next) => handleFilterChange('months', next)}
                />
                <FilterDropdown
                    label="Year"
                    options={yearOptions}
                    selected={filters.years}
                    onChange={(next) => handleFilterChange('years', next)}
                />
            </div>
        </div>
    );
}
