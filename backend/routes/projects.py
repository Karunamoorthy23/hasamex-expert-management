from flask import Blueprint, request, jsonify
from extensions import db
from models import (
    Project, ProjectExpert, Call,
    Client, User, LkProjectType, LkRegion, LkProjectTargetGeography
)
from datetime import datetime, date
from sqlalchemy import or_

projects_bp = Blueprint('projects', __name__, url_prefix='/api/v1/projects')

@projects_bp.route('', methods=['GET'])
def get_projects():
    """
    GET /api/v1/projects?page=1&limit=20&search=...&client_id=...
    """
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    limit = min(limit, 100)
    search = request.args.get('search', '', type=str).strip()
    client_id = request.args.get('client_id', type=int)

    query = Project.query.outerjoin(Client, Project.client_id == Client.client_id).outerjoin(User, Project.poc_user_id == User.user_id)

    if client_id:
        query = query.filter(Project.client_id == client_id)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Project.title.ilike(like),
                Project.project_title.ilike(like),
                Project.project_description.ilike(like),
                Project.target_companies.ilike(like),
                Project.target_functions_titles.ilike(like),
                Project.status.ilike(like),
                Client.client_name.ilike(like),
                User.user_name.ilike(like),
            )
        )

    query = query.order_by(Project.updated_at.desc().nulls_last())

    total_records = query.count()
    total_pages = max(1, -(-total_records // limit))
    page = min(page, total_pages)

    projects = query.offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'data': [p.to_dict() for p in projects],
        'meta': {
            'total_records': total_records,
            'current_page': page,
            'total_pages': total_pages,
            'limit': limit,
            'has_next': page < total_pages,
            'has_prev': page > 1,
        }
    })

@projects_bp.route('/<int:project_id>', methods=['GET'])
def get_project(project_id):
    project = Project.query.get_or_404(project_id)
    return jsonify({'data': project.to_dict()})

@projects_bp.route('', methods=['POST'])
def create_project():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Resolve lookups by name for convenience
    project_type_name = data.get('project_type')
    project_type_id = None
    if project_type_name:
        pt = LkProjectType.query.filter_by(name=project_type_name).first()
        project_type_id = pt.id if pt else None

    target_region_name = data.get('target_region')
    target_region_id = None
    if target_region_name:
        tr = LkRegion.query.filter_by(name=target_region_name).first()
        target_region_id = tr.id if tr else None

    def parse_date(val):
        if not val:
            return None
        if isinstance(val, date):
            return val
        try:
            return date.fromisoformat(val)
        except Exception:
            return None

    new_project = Project(
        client_id=data.get('client_id'),
        poc_user_id=data.get('poc_user_id'),
        received_date=parse_date(data.get('received_date')),
        project_title=data.get('project_title'),
        title=data.get('title') or data.get('project_title') or 'Untitled Project',
        project_type_id=project_type_id,
        project_description=data.get('project_description'),
        target_companies=data.get('target_companies'),
        target_region_id=target_region_id,
        target_functions_titles=data.get('target_functions_titles'),
        current_former_both=data.get('current_former_both'),
        number_of_calls=data.get('number_of_calls'),
        profile_question_1=data.get('profile_question_1'),
        profile_question_2=data.get('profile_question_2'),
        profile_question_3=data.get('profile_question_3'),
        compliance_question_1=data.get('compliance_question_1'),
        project_deadline=parse_date(data.get('project_deadline')),
        project_created_by=data.get('project_created_by'),
        status=data.get('status', 'Planning'),
    )

    # Target geographies (names)
    geo_names = data.get('target_geographies') or []
    if isinstance(geo_names, list) and geo_names:
        geos = LkProjectTargetGeography.query.filter(LkProjectTargetGeography.name.in_(geo_names)).all()
        new_project.target_geographies = geos

    db.session.add(new_project)
    db.session.commit()
    return jsonify({'data': new_project.to_dict()}), 201

@projects_bp.route('/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    def parse_date(val):
        if not val:
            return None
        if isinstance(val, date):
            return val
        try:
            return date.fromisoformat(val)
        except Exception:
            return None

    # Handle lookup names
    if 'project_type' in data:
        pt = LkProjectType.query.filter_by(name=data.get('project_type')).first()
        project.project_type_id = pt.id if pt else None

    if 'target_region' in data:
        tr = LkRegion.query.filter_by(name=data.get('target_region')).first()
        project.target_region_id = tr.id if tr else None

    # Handle geographies
    if 'target_geographies' in data:
        geo_names = data.get('target_geographies') or []
        if isinstance(geo_names, list):
            geos = LkProjectTargetGeography.query.filter(LkProjectTargetGeography.name.in_(geo_names)).all() if geo_names else []
            project.target_geographies = geos

    # Direct fields
    date_fields = {'received_date', 'project_deadline'}
    for key, value in data.items():
        if key in ['project_id', 'created_at', 'updated_at']:
            continue
        if not hasattr(project, key):
            continue
        if key in date_fields:
            setattr(project, key, parse_date(value))
        elif key in ['project_type', 'target_region', 'target_geographies']:
            continue
        else:
            setattr(project, key, value)
            
    db.session.commit()
    return jsonify({'data': project.to_dict()})

@projects_bp.route('/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    project = Project.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    return jsonify({'message': 'Project deleted successfully'})


@projects_bp.route('/bulk-delete', methods=['POST'])
def bulk_delete_projects():
    data = request.get_json() or {}
    ids = data.get('ids') or []
    if not isinstance(ids, list) or len(ids) == 0:
        return jsonify({'error': 'No project ids provided'}), 400

    deleted = Project.query.filter(Project.project_id.in_(ids)).delete(synchronize_session=False)
    db.session.commit()
    return jsonify({'deleted': deleted})


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
