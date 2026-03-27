from flask import Blueprint, request, jsonify
from extensions import db
from models import LkLocation

locations_bp = Blueprint('locations', __name__, url_prefix='/api/v1/location')

def _get_timezone(lat, lng):
    try:
        from timezonefinder import TimezoneFinder
        tf = TimezoneFinder()
        tz_name = tf.timezone_at(lat=float(lat), lng=float(lng))
        if tz_name:
            return tz_name
    except Exception:
        pass
    try:
        import requests
        r = requests.get(
            'https://timeapi.io/api/TimeZone/coordinate',
            params={'latitude': lat, 'longitude': lng},
            timeout=6
        )
        if r.ok:
            data = r.json() or {}
            tz = data.get('timeZone') or data.get('timeZoneId') or data.get('timezone')
            if tz:
                return tz
    except Exception:
        pass
    return UTC

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
    state = data.get('state') or None
    country = data.get('country') or None
    lat = data.get('lat')
    lng = data.get('lng')
    display = data.get('display_name') or None

    existing = None
    try:
        existing = LkLocation.query.filter_by(city=city, state=state, country=country).first()
    except Exception:
        existing = None
    if existing:
        return jsonify({'location_id': existing.id, 'timezone': existing.timezone or 'UTC'})

    tz = _get_timezone(lat, lng)
    rec = LkLocation(city=city, state=state, country=country, display_name=display, latitude=float(lat) if lat else None, longitude=float(lng) if lng else None, timezone=tz)
    db.session.add(rec)
    db.session.commit()
    return jsonify({'location_id': rec.id, 'timezone': rec.timezone or 'UTC'})
