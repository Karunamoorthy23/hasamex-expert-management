from flask import Blueprint, request, jsonify
from extensions import db
from models import User, Client, Project, Engagement, HasamexUser, LkLocation
from sqlalchemy import func, or_, text
from sqlalchemy.exc import IntegrityError

users_bp = Blueprint('users', __name__, url_prefix='/api/v1/users')


@users_bp.route('', methods=['GET'])
def list_users():
    """
    GET /api/v1/users?page=1&limit=20&search=...
    """
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    limit = min(limit, 100)
    search = request.args.get('search', '', type=str).strip()
    filter_client_id = request.args.get('client_id', None, type=int)

    query = User.query.outerjoin(Client, User.client_id == Client.client_id).outerjoin(LkLocation, User.location_id == LkLocation.id)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                User.user_code.ilike(like),
                User.user_name.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
                User.designation_title.ilike(like),
                User.email.ilike(like),
                User.phone.ilike(like),
                User.seniority.ilike(like),
                User.linkedin_url.ilike(like),
                LkLocation.display_name.ilike(like),
                User.preferred_contact_method.ilike(like),
                LkLocation.timezone.ilike(like),
                User.status.ilike(like),
                User.user_manager.ilike(like),
                Client.client_name.ilike(like),
                Client.client_type.ilike(like),
            )
        )

    if filter_client_id:
        query = query.filter(User.client_id == filter_client_id)

    query = query.order_by(User.updated_at.desc().nulls_last())

    total_records = query.count()
    total_pages = max(1, -(-total_records // limit))
    page = min(page, total_pages)

    users = query.offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'data': [u.to_dict() for u in users],
        'meta': {
            'total_records': total_records,
            'current_page': page,
            'total_pages': total_pages,
            'limit': limit,
            'has_next': page < total_pages,
            'has_prev': page > 1,
        },
    })


