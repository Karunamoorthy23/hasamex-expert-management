from flask import Blueprint, request, jsonify
from extensions import db
from models import Client, User
from datetime import datetime

clients_bp = Blueprint('clients', __name__, url_prefix='/api/v1/clients')

@clients_bp.route('', methods=['GET'])
def get_clients():
    clients = Client.query.all()
    return jsonify({'data': [c.to_dict() for c in clients]})

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
        user_id=data.get('user_id'),
        location=data.get('location'),
        status=data.get('status'),
        company=data.get('company'),
        type=data.get('type')
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
