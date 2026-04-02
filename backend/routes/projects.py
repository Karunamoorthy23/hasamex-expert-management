from flask import Blueprint, request, jsonify, render_template
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
    poc_user_id = request.args.get('poc_user_id', type=int)

    query = Project.query.outerjoin(Client, Project.client_id == Client.client_id).outerjoin(User, Project.poc_user_id == User.user_id)

    if client_id:
        query = query.filter(Project.client_id == client_id)
    if poc_user_id:
        query = query.filter(Project.poc_user_id == poc_user_id)

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

@projects_bp.route('/summary', methods=['GET'])
def get_projects_summary():
    """Returns paginated projects with server-side filtering."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    limit = min(limit, 100)
    search = request.args.get('search', '', type=str).strip()
    
    # Comma-separated filters
    client_ids_str = request.args.get('client_id', '')
    ra_names_str = request.args.get('ra', '')
    months_str = request.args.get('month', '')
    years_str = request.args.get('year', '')

    client_ids = [int(x) for x in client_ids_str.split(',') if x.strip().isdigit()]
    ra_names = [x.strip().lower() for x in ra_names_str.split(',') if x.strip()]
    months = [int(x) for x in months_str.split(',') if x.strip().isdigit()]
    years = [int(x) for x in years_str.split(',') if x.strip().isdigit()]

    query = Project.query.outerjoin(Client, Project.client_id == Client.client_id).outerjoin(User, Project.poc_user_id == User.user_id)

    if client_ids:
        query = query.filter(Project.client_id.in_(client_ids))

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

    if months:
        query = query.filter(db.extract('month', Project.received_date).in_(months))
    if years:
        query = query.filter(db.extract('year', Project.received_date).in_(years))

    if ra_names:
        matching_users = HasamexUser.query.filter(db.func.lower(HasamexUser.username).in_(ra_names)).all()
        if not matching_users:
            query = query.filter(db.false())
        else:
            filters = []
            for u in matching_users:
                uid_str = str(u.id)
                filters.append(Project.client_solution_owner_ids == uid_str)
                filters.append(Project.client_solution_owner_ids.like(f"{uid_str},%"))
                filters.append(Project.client_solution_owner_ids.like(f"%,{uid_str}"))
                filters.append(Project.client_solution_owner_ids.like(f"%,{uid_str},%"))
            query = query.filter(or_(*filters))

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

@projects_bp.route('/filter-options', methods=['GET'])
def get_project_filter_options():
    clients = db.session.query(Client.client_name).distinct().order_by(Client.client_name).all()
    client_names = [c[0] for c in clients if c[0]]

    project_ra_csvs = db.session.query(Project.client_solution_owner_ids).filter(Project.client_solution_owner_ids != None).all()
    all_ra_ids = set()
    for row in project_ra_csvs:
        if row[0]:
            for x in str(row[0]).split(','):
                if x.strip().isdigit():
                    all_ra_ids.add(int(x.strip()))
    
    ra_names = []
    if all_ra_ids:
        users = HasamexUser.query.filter(HasamexUser.id.in_(all_ra_ids)).order_by(HasamexUser.username).all()
        ra_names = [u.username for u in users if u.username]

    dates = db.session.query(Project.received_date).filter(Project.received_date != None).all()
    years = set()
    months_idx = set()
    for d in dates:
        if d[0]:
            years.add(str(d[0].year))
            months_idx.add(d[0].month - 1)
            
    month_names = ['January','February','March','April','May','June','July','August','September','October','November','December']
    detected_months = [month_names[i] for i in sorted(list(months_idx))]

    return jsonify({
        'client_names': client_names,
        'ra_names': ra_names,
        'months': detected_months,
        'years': sorted(list(years))
    })

@projects_bp.route('/form-lookups', methods=['GET'])
def get_project_form_lookups():
    h_users = HasamexUser.query.filter_by(is_active=True).all()
    experts = Expert.query.all()
    geo = LkProjectTargetGeography.query.all()
    pt = LkProjectType.query.all()
    rg = LkRegion.query.all()
    
    lookups = {
        'hasamex_users': [{'id': u.id, 'name': u.username} for u in h_users],
        'experts_codes': [{'id': e.id, 'code': e.expert_id, 'name': f"{e.first_name} {e.last_name}"} for e in experts],
        'project_target_geographies': [g.name for g in geo],
        'project_type': [p.name for p in pt],
        'region': [r.name for r in rg]
    }
    
    clients = Client.query.order_by(Client.client_name).all()
    users = User.query.order_by(User.user_name).all()
    
    return jsonify({
        'clients': [{'client_id': c.client_id, 'client_name': c.client_name} for c in clients],
        'users': [{'user_id': u.user_id, 'user_name': u.user_name, 'client_id': u.client_id} for u in users],
        'lookups': lookups
    })

@projects_bp.route('/<int:project_id>', methods=['GET'])
def get_project(project_id):
    project = Project.query.get_or_404(project_id)
    return jsonify({'data': project.to_dict()})

@projects_bp.route('/<int:project_id>/expert-calls', methods=['POST'])
def set_expert_call_assignment(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.get_json() or {}
    expert_id = (data.get('expert_id') or '').strip()
    category = (data.get('category') or '').strip().upper()
    action = (data.get('action') or 'ADD').strip().upper()
    if not expert_id or category not in {'S', 'C'} or action not in {'ADD', 'REMOVE'}:
        return jsonify({'error': 'Invalid expert_id, category, or action'}), 400
    scheduled_set = set(project.expert_scheduled or [])
    completed_set = set(project.expert_call_completed or [])
    if action == 'REMOVE':
        if category == 'S':
            scheduled_set.discard(expert_id)
        else:
            completed_set.discard(expert_id)
    else:
        if category == 'S':
            cap = project.scheduled_calls_count or 0
            if len(scheduled_set) >= cap:
                return jsonify({'error': 'Scheduled capacity reached'}), 400
            scheduled_set.add(expert_id)
        else:
            cap = project.completed_calls_count or 0
            if len(completed_set) >= cap:
                return jsonify({'error': 'Completed capacity reached'}), 400
            completed_set.add(expert_id)
        # Move semantics: when assigning to S/C, remove from L/I/A/D lists
        leads = set(project.leads_expert_ids or [])
        invited = set(project.invited_expert_ids or [])
        accepted = set(project.accepted_expert_ids or [])
        declined = set(getattr(project, 'declined_expert_ids', []) or [])
        leads.discard(expert_id)
        invited.discard(expert_id)
        accepted.discard(expert_id)
        declined.discard(expert_id)
        project.leads_expert_ids = list(leads)
        project.invited_expert_ids = list(invited)
        project.accepted_expert_ids = list(accepted)
        project.declined_expert_ids = list(declined)
    project.expert_scheduled = list(scheduled_set)
    project.expert_call_completed = list(completed_set)
    db.session.commit()
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
    
    # Initial leads experts (UI previously called this invited_expert_ids)
    leads_ids = data.get('leads_expert_ids') or data.get('invited_expert_ids') or data.get('expert_ids') or []
    if isinstance(leads_ids, list):
        new_project.leads_expert_ids = [str(x) for x in leads_ids if str(x).strip() != '']

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
    
    # Update leads experts if provided
    if 'leads_expert_ids' in data or 'invited_expert_ids' in data or 'expert_ids' in data:
        leads_ids = data.get('leads_expert_ids') or data.get('invited_expert_ids') or data.get('expert_ids') or []
        if isinstance(leads_ids, list):
            project.leads_expert_ids = [str(x) for x in leads_ids if str(x).strip() != '']
            
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
            'bio': e.bio or None,
            'employment_history': [exp.to_dict() for exp in e.experiences] if e.experiences else [],
            'linkedin_url': e.linkedin_url or None,
            'location': e.location or None,
            'timezone': e.timezone or None,
            'rating': e.rating or 0,
            'client_solution_owner_name': e.client_solution_owner_name or None
        } for e in rows]
    leads = project.leads_expert_ids or []
    invited = project.invited_expert_ids or []
    accepted = project.accepted_expert_ids or []
    declined = getattr(project, 'declined_expert_ids', []) or []
    scheduled_assigned = project.expert_scheduled or []
    completed_assigned = project.expert_call_completed or []
    return jsonify({
        'data': {
            'leads': _fetch(leads),
            'invited': _fetch(invited),
            'accepted': _fetch(accepted),
            'declined': _fetch(declined),
            'scheduled': _fetch(scheduled_assigned),
            'completed': _fetch(completed_assigned),
            'counts': {
                'L': len(leads),
                'I': len(invited),
                'A': len(accepted),
                'D': len(declined),
                'S': len(scheduled_assigned),
                'C': len(completed_assigned),
            }
        }
    })

@projects_bp.route('/<int:project_id>/expert-status', methods=['POST'])
def set_expert_status(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.get_json() or {}
    expert_id = (data.get('expert_id') or '').strip()
    category = (data.get('category') or '').strip().upper()
    if not expert_id or category not in {'L', 'I', 'A', 'D'}:
        return jsonify({'error': 'Invalid expert_id or category'}), 400
    leads = set(project.leads_expert_ids or [])
    invited = set(project.invited_expert_ids or [])
    accepted = set(project.accepted_expert_ids or [])
    declined = set(getattr(project, 'declined_expert_ids', []) or [])
    leads.discard(expert_id)
    invited.discard(expert_id)
    accepted.discard(expert_id)
    declined.discard(expert_id)
    if category == 'L':
        leads.add(expert_id)
    elif category == 'I':
        invited.add(expert_id)
    elif category == 'A':
        accepted.add(expert_id)
    elif category == 'D':
        declined.add(expert_id)
    project.leads_expert_ids = list(leads)
    project.invited_expert_ids = list(invited)
    project.accepted_expert_ids = list(accepted)
    project.declined_expert_ids = list(declined)
    db.session.commit()
    return jsonify({'data': project.to_dict()})

@projects_bp.route('/<int:project_id>/send-invite', methods=['POST'])
def send_project_invite(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.get_json() or {}
    expert_ids = data.get('expert_ids', [])
    if not expert_ids:
        return jsonify({'error': 'No expert IDs provided'}), 400

    experts = Expert.query.filter(Expert.id.in_(expert_ids)).all()
    if not experts:
        return jsonify({'error': 'Experts not found'}), 404

    from services.mailer import send_email
    import os
    
    sent_count = 0
    errors = []
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip('/')
    
    p_title = project.project_title or project.title or "Expert Project"
    p_code = project.project_id
    p_start = project.received_date.strftime("%b %d, %Y") if project.received_date else "TBD"
    p_region = project.rel_target_region.name if getattr(project, 'rel_target_region', None) else "Global"
    p_desc = project.project_description or "We invite you to participate in a high-level research study."
    p_type = project.rel_project_type.name if getattr(project, 'rel_project_type', None) else "Paid Expert Interview"

    leads_set = set(project.leads_expert_ids or [])
    invited_set = set(project.invited_expert_ids or [])

    for expert in experts:
        if not expert.primary_email:
            errors.append(f"Expert {expert.expert_id} has no email")
            continue
        
        cta_link = f"{frontend_url}/project-form/{project.project_id}?expert_id={expert.expert_id}"
        
        try:
            html_content = render_template('project_invite.html',
                expert_name=expert.first_name or "Expert",
                project_title=p_title,
                project_description=p_desc,
                project_code=f"PRJ-{p_code}",
                project_start=p_start,
                project_region=p_region,
                project_type=p_type,
                cta_link=cta_link
            )
            
            subject = f"Invitation To Consult - {p_title}"
            send_email(to=expert.primary_email, subject=subject, html=html_content)
            sent_count += 1
            
            # Move from Leads to Invited
            e_id_str = str(expert.id)
            e_id_int = expert.id
            if e_id_str in leads_set: leads_set.remove(e_id_str)
            if e_id_int in leads_set: leads_set.remove(e_id_int)
            invited_set.add(e_id_str)
            
        except Exception as e:
            errors.append(f"Failed to send to {expert.primary_email}: {str(e)}")

    if sent_count > 0:
        project.leads_expert_ids = list(leads_set)
        project.invited_expert_ids = list(invited_set)
        db.session.commit()

    return jsonify({'sent_count': sent_count, 'errors': errors})

# ── Public endpoint for expert application form (no auth) ──

public_projects_bp = Blueprint('public_projects', __name__, url_prefix='/api/v1/public/projects')

@public_projects_bp.route('/<int:project_id>/form', methods=['GET'])
def get_project_form_public(project_id):
    """Return only the fields needed for the expert-facing application form."""
    project = Project.query.get_or_404(project_id)
    client = Client.query.get(project.client_id) if project.client_id else None
    return jsonify({'data': {
        'project_id': project.project_id,
        'project_title': project.project_title or project.title,
        'project_description': project.project_description or project.description,
        'sector': project.sector,
        'received_date': project.received_date.isoformat() if project.received_date else None,
        'project_deadline': project.project_deadline.isoformat() if project.project_deadline else None,
        'target_region': project.rel_target_region.name if project.rel_target_region else None,
        'target_geographies': [g.name for g in project.target_geographies] if project.target_geographies else [],
        'target_functions_titles': project.target_functions_titles,
        'project_type': project.rel_project_type.name if project.rel_project_type else None,
        'profile_question_1': project.profile_question_1,
        'profile_question_2': project.profile_question_2,
        'profile_question_3': project.profile_question_3,
        'client_type': client.client_type if client else None,
        'client_name': client.client_name if client else None,
    }})
