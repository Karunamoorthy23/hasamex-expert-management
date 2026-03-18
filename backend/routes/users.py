from flask import Blueprint, request, jsonify
from extensions import db
from models import User, Client
from sqlalchemy import or_

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

    query = User.query.outerjoin(Client, User.client_id == Client.client_id)

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
                User.location.ilike(like),
                User.preferred_contact_method.ilike(like),
                User.time_zone.ilike(like),
                User.status.ilike(like),
                User.user_manager.ilike(like),
                Client.client_name.ilike(like),
                Client.client_type.ilike(like),
            )
        )

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


@users_bp.route('', methods=['POST'])
def create_user():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    new_user = User(
        user_name=data.get('user_name') or f"{data.get('first_name','')} {data.get('last_name','')}".strip() or 'User',
        user_code=data.get('user_code'),
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        designation_title=data.get('designation_title'),
        email=data.get('email'),
        phone=data.get('phone'),
        seniority=data.get('seniority'),
        linkedin_url=data.get('linkedin_url'),
        client_id=data.get('client_id'),
        location=data.get('location'),
        preferred_contact_method=data.get('preferred_contact_method'),
        time_zone=data.get('time_zone'),
        avg_calls_per_month=data.get('avg_calls_per_month'),
        status=data.get('status'),
        notes=data.get('notes'),
        user_manager=data.get('user_manager'),
        ai_generated_bio=data.get('ai_generated_bio'),
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'data': new_user.to_dict()}), 201


@users_bp.route('/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    for key, value in data.items():
        if hasattr(user, key) and key not in ['user_id', 'created_at', 'updated_at']:
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

