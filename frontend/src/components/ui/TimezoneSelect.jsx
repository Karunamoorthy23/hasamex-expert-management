import { useState, useRef, useMemo } from 'react';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { ChevronDownIcon, SearchIcon } from '../icons/Icons';

import { TIMEZONE_DATA, ALL_TIMEZONES } from '../../utils/timezoneUtils';

/**
 * TimezoneSelect — a searchable, scrollable single-select dropdown for timezones.
 * Pattern matched to the app's filter dropdowns.
 */
export default function TimezoneSelect({ value, onChange, hasError, id, name }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);
    const listRef = useRef(null);

    useOutsideClick(ref, () => setOpen(false));

    const selectedLabel = useMemo(() => {
        if (!value) return '';
        const found = ALL_TIMEZONES.find(tz => tz.value === value);
        return found ? found.label : value;
    }, [value]);

    const filtered = useMemo(() => {
        if (!search.trim()) return TIMEZONE_DATA;

        const term = search.toLowerCase();
        const result = [];

        TIMEZONE_DATA.forEach(group => {
            const matchingOptions = group.options.filter(o =>
                o.label.toLowerCase().includes(term) ||
                o.value.toLowerCase().includes(term) ||
                group.group.toLowerCase().includes(term)
            );
            if (matchingOptions.length > 0) {
                result.push({ group: group.group, options: matchingOptions });
            }
        });

        return result;
    }, [search]);

    const totalResults = filtered.reduce((sum, g) => sum + g.options.length, 0);

    const handleSelect = (tzValue) => {
        onChange({ target: { name, value: tzValue } });
        setOpen(false);
        setSearch('');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange({ target: { name, value: '' } });
    };

    return (
        <div className="tz-select" ref={ref}>
            <button
                type="button"
                id={id}
                className={`tz-select__trigger${hasError ? ' form-input--error' : ''}`}
                onClick={() => setOpen(prev => !prev)}
                aria-expanded={open}
            >
                <span className={`tz-select__value${!value ? ' tz-select__placeholder' : ''}`}>
                    {value ? selectedLabel : '— Select Timezone —'}
                </span>
                <span className="tz-select__actions">
                    {value && (
                        <span className="tz-select__clear" onClick={handleClear} title="Clear timezone">
                            ×
                        </span>
                    )}
                    <ChevronDownIcon className={`tz-select__chev${open ? ' tz-select__chev--open' : ''}`} />
                </span>
            </button>

            {open && (
                <div className="tz-select__dropdown">
                    <div className="tz-select__search-wrap">
                        <SearchIcon width={14} height={14} className="tz-select__search-icon" />
                        <input
                            type="text"
                            className="tz-select__search"
                            placeholder="Search country, offset or abbreviation..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="tz-select__list" ref={listRef}>
                        {totalResults === 0 ? (
                            <div className="tz-select__empty">No timezones found</div>
                        ) : (
                            filtered.map(group => (
                                <div key={group.group} className="tz-select__group">
                                    <div className="tz-select__group-label">{group.group}</div>
                                    {group.options.map(tz => (
                                        <div
                                            key={tz.value}
                                            className={`tz-select__item${tz.value === value ? ' tz-select__item--active' : ''}`}
                                            onClick={() => handleSelect(tz.value)}
                                        >
                                            <span className="tz-select__item-label">{tz.label}</span>
                                            {tz.value === value && <span className="tz-select__check">✓</span>}
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
