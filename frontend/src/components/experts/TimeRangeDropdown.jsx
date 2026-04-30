import { useState, useRef } from 'react';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { ChevronDownIcon } from '../icons/Icons';

/**
 * TimeRangeDropdown — a filter for selecting a time window.
 *
 * @param {Object} props
 * @param {boolean} props.timeAll - Whether to apply to "All Time"
 * @param {string} props.start - Start time (e.g. "08:30")
 * @param {string} props.end - End time (e.g. "09:30")
 * @param {Function} props.onChange - Callback with (key, value)
 */
export default function TimeRangeDropdown({ timeAll, start, end, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useOutsideClick(ref, () => setOpen(false));

    return (
        <div className="fd" ref={ref}>
            <button
                type="button"
                className="fd__trigger"
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
            >
                <span className="fd__label">Time Range</span>
                <span className="fd__meta">
                    {!timeAll && <span className="fd__count">Set</span>}
                    <ChevronDownIcon className="fd__chev" />
                </span>
            </button>

            {open && (
                <div className="fd__popover" style={{ padding: '16px', minWidth: '220px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={timeAll}
                                onChange={(e) => onChange('time_all', e.target.checked)}
                            />
                            <span>All Time</span>
                        </label>
                    </div>

                    {!timeAll && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '14px', color: '#4a5568' }}>Start:</span>
                                <input
                                    type="time"
                                    value={start}
                                    onChange={(e) => onChange('start_time', e.target.value)}
                                    style={{
                                        padding: '4px 8px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '14px', color: '#4a5568' }}>End:</span>
                                <input
                                    type="time"
                                    value={end}
                                    onChange={(e) => onChange('end_time', e.target.value)}
                                    style={{
                                        padding: '4px 8px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
