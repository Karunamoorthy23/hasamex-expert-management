import { useEffect } from 'react';

export async function resolveTimezoneLabel({ timezoneName, latitude, longitude }) {
    async function fromWorldTimeApi(tz) {
        try {
            if (!tz || tz === 'UTC') return null;
            const res = await fetch(`https://worldtimeapi.org/api/timezone/${encodeURIComponent(tz)}`, { cache: 'no-store' });
            if (!res.ok) return null;
            const data = await res.json();
            const off = data?.utc_offset || '';
            const abbr = data?.abbreviation || '';
            const pretty = off ? `UTC${off}` : 'UTC';
            const suffix = tz ? ` — ${tz}` : '';
            return [pretty, abbr ? `(${abbr})` : '', suffix].filter(Boolean).join(' ');
        } catch {
            return null;
        }
    }
    async function fromTimeApiCoordinate(lat, lng) {
        try {
            const url = `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lng}`;
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) return null;
            const data = await res.json();
            const tz = data?.timeZone || data?.timeZoneId || data?.timezone || '';
            const abbr = data?.abbreviation || '';
            const sec =
                typeof data?.standardUtcOffset?.seconds === 'number'
                    ? data.standardUtcOffset.seconds
                    : null;
            let pretty = 'UTC';
            if (sec !== null) {
                const sign = sec >= 0 ? '+' : '-';
                const abs = Math.abs(sec);
                const hh = String(Math.floor(abs / 3600)).padStart(2, '0');
                const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, '0');
                pretty = `UTC${sign}${hh}:${mm}`;
            }
            const suffix = tz ? ` — ${tz}` : '';
            return [pretty, abbr ? `(${abbr})` : '', suffix].filter(Boolean).join(' ');
        } catch {
            return null;
        }
    }
    if (timezoneName) {
        const viaTz = await fromWorldTimeApi(timezoneName);
        if (viaTz) return viaTz;
    }
    if (typeof latitude === 'number' && typeof longitude === 'number') {
        const viaLatLng = await fromTimeApiCoordinate(latitude, longitude);
        if (viaLatLng) return viaLatLng;
    }
    if (timezoneName && timezoneName.toUpperCase() === 'UTC') return 'UTC+00:00 (GMT) — UTC';
    return timezoneName || '';
}

export default function TimezoneResolver({ timezoneName, latitude, longitude, onResolved }) {
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const label = await resolveTimezoneLabel({ timezoneName, latitude, longitude });
            if (!cancelled) onResolved?.(label);
        })();
        return () => { cancelled = true; };
    }, [timezoneName, latitude, longitude]);
    return null;
}
