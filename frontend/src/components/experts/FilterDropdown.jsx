import { useState, useRef } from 'react';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { ChevronDownIcon } from '../icons/Icons';

/**
 * FilterDropdown — a single filter with popover, search, and multi-select checkboxes.
 * Maps from: <div class="fd" data-filter="..."> in index.html
 *
 * @param {Object} props
 * @param {string} props.label - Display label (e.g. "Region")
 * @param {string[]} props.options - Available filter values
 * @param {string[]} props.selected - Currently selected values
 * @param {Function} props.onChange - Callback with next selected array
 */
export default function FilterDropdown({ label, options = [], selected = [], disabled = [], onChange }) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const ref = useRef(null);

    useOutsideClick(ref, () => setOpen(false));

    const filteredOptions = options.filter((opt) =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedSet = new Set(selected);
    const disabledSet = new Set(disabled);

    function handleToggle(value) {
        if (disabledSet.has(value)) return;
        const next = new Set(selected);
        if (next.has(value)) {
            next.delete(value);
        } else {
            next.add(value);
        }
        onChange([...next]);
    }

    return (
        <div className="fd" ref={ref}>
            <button
                type="button"
                className="fd__trigger"
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
            >
                <span className="fd__label">{label}</span>
                <span className="fd__meta">
                    {selected.length > 0 && (
                        <span className="fd__count">{selected.length}</span>
                    )}
                    <ChevronDownIcon className="fd__chev" />
                </span>
            </button>

            {open && (
                <div className="fd__popover">
                    <input
                        type="text"
                        className="ms__search"
                        placeholder={`Filter ${label.toLowerCase()}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                    <div className="ms__list">
                        {filteredOptions.length === 0 ? (
                            <div className="ms__empty">No options</div>
                        ) : (
                            filteredOptions.map((value) => {
                                 const id = `ms_${label}_${value.replace(/\W+/g, '_')}`;
                                 const isDisabled = disabledSet.has(value);
                                 return (
                                     <label 
                                         key={value} 
                                         className={`ms__item ${isDisabled ? 'ms__item--disabled' : ''}`} 
                                         htmlFor={id}
                                         title={isDisabled ? 'Expert already assigned to this project' : ''}
                                     >
                                         <input
                                             id={id}
                                             type="checkbox"
                                             checked={selectedSet.has(value)}
                                             disabled={isDisabled}
                                             onChange={() => handleToggle(value)}
                                         />
                                         <span className="ms__value">{value}</span>
                                     </label>
                                 );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
