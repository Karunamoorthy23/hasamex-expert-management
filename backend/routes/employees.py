from flask import Blueprint, request, jsonify
from sqlalchemy import or_
from extensions import db
from models import HasamexUser

employees_bp = Blueprint('employees', __name__, url_prefix='/api/v1/employees')

@employees_bp.route('', methods=['GET'])
def list_employees():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    limit = min(limit, 100)
    search = request.args.get('search', '', type=str).strip()

    query = HasamexUser.query
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                HasamexUser.username.ilike(like),
                HasamexUser.first_name.ilike(like),
                HasamexUser.last_name.ilike(like),
                HasamexUser.email.ilike(like),
                HasamexUser.title.ilike(like),
                HasamexUser.pan_number.ilike(like),
                HasamexUser.aadhar_number.ilike(like),
                HasamexUser.linkedin_url.ilike(like),
                HasamexUser.mobile.ilike(like),
                HasamexUser.role.ilike(like),
            )
        )
    query = query.order_by(HasamexUser.updated_at.desc().nulls_last())
    total_records = query.count()
    total_pages = max(1, -(-total_records // limit))
    page = min(page, total_pages)
    rows = query.limit(limit).offset((page - 1) * limit).all()
    return jsonify({
        'data': [r.to_dict() for r in rows],
        'meta': {
            'total_records': total_records,
            'current_page': page,
            'total_pages': total_pages,
            'limit': limit,
        }
    })

def _parse_date(val):
    try:
        from datetime import date
        if not val:
            return None
        if isinstance(val, date):
            return val
        return date.fromisoformat(str(val))
    except Exception:
        return None

@employees_bp.route('', methods=['POST'])
def create_employee():
    data = request.get_json() or {}
    required = ['email', 'role']
    missing = [k for k in required if not str(data.get(k, '')).strip()]
    if missing:
        return jsonify({'error': f"Missing fields: {', '.join(missing)}"}), 400
    new_emp = HasamexUser(
        username=(data.get('username') or '').strip() or " ".join([p for p in [data.get('first_name'), data.get('last_name')] if p]).strip() or data.get('email'),
        first_name=(data.get('first_name') or '').strip() or None,
        last_name=(data.get('last_name') or '').strip() or None,
        title=(data.get('title') or '').strip() or None,
        pan_number=(data.get('pan_number') or '').strip() or None,
        aadhar_number=(data.get('aadhar_number') or '').strip() or None,
        date_of_joining=_parse_date(data.get('date_of_joining')),
        linkedin_url=(data.get('linkedin_url') or '').strip() or None,
        mobile=(data.get('mobile') or '').strip() or None,
        reporting_manager_id=data.get('reporting_manager_id'),
        email=(data.get('email') or '').strip(),
        role=(data.get('role') or '').strip(),
        password_hash='!'  # placeholder to satisfy NOT NULL; not used for login unless set
    )
    db.session.add(new_emp)
    db.session.commit()
    return jsonify({'data': new_emp.to_dict()}), 201

@employees_bp.route('/<int:emp_id>', methods=['GET'])
def get_employee(emp_id):
    emp = HasamexUser.query.get_or_404(emp_id)
    return jsonify({'data': emp.to_dict()})

@employees_bp.route('/<int:emp_id>', methods=['PUT'])
def update_employee(emp_id):
    emp = HasamexUser.query.get_or_404(emp_id)
    data = request.get_json() or {}
    for key, value in data.items():
        if key in ['id', 'created_at', 'updated_at', 'password_hash']:
            continue
        if key == 'date_of_joining':
            setattr(emp, key, _parse_date(value))
        elif hasattr(emp, key):
            setattr(emp, key, value)
    # Ensure username remains meaningful
    if ('first_name' in data or 'last_name' in data) and not data.get('username'):
        composed = " ".join([p for p in [emp.first_name, emp.last_name] if p]).strip()
        if composed:
            emp.username = composed
    db.session.commit()
    return jsonify({'data': emp.to_dict()})
