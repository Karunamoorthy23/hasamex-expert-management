from flask import Blueprint, request, jsonify
from extensions import db
from models import Project, ProjectExpert, Call
from datetime import datetime

projects_bp = Blueprint('projects', __name__, url_prefix='/api/v1/projects')

@projects_bp.route('', methods=['GET'])
def get_projects():
    client_id = request.args.get('client_id', type=int)
    if client_id:
        projects = Project.query.filter_by(client_id=client_id).all()
    else:
        projects = Project.query.all()
    return jsonify({'data': [p.to_dict() for p in projects]})

@projects_bp.route('/<int:project_id>', methods=['GET'])
def get_project(project_id):
    project = Project.query.get_or_404(project_id)
    return jsonify({'data': project.to_dict()})

@projects_bp.route('', methods=['POST'])
def create_project():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    new_project = Project(
        client_id=data.get('client_id'),
        title=data.get('title'),
        sector=data.get('sector'),
        description=data.get('description'),
        status=data.get('status', 'Planning')
    )
    db.session.add(new_project)
    db.session.commit()
    return jsonify({'data': new_project.to_dict()}), 201

@projects_bp.route('/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    for key, value in data.items():
        if hasattr(project, key) and key not in ['project_id', 'created_at', 'updated_at']:
            setattr(project, key, value)
            
    db.session.commit()
    return jsonify({'data': project.to_dict()})

@projects_bp.route('/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    project = Project.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    return jsonify({'message': 'Project deleted successfully'})


# ── Project Experts mapping endpoints ──

@projects_bp.route('/<int:project_id>/experts', methods=['GET'])
def get_project_experts(project_id):
    allocations = ProjectExpert.query.filter_by(project_id=project_id).all()
    return jsonify({'data': [a.to_dict() for a in allocations]})

@projects_bp.route('/<int:project_id>/experts', methods=['POST'])
def add_project_expert(project_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    call_date = None
    if data.get('call_date'):
        try:
            call_date_str = data.get('call_date').replace('Z', '+00:00')
            call_date = datetime.fromisoformat(call_date_str)
        except ValueError:
            pass
            
    new_pe = ProjectExpert(
        project_id=project_id,
        expert_id=data.get('expert_id'),
        stage=data.get('stage', 'sourced'),
        call_completed=data.get('call_completed', False),
        call_date=call_date,
        expert_rate=data.get('expert_rate')
    )
    db.session.add(new_pe)
    db.session.commit()
    return jsonify({'data': new_pe.to_dict()}), 201

@projects_bp.route('/experts/<int:project_expert_id>', methods=['PUT'])
def update_project_expert(project_expert_id):
    pe = ProjectExpert.query.get_or_404(project_expert_id)
    data = request.get_json()
    
    if data.get('call_date'):
        try:
            call_date_str = data.get('call_date').replace('Z', '+00:00')
            setattr(pe, 'call_date', datetime.fromisoformat(call_date_str))
        except ValueError:
            pass
            
    for key in ['stage', 'call_completed', 'expert_rate']:
        if key in data:
            setattr(pe, key, data[key])
            
    db.session.commit()
    return jsonify({'data': pe.to_dict()})

@projects_bp.route('/experts/<int:project_expert_id>', methods=['DELETE'])
def delete_project_expert(project_expert_id):
    pe = ProjectExpert.query.get_or_404(project_expert_id)
    db.session.delete(pe)
    db.session.commit()
    return jsonify({'message': 'Project expert mapping removed'})


# ── Calls (Engagement tab) endpoints ──

@projects_bp.route('/<int:project_id>/calls', methods=['GET'])
def get_project_calls(project_id):
    calls = Call.query.filter_by(project_id=project_id).all()
    return jsonify({'data': [c.to_dict() for c in calls]})

@projects_bp.route('/<int:project_id>/calls', methods=['POST'])
def create_project_call(project_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    new_call = Call(
        project_id=project_id,
        expert_id=data.get('expert_id'),
        client_user=data.get('client_user'),
        zoom_link=data.get('zoom_link'),
        recording_url=data.get('recording_url'),
        transcript_url=data.get('transcript_url'),
        call_status=data.get('call_status', 'scheduled')
    )
    db.session.add(new_call)
    db.session.commit()
    return jsonify({'data': new_call.to_dict()}), 201

@projects_bp.route('/calls/<int:call_id>', methods=['PUT'])
def update_call(call_id):
    call = Call.query.get_or_404(call_id)
    data = request.get_json()
    
    for key in ['client_user', 'zoom_link', 'recording_url', 'transcript_url', 'call_status']:
        if key in data:
            setattr(call, key, data[key])
            
    db.session.commit()
    return jsonify({'data': call.to_dict()})

@projects_bp.route('/calls/<int:call_id>', methods=['DELETE'])
def delete_call(call_id):
    call = Call.query.get_or_404(call_id)
    db.session.delete(call)
    db.session.commit()
    return jsonify({'message': 'Call record deleted'})
