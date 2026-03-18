from flask import Blueprint, request, jsonify
from extensions import db
from models import Client, User
from datetime import datetime
from sqlalchemy import or_

clients_bp = Blueprint('clients', __name__, url_prefix='/api/v1/clients')

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
        
    new_client = Client(
        client_name=data.get('client_name'),
        client_code=data.get('client_code'),
        client_type=data.get('client_type'),
        office_locations=data.get('office_locations'),
        number_of_offices=data.get('number_of_offices'),
        country=data.get('country'),
        website=data.get('website'),
        linkedin_url=data.get('linkedin_url'),
        primary_contact_user_id=data.get('primary_contact_user_id'),
        client_manager_internal=data.get('client_manager_internal'),
        billing_currency=data.get('billing_currency'),
        payment_terms=data.get('payment_terms'),
        invoicing_email=data.get('invoicing_email'),
        client_status=data.get('client_status'),
        engagement_start_date=data.get('engagement_start_date'),
        notes=data.get('notes'),
        business_activity_summary=data.get('business_activity_summary'),
        signed_msa=data.get('signed_msa'),
        commercial_model=data.get('commercial_model'),
        agreed_pricing=data.get('agreed_pricing'),
        users=data.get('users'),
        number_of_users=data.get('number_of_users'),
        msa=data.get('msa'),

        # legacy
        user_id=data.get('user_id'),
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
        
    for key, value in data.items():
        if hasattr(client, key) and key not in ['client_id', 'created_at', 'updated_at']:
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
