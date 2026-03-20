import React from 'react';
import FilterDropdown from '../experts/FilterDropdown';
import Button from '../ui/Button';
import { XIcon } from '../icons/Icons';

export default function EngagementFilters({ open, onClose, onClearAll, filters, onFilterChange, lookups }) {
    if (!open) return null;
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
                    label="Status"
                    options={lookups.payment_status?.map((s) => s.name) || []}
                    selected={filters.status ? [filters.status] : []}
                    onChange={(selected) => onFilterChange('status', selected[0] || '')}
                />
                <FilterDropdown
                    label="Month"
                    options={[
                        '2024-01',
                        '2024-02',
                        '2024-03',
                        '2024-04',
                        '2024-05',
                        '2024-06',
                        '2024-07',
                        '2024-08',
                        '2024-09',
                        '2024-10',
                        '2024-11',
                        '2024-12',
                    ]}
                    selected={filters.month ? [filters.month] : []}
                    onChange={(selected) => onFilterChange('month', selected[0] || '')}
                />
            </div>
        </div>
    );
}
