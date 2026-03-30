from flask import Blueprint, request, jsonify
from extensions import db
from models import Client, User, Expert, HasamexUser, Engagement, Project
from datetime import datetime
from sqlalchemy import or_, func

clients_bp = Blueprint('clients', __name__, url_prefix='/api/v1/clients')

def _csv_from_list(val):
    if val is None:
        return None
    if isinstance(val, list):
        return ','.join(str(x) for x in val if str(x).strip() != '')
    return str(val)

def _safe_int(val):
    if val is None or str(val).strip() == '':
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None

def _safe_date(val):
    if not val or str(val).strip() == '':
        return None
    if isinstance(val, datetime):
        return val.date()
    try:
        return datetime.strptime(str(val).split('T')[0], '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None

@clients_bp.route('', methods=['GET'])
def get_clients():
    """
    GET /api/v1/clients?page=1&limit=20&search=...
    """
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    limit = min(limit, 100)
    search = request.args.get('search', '', type=str).strip()

    query = Client.query

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Client.client_name.ilike(like),
                Client.client_code.ilike(like),
                Client.client_type.ilike(like),
                Client.office_locations.ilike(like),
                Client.country.ilike(like),
                Client.website.ilike(like),
                Client.linkedin_url.ilike(like),
                Client.client_manager_internal.ilike(like),
                Client.billing_currency.ilike(like),
                Client.client_status.ilike(like),
                Client.location.ilike(like),
                Client.status.ilike(like),
                Client.company.ilike(like),
                Client.type.ilike(like),
            )
        )

    query = query.order_by(Client.updated_at.desc().nulls_last())

    total_records = query.count()
    total_pages = max(1, -(-total_records // limit))
    page = min(page, total_pages)

    clients = query.offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'data': [c.to_dict() for c in clients],
        'meta': {
            'total_records': total_records,
            'current_page': page,
            'total_pages': total_pages,
            'limit': limit,
            'has_next': page < total_pages,
            'has_prev': page > 1,
        }
    })

@clients_bp.route('/<int:client_id>', methods=['GET'])
def get_client(client_id):
    client = Client.query.get_or_404(client_id)
    return jsonify({'data': client.to_dict()})

@clients_bp.route('', methods=['POST'])
def create_client():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    expert_ids_list = data.get('expert_ids') or []
    owner_ids_manual = data.get('client_solution_owner_ids') or []
    # derive owners from selected experts
    owners_from_experts = []
    if isinstance(expert_ids_list, list) and len(expert_ids_list) > 0:
        rows = Expert.query.filter(Expert.id.in_(expert_ids_list)).all()
        owners_from_experts = [r.client_solution_owner_id for r in rows if r.client_solution_owner_id]
    
    # safely convert manual owner ids
    safe_manual_ids = []
    for x in owner_ids_manual:
        v = _safe_int(x)
        if v is not None:
            safe_manual_ids.append(v)
            
    owner_ids_union = sorted(set(safe_manual_ids) | {int(x) for x in owners_from_experts})
    sales_team_ids_list = data.get('sales_team_ids') or []

    new_client = Client(
        client_name=data.get('client_name'),
        client_code=data.get('client_code'),
        client_type=data.get('client_type'),
        office_locations=data.get('office_locations'),
        number_of_offices=_safe_int(data.get('number_of_offices')),
        country=data.get('country'),
        website=data.get('website'),
        linkedin_url=data.get('linkedin_url'),
        primary_contact_user_id=_safe_int(data.get('primary_contact_user_id')),
        client_manager_internal=data.get('client_manager_internal'),
        billing_currency=data.get('billing_currency'),
        payment_terms=data.get('payment_terms'),
        invoicing_email=data.get('invoicing_email'),
        client_status=data.get('client_status'),
        engagement_start_date=_safe_date(data.get('engagement_start_date')),
        notes=data.get('notes'),
        business_activity_summary=data.get('business_activity_summary'),
        signed_msa=data.get('signed_msa'),
        commercial_model=data.get('commercial_model'),
        agreed_pricing=data.get('agreed_pricing'),
        users=data.get('users'),
        number_of_users=_safe_int(data.get('number_of_users')),
        msa=data.get('msa'),
        service_rules=data.get('service_rules'),
        # new fields
        expert_ids=_csv_from_list(expert_ids_list),
        client_solution_owner_ids=_csv_from_list(owner_ids_union),
        sales_team_ids=_csv_from_list(sales_team_ids_list),

        # legacy
        user_id=_safe_int(data.get('user_id')),
        location=data.get('location'),
        status=data.get('status'),
        company=data.get('company'),
        type=data.get('type'),
    )
    db.session.add(new_client)
    db.session.commit()
    return jsonify({'data': new_client.to_dict()}), 201

