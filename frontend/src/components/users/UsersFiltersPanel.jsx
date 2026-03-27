import FilterDropdown from '../experts/FilterDropdown';
import Button from '../ui/Button';
import { XIcon } from '../icons/Icons';

export default function UsersFiltersPanel({
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
    const clientTypeOptions = options?.clientTypes || [];
    const seniorityOptions = options?.seniority || [];
    const locationOptions = options?.locations || [];

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
                    label="Client Type"
                    options={clientTypeOptions}
                    selected={filters.client_type}
                    onChange={(next) => handleFilterChange('client_type', next)}
                />
                <FilterDropdown
                    label="Seniority"
                    options={seniorityOptions}
                    selected={filters.seniority}
                    onChange={(next) => handleFilterChange('seniority', next)}
                />
                <FilterDropdown
                    label="Location"
                    options={locationOptions}
                    selected={filters.locations}
                    onChange={(next) => handleFilterChange('locations', next)}
                />
            </div>
        </div>
    );
}
