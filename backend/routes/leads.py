from flask import Blueprint, request, jsonify
from sqlalchemy import or_
from extensions import db
from models import LeadClient, LeadExpert, LeadCandidate
import re
import os
import uuid
from werkzeug.utils import secure_filename
from datetime import datetime

leads_bp = Blueprint('leads', __name__, url_prefix='/api/v1/leads')

def _paginate(query, page, limit):
    total_records = query.count()
    total_pages = max(1, -(-total_records // limit))
    page = min(page, total_pages)
    rows = query.offset((page - 1) * limit).limit(limit).all()
    return rows, {
        'total_records': total_records,
        'current_page': page,
        'total_pages': total_pages,
        'limit': limit,
        'has_next': page < total_pages,
        'has_prev': page > 1,
    }

@leads_bp.route('/clients', methods=['GET'])
def list_lead_clients():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    limit = min(limit, 100)
    search = request.args.get('search', '', type=str).strip()
    query = LeadClient.query
    if search:
        like = f"%{search}%"
        query = query.filter(or_(
            LeadClient.first_name.ilike(like),
            LeadClient.last_name.ilike(like),
            LeadClient.company_name.ilike(like),
            LeadClient.business_email.ilike(like),
            LeadClient.current_role.ilike(like)
        ))
    query = query.order_by(LeadClient.updated_at.desc().nulls_last())
    rows, meta = _paginate(query, page, limit)
    return jsonify({'data': [r.to_dict() for r in rows], 'meta': meta})

@leads_bp.route('/clients', methods=['POST'])
def create_lead_client():
    data = request.get_json(silent=True) or {}
    required = ['first_name', 'last_name', 'company_name', 'current_role', 'business_email', 'description']
    missing = [f for f in required if not str(data.get(f) or '').strip()]
    if missing:
        return jsonify({'error': 'Validation failed', 'details': missing}), 400
    status = (data.get('status') or 'Backlog').strip()
    rd = None
    rd_str = (data.get('received_date') or '').strip()
    if rd_str:
        try:
            rd = datetime.fromisoformat(rd_str).date()
        except Exception:
            rd = None
    row = LeadClient(
        first_name=data['first_name'].strip(),
        last_name=data['last_name'].strip(),
        company_name=data['company_name'].strip(),
        current_role=data['current_role'].strip(),
        business_email=data['business_email'].strip(),
        description=data['description'].strip(),
        received_date=rd,
        status=status
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({'data': row.to_dict()}), 201

@leads_bp.route('/clients/<string:lead_id>', methods=['GET'])
def get_lead_client(lead_id):
    row = LeadClient.query.get_or_404(lead_id)
    return jsonify({'data': row.to_dict()})

@leads_bp.route('/clients/<string:lead_id>', methods=['PUT'])
def update_lead_client(lead_id):
    row = LeadClient.query.get_or_404(lead_id)
    data = request.get_json(silent=True) or {}
    for f in ['first_name','last_name','company_name','current_role','business_email','description','status']:
        if f in data:
            val = data.get(f)
            setattr(row, f, val.strip() if isinstance(val, str) else val)
    if 'received_date' in data:
        rd = None
        rd_str = (data.get('received_date') or '').strip()
        if rd_str:
            try:
                rd = datetime.fromisoformat(rd_str).date()
            except Exception:
                rd = None
        row.received_date = rd
    db.session.commit()
    return jsonify({'data': row.to_dict()})

@leads_bp.route('/clients/<string:lead_id>', methods=['DELETE'])
def delete_lead_client(lead_id):
    row = LeadClient.query.get_or_404(lead_id)
    db.session.delete(row)
    db.session.commit()
    return ('', 204)
@leads_bp.route('/upload-file', methods=['POST'])
def upload_candidate_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    allowed_extensions = {'pdf', 'doc', 'docx'}
    ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    if ext not in allowed_extensions:
        return jsonify({'error': 'File type not allowed'}), 400
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_folder = os.path.join(base_dir, 'candidate_files')
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    unique_name = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
    file_path = os.path.join(upload_folder, unique_name)
    file.save(file_path)
    from flask import request as flask_request
    full_url = f"{flask_request.host_url.rstrip('/')}/candidate_files/{unique_name}"
    return jsonify({'url': full_url, 'filename': file.filename})

@leads_bp.route('/experts', methods=['GET'])
def list_lead_experts():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    limit = min(limit, 100)
    search = request.args.get('search', '', type=str).strip()
    query = LeadExpert.query
    if search:
        like = f"%{search}%"
        query = query.filter(or_(
            LeadExpert.first_name.ilike(like),
            LeadExpert.last_name.ilike(like),
            LeadExpert.city.ilike(like),
            LeadExpert.email.ilike(like),
            LeadExpert.linkedin_url.ilike(like)
        ))
    query = query.order_by(LeadExpert.updated_at.desc().nulls_last())
    rows, meta = _paginate(query, page, limit)
    return jsonify({'data': [r.to_dict() for r in rows], 'meta': meta})

@leads_bp.route('/experts', methods=['POST'])
def create_lead_expert():
    data = request.get_json(silent=True) or {}
    required = ['first_name', 'last_name', 'city', 'email', 'phone_number', 'linkedin_url']
    missing = [f for f in required if not str(data.get(f) or '').strip()]
    if missing:
        return jsonify({'error': 'Validation failed', 'details': missing}), 400
    email = data['email'].strip()
    phone = data['phone_number'].strip()
    linkedin = data['linkedin_url'].strip()
    if not re.match(r'^\S+@\S+\.\S+$', email):
        return jsonify({'error': 'Invalid email'}), 400
    if not re.match(r'^[0-9+\-() ]{7,20}$', phone):
        return jsonify({'error': 'Invalid phone number'}), 400
    if not (re.match(r'^https?://', linkedin, re.I) and 'linkedin.com' in linkedin.lower()):
        return jsonify({'error': 'Invalid LinkedIn URL'}), 400
    status = (data.get('status') or 'Backlog').strip()
    rd = None
    rd_str = (data.get('received_date') or '').strip()
    if rd_str:
        try:
            rd = datetime.fromisoformat(rd_str).date()
        except Exception:
            rd = None
    row = LeadExpert(
        first_name=data['first_name'].strip(),
        last_name=data['last_name'].strip(),
        city=data['city'].strip(),
        email=data['email'].strip(),
        phone_number=data['phone_number'].strip(),
        linkedin_url=data['linkedin_url'].strip(),
        description=(data.get('description') or '').strip() or None,
        received_date=rd,
        status=status
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({'data': row.to_dict()}), 201

@leads_bp.route('/experts/<string:lead_id>', methods=['GET'])
def get_lead_expert(lead_id):
    row = LeadExpert.query.get_or_404(lead_id)
    return jsonify({'data': row.to_dict()})

@leads_bp.route('/experts/<string:lead_id>', methods=['PUT'])
def update_lead_expert(lead_id):
    row = LeadExpert.query.get_or_404(lead_id)
    data = request.get_json(silent=True) or {}
    for f in ['first_name','last_name','city','email','phone_number','linkedin_url','description','status']:
        if f in data:
            val = data.get(f)
            setattr(row, f, val.strip() if isinstance(val, str) else val)
    if 'received_date' in data:
        rd = None
        rd_str = (data.get('received_date') or '').strip()
        if rd_str:
            try:
                rd = datetime.fromisoformat(rd_str).date()
            except Exception:
                rd = None
        row.received_date = rd
    db.session.commit()
    return jsonify({'data': row.to_dict()})

@leads_bp.route('/experts/<string:lead_id>', methods=['DELETE'])
def delete_lead_expert(lead_id):
    row = LeadExpert.query.get_or_404(lead_id)
    db.session.delete(row)
    db.session.commit()
    return ('', 204)
@leads_bp.route('/candidates', methods=['GET'])
def list_lead_candidates():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    limit = min(limit, 100)
    search = request.args.get('search', '', type=str).strip()
    query = LeadCandidate.query
    if search:
        like = f"%{search}%"
        query = query.filter(or_(
            LeadCandidate.first_name.ilike(like),
            LeadCandidate.last_name.ilike(like),
            LeadCandidate.city.ilike(like),
            LeadCandidate.email.ilike(like),
            LeadCandidate.linkedin_url.ilike(like)
        ))
    query = query.order_by(LeadCandidate.updated_at.desc().nulls_last())
    rows, meta = _paginate(query, page, limit)
    return jsonify({'data': [r.to_dict() for r in rows], 'meta': meta})

@leads_bp.route('/candidates', methods=['POST'])
def create_lead_candidate():
    data = request.get_json(silent=True) or {}
    required = ['first_name', 'last_name', 'city', 'email', 'phone_number', 'linkedin_url', 'resume_url']
    missing = [f for f in required if not str(data.get(f) or '').strip()]
    if missing:
        return jsonify({'error': 'Validation failed', 'details': missing}), 400
    email = data['email'].strip()
    phone = data['phone_number'].strip()
    linkedin = data['linkedin_url'].strip()
    if not re.match(r'^\S+@\S+\.\S+$', email):
        return jsonify({'error': 'Invalid email'}), 400
    if not re.match(r'^[0-9+\-() ]{7,20}$', phone):
        return jsonify({'error': 'Invalid phone number'}), 400
    if not (re.match(r'^https?://', linkedin, re.I) and 'linkedin.com' in linkedin.lower()):
        return jsonify({'error': 'Invalid LinkedIn URL'}), 400
    status = (data.get('status') or 'Backlog').strip()
    rd = None
    rd_str = (data.get('received_date') or '').strip()
    if rd_str:
        try:
            rd = datetime.fromisoformat(rd_str).date()
        except Exception:
            rd = None
    row = LeadCandidate(
        first_name=data['first_name'].strip(),
        last_name=data['last_name'].strip(),
        city=data['city'].strip(),
        email=data['email'].strip(),
        phone_number=data['phone_number'].strip(),
        linkedin_url=data['linkedin_url'].strip(),
        resume_url=data['resume_url'].strip(),
        received_date=rd,
        status=status
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({'data': row.to_dict()}), 201

@leads_bp.route('/candidates/<string:lead_id>', methods=['GET'])
def get_lead_candidate(lead_id):
    row = LeadCandidate.query.get_or_404(lead_id)
    return jsonify({'data': row.to_dict()})

@leads_bp.route('/candidates/<string:lead_id>', methods=['PUT'])
def update_lead_candidate(lead_id):
    row = LeadCandidate.query.get_or_404(lead_id)
    data = request.get_json(silent=True) or {}
    for f in ['first_name','last_name','city','email','phone_number','linkedin_url','resume_url','status']:
        if f in data:
            val = data.get(f)
            setattr(row, f, val.strip() if isinstance(val, str) else val)
    if 'received_date' in data:
        rd = None
        rd_str = (data.get('received_date') or '').strip()
        if rd_str:
            try:
                rd = datetime.fromisoformat(rd_str).date()
            except Exception:
                rd = None
        row.received_date = rd
    db.session.commit()
    return jsonify({'data': row.to_dict()})

@leads_bp.route('/candidates/<string:lead_id>', methods=['DELETE'])
def delete_lead_candidate(lead_id):
    row = LeadCandidate.query.get_or_404(lead_id)
    db.session.delete(row)
    db.session.commit()
    return ('', 204)