@clients_bp.route('/<int:client_id>', methods=['PUT'])
def update_client(client_id):
    client = Client.query.get_or_404(client_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # handle special lists before generic setattr
    expert_ids_list = data.pop('expert_ids', None)
    owner_ids_manual = data.pop('client_solution_owner_ids', None)
    sales_team_ids_list = data.pop('sales_team_ids', None)

    if expert_ids_list is not None:
        client.expert_ids = _csv_from_list(expert_ids_list)
        rows = Expert.query.filter(Expert.id.in_(expert_ids_list)).all()
        owners_from_experts = [r.client_solution_owner_id for r in rows if r.client_solution_owner_id]
        
        # safely convert existing ids
        existing = []
        if client.client_solution_owner_ids:
            for x in client.client_solution_owner_ids.split(','):
                v = _safe_int(x)
                if v is not None:
                    existing.append(v)
        
        # safely convert manual ids
        manual = []
        if isinstance(owner_ids_manual, list):
            for x in owner_ids_manual:
                v = _safe_int(x)
                if v is not None:
                    manual.append(v)
        else:
            manual = existing
            
        union_ids = sorted(set(existing) | set(owners_from_experts) | set(manual))
        client.client_solution_owner_ids = _csv_from_list(union_ids)
        
    elif owner_ids_manual is not None:
        client.client_solution_owner_ids = _csv_from_list(owner_ids_manual)
        
    if sales_team_ids_list is not None:
        client.sales_team_ids = _csv_from_list(sales_team_ids_list)

    # list of fields that should be handled as integers
    int_fields = ['number_of_offices', 'primary_contact_user_id', 'number_of_users', 'user_id']
    # list of fields that should be handled as dates
    date_fields = ['engagement_start_date']

    for key, value in data.items():
        if hasattr(client, key) and key not in ['client_id', 'created_at', 'updated_at']:
            if key in int_fields:
                setattr(client, key, _safe_int(value))
            elif key in date_fields:
                setattr(client, key, _safe_date(value))
            else:
                setattr(client, key, value)
            
    db.session.commit()
    return jsonify({'data': client.to_dict()})

@clients_bp.route('/<int:client_id>', methods=['DELETE'])
def delete_client(client_id):
    client = Client.query.get_or_404(client_id)
    db.session.delete(client)
    db.session.commit()
    return jsonify({'message': 'Client deleted successfully'})


@clients_bp.route('/bulk-delete', methods=['POST'])
def bulk_delete_clients():
    data = request.get_json() or {}
    ids = data.get('ids') or []
    if not isinstance(ids, list) or len(ids) == 0:
        return jsonify({'error': 'No client ids provided'}), 400

    deleted = Client.query.filter(Client.client_id.in_(ids)).delete(synchronize_session=False)
    db.session.commit()
    return jsonify({'deleted': deleted})


@clients_bp.route('/summary', methods=['GET'])
def get_clients_summary():
    """
    GET /api/v1/clients/summary?page=1&limit=20&search=...
    Returns paginated clients with pre-computed project_count,
    engagement_count, and user_count — eliminates N+1 frontend calls.
    """
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    limit = min(limit, 100)
    search = request.args.get('search', '', type=str).strip()

    query = Client.query

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Client.client_name.ilike(like),
                Client.client_code.ilike(like),
                Client.client_type.ilike(like),
                Client.office_locations.ilike(like),
                Client.country.ilike(like),
                Client.website.ilike(like),
                Client.linkedin_url.ilike(like),
                Client.client_manager_internal.ilike(like),
                Client.billing_currency.ilike(like),
                Client.client_status.ilike(like),
                Client.location.ilike(like),
                Client.status.ilike(like),
                Client.company.ilike(like),
                Client.type.ilike(like),
            )
        )

    query = query.order_by(Client.updated_at.desc().nulls_last())

    total_records = query.count()
    total_pages = max(1, -(-total_records // limit))
    page = min(page, total_pages)

    clients = query.offset((page - 1) * limit).limit(limit).all()

    # Collect client IDs on this page for batch count queries
    client_ids = [c.client_id for c in clients]

    # Batch-compute counts using GROUP BY (avoids N+1)
    project_counts = {}
    engagement_counts = {}
    user_counts = {}

    if client_ids:
        for cid, cnt in db.session.query(
            Project.client_id, func.count(Project.project_id)
        ).filter(Project.client_id.in_(client_ids)).group_by(Project.client_id).all():
            project_counts[cid] = cnt

        for cid, cnt in db.session.query(
            Engagement.client_id, func.count(Engagement.id)
        ).filter(Engagement.client_id.in_(client_ids)).group_by(Engagement.client_id).all():
            engagement_counts[cid] = cnt

        for cid, cnt in db.session.query(
            User.client_id, func.count(User.user_id)
        ).filter(User.client_id.in_(client_ids)).group_by(User.client_id).all():
            user_counts[cid] = cnt

    data = []
    for c in clients:
        d = c.to_dict()
        d['project_count'] = project_counts.get(c.client_id, 0)
        d['engagement_count'] = engagement_counts.get(c.client_id, 0)
        d['user_count'] = user_counts.get(c.client_id, 0)
        data.append(d)

    return jsonify({
        'data': data,
        'meta': {
            'total_records': total_records,
            'current_page': page,
            'total_pages': total_pages,
            'limit': limit,
            'has_next': page < total_pages,
            'has_prev': page > 1,
        }
    })


@clients_bp.route('/form-lookups', methods=['GET'])
def get_client_form_lookups():
    """
    GET /api/v1/clients/form-lookups
    Returns all data needed by ClientEditPage and ClientCreatePage
    in a single request — replaces 3 separate API calls.
    """
    # Client users (same as /clients/users)
    users = User.query.all()
    client_users = [u.to_dict() for u in users]

    # Hasamex internal users (same subset from /lookups)
    hasamex_users = [{'id': h.id, 'name': h.username} for h in HasamexUser.query.all()]

    return jsonify({
        'data': {
            'client_users': client_users,
            'hasamex_users': hasamex_users,
        }
    })

# Users endpoints for basic management
@clients_bp.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify({'data': [u.to_dict() for u in users]})

@clients_bp.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    new_user = User(
        user_name=data.get('user_name')
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'data': new_user.to_dict()}), 201
