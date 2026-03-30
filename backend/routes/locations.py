from flask import Blueprint, request, jsonify
from extensions import db
from models import LkLocation

locations_bp = Blueprint('locations', __name__, url_prefix='/api/v1/location')

def _get_timezone(lat, lng):
    tz_name = None
    try:
        from timezonefinder import TimezoneFinder
        tf = TimezoneFinder()
        tz_name = tf.timezone_at(lat=float(lat), lng=float(lng))
    except Exception:
        tz_name = None

    # Try to enrich with offset/abbr via TimeAPI.io
    try:
        import requests
        r = requests.get(
            'https://timeapi.io/api/TimeZone/coordinate',
            params={'latitude': lat, 'longitude': lng},
            timeout=6
        )
        if r.ok:
            data = r.json() or {}
            api_tz = data.get('timeZone') or data.get('timeZoneId') or data.get('timezone')
            if api_tz:
                tz_name = tz_name or api_tz
            # Compute pretty UTC±HH:MM
            sec = None
            std_off = data.get('standardUtcOffset') or {}
            cur_off = data.get('currentUtcOffset') or {}
            if isinstance(std_off, dict) and 'seconds' in std_off:
                sec = std_off.get('seconds')
            elif isinstance(cur_off, dict) and 'seconds' in cur_off:
                sec = cur_off.get('seconds')
            if sec is None:
                # fallback: parse "utcOffset" like "05:30:00" or "-04:00"
                raw = data.get('utcOffset') or ''
                if isinstance(raw, str) and raw:
                    try:
                        parts = raw.split(':')
                        sign = 1
                        if raw.startswith('-'):
                            sign = -1
                        hh = int(parts[0].replace('+','').replace('-','') or '0')
                        mm = int(parts[1] or '0') if len(parts) > 1 else 0
                        sec = sign * (hh * 3600 + mm * 60)
                    except Exception:
                        sec = None
            pretty = 'UTC'
            if isinstance(sec, (int, float)):
                sign = '+' if sec >= 0 else '-'
                abssec = abs(int(sec))
                hh = str(abssec // 3600).zfill(2)
                mm = str((abssec % 3600) // 60).zfill(2)
                pretty = f'UTC{sign}{hh}:{mm}'
            abbr = data.get('abbreviation') or ''
            suffix = f" — {tz_name}" if tz_name else ''
            label = " ".join([pretty, f"({abbr})" if abbr else ""]).strip() + suffix
            return label.strip()
    except Exception:
        pass

    # Fallbacks
    if tz_name:
        return tz_name
    return 'UTC+00:00 — UTC'

@locations_bp.route('/search', methods=['GET'])
def search_location():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify([])
    try:
        import requests
        url = 'https://nominatim.openstreetmap.org/search'
        params = {'format': 'json', 'q': q}
        headers = {'User-Agent': 'Hasamex-Expert-App/1.0'}
        res = requests.get(url, params=params, headers=headers, timeout=8)
        return jsonify(res.json())
    except Exception as e:
        return jsonify([])

@locations_bp.route('/save', methods=['POST'])
def save_location():
    data = request.get_json() or {}
    city = data.get('city') or None
    country = data.get('country') or None
    lat = data.get('lat')
    lng = data.get('lng')
    display = data.get('display_name') or None

    existing = None
    try:
        existing = LkLocation.query.filter_by(city=city, country=country).first()
    except Exception:
        existing = None
    if existing:
        return jsonify({'location_id': existing.id, 'timezone': existing.timezone or 'UTC'})

    tz = _get_timezone(lat, lng)
    rec = LkLocation(city=city, country=country, display_name=display, latitude=float(lat) if lat else None, longitude=float(lng) if lng else None, timezone=tz)
    db.session.add(rec)
    db.session.commit()
    return jsonify({'location_id': rec.id, 'timezone': rec.timezone or 'UTC'})
