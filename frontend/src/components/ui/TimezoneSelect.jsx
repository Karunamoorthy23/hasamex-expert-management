import { useState, useRef, useMemo } from 'react';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { ChevronDownIcon, SearchIcon } from '../icons/Icons';

/**
 * Curated list of high-quality, business-standard timezone options.
 * Format EXACTLY as requested: "UTC+offset (Abbreviation) — Countries"
 */
function getCuratedTimezones() {
    const zones = [
        // Asia
        { value: 'Asia/Dubai', group: 'Asia', label: 'UTC+4 (GST) — UAE, Oman', offset: 'UTC+4', city: 'UAE, Oman' },
        { value: 'Asia/Kabul', group: 'Asia', label: 'UTC+4:30 (AFT) — Afghanistan', offset: 'UTC+4:30', city: 'Afghanistan' },
        { value: 'Asia/Karachi', group: 'Asia', label: 'UTC+5 (PKT) — Pakistan', offset: 'UTC+5', city: 'Pakistan' },
        { value: 'Asia/Kolkata', group: 'Asia', label: 'UTC+5:30 (IST) — India, Sri Lanka', offset: 'UTC+5:30', city: 'India, Sri Lanka' },
        { value: 'Asia/Kathmandu', group: 'Asia', label: 'UTC+5:45 (NPT) — Nepal', offset: 'UTC+5:45', city: 'Nepal' },
        { value: 'Asia/Dhaka', group: 'Asia', label: 'UTC+6 (BST) — Bangladesh', offset: 'UTC+6', city: 'Bangladesh' },
        { value: 'Asia/Bangkok', group: 'Asia', label: 'UTC+7 (ICT) — Thailand, Vietnam, Indonesia', offset: 'UTC+7', city: 'Thailand, Vietnam, Indonesia' },
        { value: 'Asia/Singapore', group: 'Asia', label: 'UTC+8 (SGT / CST) — China, Singapore, Malaysia', offset: 'UTC+8', city: 'China, Singapore, Malaysia' },
        { value: 'Asia/Tokyo', group: 'Asia', label: 'UTC+9 (JST) — Japan, South Korea', offset: 'UTC+9', city: 'Japan, South Korea' },

        // Europe
        { value: 'Europe/London', group: 'Europe', label: 'UTC+0 (GMT/BST) — UK, Ireland, Portugal', offset: 'UTC+0', city: 'UK, Ireland, Portugal' },
        { value: 'Europe/Paris', group: 'Europe', label: 'UTC+1 (CET) — France, Germany, Italy, Spain', offset: 'UTC+1', city: 'France, Germany, Italy, Spain' },
        { value: 'Europe/Istanbul', group: 'Europe', label: 'UTC+3 (TRT) — Turkey, Russia (Moscow)', offset: 'UTC+3', city: 'Turkey, Russia (Moscow)' },

        // Americas
        { value: 'America/New_York', group: 'Americas', label: 'UTC-5 (EST) — USA (East), Canada, Colombia', offset: 'UTC-5', city: 'USA (East), Canada, Colombia' },
        { value: 'America/Chicago', group: 'Americas', label: 'UTC-6 (CST) — USA (Central), Mexico', offset: 'UTC-6', city: 'USA (Central), Mexico' },
        { value: 'America/Denver', group: 'Americas', label: 'UTC-7 (MST) — USA (Mountain)', offset: 'UTC-7', city: 'USA (Mountain)' },
        { value: 'America/Los_Angeles', group: 'Americas', label: 'UTC-8 (PST) — USA (Pacific)', offset: 'UTC-8', city: 'USA (Pacific)' },
        { value: 'America/Sao_Paulo', group: 'Americas', label: 'UTC-3 (BRT) — Brazil, Argentina', offset: 'UTC-3', city: 'Brazil, Argentina' },

        // Oceania
        { value: 'Australia/Perth', group: 'Oceania', label: 'UTC+8 (AWST) — Australia (West)', offset: 'UTC+8', city: 'Australia (West)' },
        { value: 'Australia/Sydney', group: 'Oceania', label: 'UTC+11 (AEDT) — Australia (East)', offset: 'UTC+11', city: 'Australia (East)' },
        { value: 'Pacific/Auckland', group: 'Oceania', label: 'UTC+13 (NZDT) — New Zealand', offset: 'UTC+13', city: 'New Zealand' },

        // Africa
        { value: 'Africa/Lagos', group: 'Africa', label: 'UTC+1 (WAT) — Nigeria, Algeria', offset: 'UTC+1', city: 'Nigeria, Algeria' },
        { value: 'Africa/Johannesburg', group: 'Africa', label: 'UTC+2 (SAST) — South Africa, Egypt', offset: 'UTC+2', city: 'South Africa, Egypt' },
        { value: 'Africa/Nairobi', group: 'Africa', label: 'UTC+3 (EAT) — Kenya, Ethiopia, Saudi Arabia', offset: 'UTC+3', city: 'Kenya, Ethiopia, Saudi Arabia' },
    ];

    const groups = {};
    zones.forEach(z => {
        if (!groups[z.group]) groups[z.group] = [];
        groups[z.group].push(z);
    });

    const order = ['Asia', 'Europe', 'Americas', 'Oceania', 'Africa'];
    return order.filter(g => groups[g]).map(g => ({ group: g, options: groups[g] }));
}

const TIMEZONE_DATA = getCuratedTimezones();

// Flatten for easy searching
const ALL_TIMEZONES = TIMEZONE_DATA.flatMap(g =>
    g.options.map(o => ({ ...o, group: g.group }))
);

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