@users_bp.route('/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify({'data': user.to_dict()})


@users_bp.route('/summary', methods=['GET'])
def get_users_summary():
    """
    GET /api/v1/users/summary
    Returns paginated users with project_count and engagement_count pre-computed,
    solving the N+1 problem on the frontend Users table.
    Also handles multi-value filtering.
    """
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    limit = min(limit, 100)
    search = request.args.get('search', '', type=str).strip()
    
    # Multi-value filters as CSV
    client_ids_str = request.args.get('client_id', '')
    client_types_str = request.args.get('client_type', '')
    seniorities_str = request.args.get('seniority', '')
    locations_str = request.args.get('location', '')

    query = User.query.outerjoin(Client, User.client_id == Client.client_id).outerjoin(LkLocation, User.location_id == LkLocation.id)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                User.user_code.ilike(like),
                User.user_name.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
                User.designation_title.ilike(like),
                User.email.ilike(like),
                User.seniority.ilike(like),
                LkLocation.display_name.ilike(like),
                Client.client_name.ilike(like),
                Client.client_type.ilike(like),
            )
        )

    if client_ids_str:
        ids = [int(x.strip()) for x in client_ids_str.split(',') if x.strip().isdigit()]
        if ids:
            query = query.filter(User.client_id.in_(ids))
            
    if client_types_str:
        types = [x.strip() for x in client_types_str.split(',') if x.strip()]
        if types:
            query = query.filter(Client.client_type.in_(types))
            
    if seniorities_str:
        sens = [x.strip() for x in seniorities_str.split(',') if x.strip()]
        if sens:
            query = query.filter(User.seniority.in_(sens))
            
    if locations_str:
        locs = [x.strip() for x in locations_str.split(',') if x.strip()]
        if locs:
            query = query.filter(LkLocation.display_name.in_(locs))

    query = query.order_by(User.updated_at.desc().nulls_last())

    total_records = query.count()
    total_pages = max(1, -(-total_records // limit))
    page = min(page, total_pages)
    
    users = query.offset((page - 1) * limit).limit(limit).all()
    user_ids = [u.user_id for u in users]
    
    project_counts = {}
    engagement_counts = {}
    
    if user_ids:
        # Batch count projects per user
        proj_counts_query = db.session.query(
            Project.poc_user_id, func.count(Project.project_id)
        ).filter(Project.poc_user_id.in_(user_ids)).group_by(Project.poc_user_id).all()
        project_counts = {u_id: count for u_id, count in proj_counts_query}
        
        # Batch count engagements per user
        eng_counts_query = db.session.query(
            Engagement.poc_user_id, func.count(Engagement.id)
        ).filter(Engagement.poc_user_id.in_(user_ids)).group_by(Engagement.poc_user_id).all()
        engagement_counts = {u_id: count for u_id, count in eng_counts_query}

    data = []
    for u in users:
        u_dict = u.to_dict()
        u_dict['project_count'] = project_counts.get(u.user_id, 0)
        u_dict['engagement_count'] = engagement_counts.get(u.user_id, 0)
        data.append(u_dict)

    return jsonify({
        'data': data,
        'meta': {
            'total_records': total_records,
            'current_page': page,
            'total_pages': total_pages,
            'limit': limit,
            'has_next': page < total_pages,
            'has_prev': page > 1,
        },
    })


@users_bp.route('/filter-options', methods=['GET'])
def get_user_filter_options():
    """Returns distinct values for frontend filter dropdowns."""
    client_names = [r[0] for r in db.session.query(Client.client_name).filter(Client.client_name.isnot(None)).distinct().order_by(Client.client_name).all() if r[0]]
    client_types = [r[0] for r in db.session.query(Client.client_type).filter(Client.client_type.isnot(None)).distinct().order_by(Client.client_type).all() if r[0]]
    seniorities = [r[0] for r in db.session.query(User.seniority).filter(User.seniority.isnot(None), User.seniority != '').distinct().order_by(User.seniority).all() if r[0]]
    locations = [r[0] for r in db.session.query(LkLocation.display_name).join(User, User.location_id == LkLocation.id).filter(LkLocation.display_name.isnot(None), LkLocation.display_name != '').distinct().order_by(LkLocation.display_name).all() if r[0]]
    
    return jsonify({
        'data': {
            'client_names': client_names,
            'client_types': client_types,
            'seniorities': seniorities,
            'locations': locations
        }
    })


@users_bp.route('/form-lookups', methods=['GET'])
def get_user_form_lookups():
    """Consolidated lookups for User Creation/Edit forms."""
    clients = Client.query.order_by(Client.client_name.asc()).all()
    h_users = HasamexUser.query.all()
    
    return jsonify({
        'clients': [{'client_id': c.client_id, 'client_name': c.client_name} for c in clients],
        'hasamex_users': [{'id': u.id, 'name': u.username, 'email': u.email} for u in h_users]
    })


@users_bp.route('', methods=['POST'])
def create_user():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    email = (data.get('email') or '').strip()
    if email:
        exists = User.query.filter(User.email.ilike(email)).first()
        if exists:
            return jsonify({'error': 'Email already exists', 'field': 'email'}), 409
    uc = (data.get('user_code') or '').strip()
    if not uc:
        res = db.session.execute(text("SELECT COALESCE(MAX(CAST(SUBSTRING(user_code FROM '\\\\d+$') AS INTEGER)), 0) FROM users WHERE user_code ~ '^US-\\\\d+$'"))
        max_num = res.scalar() or 0
        next_num = max_num + 1
        uc = f"US-{next_num:04d}" if next_num < 10000 else f"US-{next_num}"

    new_user = User(
        user_name=data.get('user_name') or f"{data.get('first_name','')} {data.get('last_name','')}".strip() or 'User',
        user_code=uc,
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        designation_title=data.get('designation_title'),
        email=data.get('email'),
        phone=data.get('phone'),
        seniority=data.get('seniority'),
        linkedin_url=data.get('linkedin_url'),
        client_id=data.get('client_id'),
        location_id=data.get('location_id'),
        preferred_contact_method=data.get('preferred_contact_method'),
        avg_calls_per_month=data.get('avg_calls_per_month'),
        status=data.get('status'),
        notes=data.get('notes'),
        user_manager=data.get('user_manager'),
        ai_generated_bio=data.get('ai_generated_bio'),
    )
    db.session.add(new_user)
    try:
        db.session.commit()
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({'error': 'Email already exists', 'field': 'email'}), 409
    return jsonify({'data': new_user.to_dict()}), 201


@users_bp.route('/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    for key, value in data.items():
        if key in ['user_id', 'created_at', 'updated_at', 'location', 'time_zone']:
            continue
        if hasattr(user, key):
            setattr(user, key, value)

    # keep legacy user_name in sync if first/last updated and user_name not explicitly provided
    if 'user_name' not in data and ('first_name' in data or 'last_name' in data):
        composed = " ".join([p for p in [user.first_name, user.last_name] if p]).strip()
        if composed:
            user.user_name = composed

    db.session.commit()
    return jsonify({'data': user.to_dict()})


@users_bp.route('/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted successfully'})


@users_bp.route('/bulk-delete', methods=['POST'])
def bulk_delete_users():
    data = request.get_json() or {}
    ids = data.get('ids') or []
    if not isinstance(ids, list) or len(ids) == 0:
        return jsonify({'error': 'No user ids provided'}), 400

    deleted = User.query.filter(User.user_id.in_(ids)).delete(synchronize_session=False)
    db.session.commit()
    return jsonify({'deleted': deleted})

