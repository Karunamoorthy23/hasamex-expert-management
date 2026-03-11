import { useState, useRef, useMemo } from 'react';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { ChevronDownIcon, SearchIcon } from '../icons/Icons';

/**
 * Build real IANA timezone options grouped by continent, with GMT offsets.
 * Uses British English formatting (en-GB).
 */
function buildTimezoneOptions() {
    try {
        const tzNames = Intl.supportedValuesOf('timeZone');
        const groups = {};
        const skipPrefixes = ['Etc', 'SystemV'];

        tzNames.forEach(tz => {
            const parts = tz.split('/');
            const continent = parts[0];
            if (skipPrefixes.includes(continent) || !parts[1]) return;

            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: tz,
                timeZoneName: 'shortOffset',
            });
            const offsetPart = formatter.formatToParts(now).find(p => p.type === 'timeZoneName');
            const offset = offsetPart ? offsetPart.value : '';

            const city = parts.slice(1).join('/').replace(/_/g, ' ');

            if (!groups[continent]) groups[continent] = [];
            groups[continent].push({ value: tz, label: `${offset} — ${city}`, offset, city });
        });

        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => a.offset.localeCompare(b.offset) || a.city.localeCompare(b.city));
        });

        const order = ['Asia', 'Europe', 'America', 'Africa', 'Pacific', 'Australia', 'Atlantic', 'Indian', 'Antarctica', 'Arctic'];
        return order.filter(g => groups[g]).map(g => ({ group: g, options: groups[g] }));
    } catch (e) {
        return [{
            group: 'Common', options: [
                { value: 'Asia/Kolkata', label: 'GMT+5:30 — Kolkata', offset: 'GMT+5:30', city: 'Kolkata' },
                { value: 'Asia/Singapore', label: 'GMT+8 — Singapore', offset: 'GMT+8', city: 'Singapore' },
                { value: 'America/New_York', label: 'GMT-5 — New York', offset: 'GMT-5', city: 'New York' },
                { value: 'Europe/London', label: 'GMT+0 — London', offset: 'GMT+0', city: 'London' },
            ]
        }];
    }
}

const TIMEZONE_DATA = buildTimezoneOptions();

// Flatten for easy searching
const ALL_TIMEZONES = TIMEZONE_DATA.flatMap(g =>
    g.options.map(o => ({ ...o, group: g.group }))
);

/**
 * TimezoneSelect — a searchable, scrollable single-select dropdown for timezones.
 * Styled to match the FilterDropdown pattern used in the app.
 *
 * @param {Object} props
 * @param {string} props.value - Currently selected timezone IANA name
 * @param {Function} props.onChange - Callback with selected timezone value
 * @param {boolean} props.hasError - Whether to show error styling
 * @param {string} props.id - Input ID for label association
 * @param {string} props.name - Input name
 */
export default function TimezoneSelect({ value, onChange, hasError, id, name }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);
    const listRef = useRef(null);

    useOutsideClick(ref, () => setOpen(false));

    // Find display label for the current value
    const selectedLabel = useMemo(() => {
        if (!value) return '';
        const found = ALL_TIMEZONES.find(tz => tz.value === value);
        return found ? found.label : value;
    }, [value]);

    // Filter timezones by search term (matches city, offset, group, or IANA name)
    const filtered = useMemo(() => {
        if (!search.trim()) return TIMEZONE_DATA;

        const term = search.toLowerCase();
        const result = [];

        TIMEZONE_DATA.forEach(group => {
            const matchingOptions = group.options.filter(o =>
                o.city.toLowerCase().includes(term) ||
                o.offset.toLowerCase().includes(term) ||
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
                            placeholder="Search timezone, city, or country..."
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
                                            <span className="tz-select__item-offset">{tz.offset}</span>
                                            <span className="tz-select__item-city">{tz.city}</span>
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
