import { useEffect, useMemo, useRef, useState } from 'react';
import { http } from '../../api/http';

export default function LocationSelector({ value, onChange }) {
    const [query, setQuery] = useState(value?.display_name || '');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const timer = useRef(null);

    useEffect(() => {
        setQuery(value?.display_name || '');
    }, [value?.display_name]);

    const doSearch = async (q) => {
        if (!q || q.trim().length < 2) {
            setResults([]);
            setOpen(false);
            return;
        }
        setLoading(true);
        try {
            const res = await http(`/location/search?q=${encodeURIComponent(q)}`);
            let data = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
            // Be permissive: keep entries that can render a compact label with a country
            data = data.filter((item) => {
                const lbl = labelFor(item);
                return !!lbl && lbl.split(',').map(s => s.trim()).filter(Boolean).length >= 2;
            });
            // Dedupe by compact label
            const seen = new Set();
            const deduped = [];
            for (const it of data) {
                const lbl = labelFor(it);
                if (!seen.has(lbl)) {
                    seen.add(lbl);
                    deduped.push(it);
                }
            }
            setResults(deduped);
            setOpen(true);
        } catch {
            setResults([]);
            setOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const onInput = (e) => {
        const val = e.target.value;
        setQuery(val);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => doSearch(val), 400);
    };

    const labelFor = (item) => {
        const a = item.address || {};
        let c = a.city || a.town || a.village || a.hamlet || a.suburb || item.name || '';
        let s = a.state || a.state_district || a.region || a.county || '';
        let country = a.country || '';
        if (!c || !country) {
            const parts = String(item.display_name || '').split(',').map((p) => p.trim()).filter(Boolean);
            if (!c && parts.length) c = parts[0];
            if (!s && parts.length > 1) s = parts[1];
            if (!country && parts.length) country = parts[parts.length - 1];
        }
        if (!c && s) c = s;
        const pieces = [c, country].filter(Boolean);
        return pieces.join(', ');
    };

    const selectItem = async (item) => {
        const compact = labelFor(item);
        const a = item.address || {};
        let city = a.city || a.town || a.village || a.hamlet || a.suburb || item.name || '';
        let state = a.state || a.state_district || a.region || a.county || '';
        let country = a.country || '';
        if (!city || !country) {
            const parts = String(item.display_name || '').split(',').map(s => s.trim()).filter(Boolean);
            if (!city && parts.length) city = parts[0];
            if (!state && parts.length > 1) state = parts[1];
            if (!country && parts.length) country = parts[parts.length - 1];
        }
        setQuery(compact);
        setResults([]);
        setOpen(false);
        onChange?.({
            display_name: compact,
            city,
            country,
            latitude: typeof item.lat === 'string' ? parseFloat(item.lat) : item.lat,
            longitude: typeof item.lon === 'string' ? parseFloat(item.lon) : item.lon,
        });
    };

    const list = useMemo(() => results.slice(0, 15), [results]);

    return (
        <div style={{ position: 'relative' }}>
            <input
                className="form-input"
                value={query}
                onChange={onInput}
                placeholder="Search location"
                onFocus={() => query && results.length > 0 && setOpen(true)}
            />
            {open && (
                <div style={dropdown}>
                    <div style={scroll}>
                        {loading ? (
                            <div style={empty}>Loading…</div>
                        ) : list.length === 0 ? (
                            <div style={empty}>No results</div>
                        ) : (
                            list.map((item, idx) => (
                                <div key={idx} style={row} onClick={() => selectItem(item)}>
                                    <div style={{ fontSize: 13.5, color: '#111' }}>{labelFor(item)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const dropdown = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    marginTop: 6,
    zIndex: 50,
};

const scroll = {
    maxHeight: 240,
    overflowY: 'auto',
    padding: 8,
};

const row = {
    padding: '8px 10px',
    cursor: 'pointer',
    borderRadius: 6,
};

const empty = {
    padding: '10px 12px',
    color: '#666',
    fontSize: 13,
};
