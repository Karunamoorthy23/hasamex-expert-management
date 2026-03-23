from flask import Blueprint, request, jsonify
from extensions import db
from auth import decode_token
from models import (
    Project, ProjectExpert, Call, Expert, HasamexUser,
    Client, User, LkProjectType, LkRegion, LkProjectTargetGeography
)
from datetime import datetime, date
from sqlalchemy import or_

projects_bp = Blueprint('projects', __name__, url_prefix='/api/v1/projects')

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
    
    created_by_name = None
    try:
        auth = request.headers.get('Authorization') or ''
        if auth.startswith('Bearer '):
            claims = decode_token(auth.split(' ', 1)[1].strip())
            user_id = claims.get('user_id')
            email = claims.get('email')
            if user_id:
                u = HasamexUser.query.get(user_id)
                created_by_name = (u.username if u and u.username else None) or email
            else:
                created_by_name = email
    except Exception:
        pass

    new_project = Project(
        client_id=_safe_int(data.get('client_id')),
        poc_user_id=_safe_int(data.get('poc_user_id')),
        received_date=parse_date(data.get('received_date')),
        project_title=data.get('project_title'),
        title=data.get('title') or data.get('project_title') or 'Untitled Project',
        project_type_id=project_type_id,
        project_description=data.get('project_description'),
        target_companies=data.get('target_companies'),
        target_region_id=target_region_id,
        target_functions_titles=data.get('target_functions_titles'),
        current_former_both=data.get('current_former_both'),
        number_of_calls=_safe_int(data.get('number_of_calls')),
        scheduled_calls_count=_safe_int(data.get('scheduled_calls_count')),
        completed_calls_count=_safe_int(data.get('completed_calls_count')),
        goal_calls_count=_safe_int(data.get('goal_calls_count')),
        profile_question_1=data.get('profile_question_1'),
        profile_question_2=data.get('profile_question_2'),
        profile_question_3=data.get('profile_question_3'),
        compliance_question_1=data.get('compliance_question_1'),
        project_deadline=parse_date(data.get('project_deadline')),
        project_created_by=created_by_name or data.get('project_created_by'),
        status=data.get('status', 'Planning'),
        client_solution_owner_ids=_csv_from_list(data.get('client_solution_owner_ids') or []),
        sales_team_ids=_csv_from_list(data.get('sales_team_ids') or []),
    )

    # Target geographies (names)
    geo_names = data.get('target_geographies') or []
    if isinstance(geo_names, list) and geo_names:
        geos = LkProjectTargetGeography.query.filter(LkProjectTargetGeography.name.in_(geo_names)).all()
        new_project.target_geographies = geos
    
    # Initial invited experts
    invited_ids = data.get('invited_expert_ids') or data.get('expert_ids') or []
    if isinstance(invited_ids, list):
        new_project.invited_expert_ids = [str(x) for x in invited_ids if str(x).strip() != '']

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
    csv_list_fields = {'client_solution_owner_ids', 'sales_team_ids'}
    for key, value in data.items():
        if key in ['project_id', 'created_at', 'updated_at']:
            continue
        if not hasattr(project, key):
            continue
        if key in date_fields:
            setattr(project, key, parse_date(value))
        elif key in ['project_type', 'target_region', 'target_geographies']:
            continue
        elif key in csv_list_fields:
            setattr(project, key, _csv_from_list(value))
        elif key == 'goal_calls_count':
            setattr(project, key, _safe_int(value))
        elif key in ['scheduled_calls_count', 'completed_calls_count']:
            setattr(project, key, _safe_int(value))
        else:
            setattr(project, key, value)
    
    # Update invited experts if provided (supports alias 'expert_ids')
    if 'invited_expert_ids' in data or 'expert_ids' in data:
        invited_ids = data.get('invited_expert_ids') or data.get('expert_ids') or []
        if isinstance(invited_ids, list):
            project.invited_expert_ids = [str(x) for x in invited_ids if str(x).strip() != '']
            
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

# ── Expert categories (L/I/A) endpoints ──

@projects_bp.route('/<int:project_id>/expert-status', methods=['GET'])
def get_expert_status(project_id):
    project = Project.query.get_or_404(project_id)
    def _fetch(ids):
        if not ids:
            return []
        rows = Expert.query.filter(Expert.id.in_(ids)).all()
        return [{
            'id': e.id,
            'expert_code': e.expert_id,
            'name': f"{e.first_name or ''} {e.last_name or ''}".strip() or "Unnamed Expert",
            'email': e.primary_email or "No Email",
            'phone': e.primary_phone or e.secondary_phone or None,
            'title': e.title_headline or None,
            'linkedin_url': e.linkedin_url or None
        } for e in rows]
    leads = project.leads_expert_ids or []
    invited = project.invited_expert_ids or []
    accepted = project.accepted_expert_ids or []
    return jsonify({
        'data': {
            'leads': _fetch(leads),
            'invited': _fetch(invited),
            'accepted': _fetch(accepted),
            'counts': {
                'L': len(leads),
                'I': len(invited),
                'A': len(accepted),
            }
        }
    })

@projects_bp.route('/<int:project_id>/expert-status', methods=['POST'])
def set_expert_status(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.get_json() or {}
    expert_id = (data.get('expert_id') or '').strip()
    category = (data.get('category') or '').strip().upper()
    if not expert_id or category not in {'L', 'I', 'A'}:
        return jsonify({'error': 'Invalid expert_id or category'}), 400
    leads = set(project.leads_expert_ids or [])
    invited = set(project.invited_expert_ids or [])
    accepted = set(project.accepted_expert_ids or [])
    leads.discard(expert_id)
    invited.discard(expert_id)
    accepted.discard(expert_id)
    if category == 'L':
        leads.add(expert_id)
    elif category == 'I':
        invited.add(expert_id)
    elif category == 'A':
        accepted.add(expert_id)
    project.leads_expert_ids = list(leads)
    project.invited_expert_ids = list(invited)
    project.accepted_expert_ids = list(accepted)
    db.session.commit()
    return jsonify({'data': project.to_dict()})
