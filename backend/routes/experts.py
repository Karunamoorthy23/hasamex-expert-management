"""
Experts API Blueprint — /api/v1/experts
CRUD operations with pagination, search, and filtering.
"""

from flask import Blueprint, request, jsonify, send_file
from sqlalchemy import or_, func
from extensions import db
from models import Expert
import pandas as pd
from io import BytesIO
from datetime import datetime

experts_bp = Blueprint('experts', __name__, url_prefix='/api/v1/experts')




def _apply_experts_filters(query, args):
    """Common filtering logic for list and export."""
    search = args.get('search', '', type=str).strip()
    region = args.get('region', '', type=str).strip()
    primary_sector = args.get('primary_sector', '', type=str).strip()
    expert_status = args.get('expert_status', '', type=str).strip()
    # Note: request.args is a MultiDict, but here we expect a dict-like
    
    # Re-evaluating args usage. args can be request.args
    employment = args.get('current_employment_status', '', type=str).strip()
    ids = args.get('ids', '', type=str).strip()

    # ── IDs Filter ──
    if ids:
        id_list = [i.strip() for i in ids.split(',') if i.strip()]
        if id_list:
            query = query.filter(Expert.id.in_(id_list))

    # ── Search ──
    if search:
        search_pattern = f'%{search}%'
        query = query.filter(
            or_(
                Expert.first_name.ilike(search_pattern),
                Expert.last_name.ilike(search_pattern),
                Expert.title_headline.ilike(search_pattern),
                Expert.primary_sector.ilike(search_pattern),
                Expert.location.ilike(search_pattern),
                Expert.linkedin_url.ilike(search_pattern),
                Expert.company_role.ilike(search_pattern),
                Expert.expert_function.ilike(search_pattern),
                Expert.primary_email.ilike(search_pattern),
            )
        )

    # ── Filters ──
    if region:
        regions = [r.strip() for r in region.split(',') if r.strip()]
        if regions:
            query = query.filter(Expert.region.in_(regions))

    if primary_sector:
        sectors = [s.strip() for s in primary_sector.split(',') if s.strip()]
        if sectors:
            query = query.filter(Expert.primary_sector.in_(sectors))

    if expert_status:
        statuses = [s.strip() for s in expert_status.split(',') if s.strip()]
        if statuses:
            query = query.filter(Expert.expert_status.in_(statuses))

    if employment:
        emp_list = [e.strip() for e in employment.split(',') if e.strip()]
        if emp_list:
            query = query.filter(Expert.current_employment_status.in_(emp_list))

    return query


def _validate_required_fields(data):
    """Validate required fields for expert creation."""
    errors = []
    if not data.get('expert_id', '').strip():
        errors.append('expert_id is required')
    if not data.get('first_name', '').strip():
        errors.append('first_name is required')
    if not data.get('last_name', '').strip():
        errors.append('last_name is required')
    return errors


def _check_duplicates(data, exclude_id=None):
    """Check for duplicate expert_id, email or LinkedIn URL."""
    warnings = []

    eid = data.get('expert_id', '').strip()
    if eid:
        query = Expert.query.filter(Expert.expert_id == eid)
        if exclude_id:
            query = query.filter(Expert.id != exclude_id)
        existing = query.first()
        if existing:
            warnings.append({
                'field': 'expert_id',
                'message': f'Expert ID {eid} already exists',
                'existing_id': existing.id,
            })

    email = data.get('primary_email', '').strip()
    if email:
        query = Expert.query.filter(Expert.primary_email == email)
        if exclude_id:
            query = query.filter(Expert.id != exclude_id)
        existing = query.first()
        if existing:
            warnings.append({
                'field': 'primary_email',
                'message': f'Email already exists for {existing.expert_id}',
                'existing_id': existing.id,
            })

    linkedin = data.get('linkedin_url', '').strip()
    if linkedin:
        query = Expert.query.filter(Expert.linkedin_url == linkedin)
        if exclude_id:
            query = query.filter(Expert.id != exclude_id)
        existing = query.first()
        if existing:
            warnings.append({
                'field': 'linkedin_url',
                'message': f'LinkedIn URL already exists for {existing.expert_id}',
                'existing_id': existing.id,
            })

    return warnings


# ── LIST experts with pagination, search, filters ──────────────────────

@experts_bp.route('', methods=['GET'])
def list_experts():
    """
    GET /api/v1/experts?page=1&limit=20&search=...&region=...&primary_sector=...
    """
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    limit = min(limit, 100)  # cap at 100
    search = request.args.get('search', '', type=str).strip()
    sort_by = request.args.get('sort_by', 'updated_at', type=str)
    sort_order = request.args.get('sort_order', 'desc', type=str)

    # Filters (comma-separated)
    # Filters (comma-separated) - these are now passed to _apply_experts_filters
    # region = request.args.get('region', '', type=str).strip()
    # primary_sector = request.args.get('primary_sector', '', type=str).strip()
    # expert_status = request.args.get('expert_status', '', type=str).strip()
    # employment = request.args.get('current_employment_status', '', type=str).strip()

    query = Expert.query
    query = _apply_experts_filters(query, request.args)

    # ── Sorting ──
    sort_column = getattr(Expert, sort_by, Expert.updated_at)
    if sort_order.lower() == 'asc':
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # ── Pagination ──
    total_records = query.count()
    total_pages = max(1, -(-total_records // limit))  # ceiling division
    page = min(page, total_pages)

    experts = query.offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'data': [e.to_dict() for e in experts],
        'meta': {
            'total_records': total_records,
            'current_page': page,
            'total_pages': total_pages,
            'limit': limit,
            'has_next': page < total_pages,
            'has_prev': page > 1,
        },
    })


# ── GET single expert ──────────────────────────────────────────────────

@experts_bp.route('/<string:expert_uuid>', methods=['GET'])
def get_expert(expert_uuid):
    """GET /api/v1/experts/:id"""
    expert = Expert.query.get(expert_uuid)
    if not expert:
        return jsonify({'error': 'Expert not found'}), 404
    return jsonify({'data': expert.to_dict()})


# ── CREATE expert ──────────────────────────────────────────────────────

@experts_bp.route('', methods=['POST'])
def create_expert():
    """
    POST /api/v1/experts
    Body: JSON with expert fields
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    # Validate required fields
    errors = _validate_required_fields(data)
    if errors:
        return jsonify({'error': 'Validation failed', 'details': errors}), 400

    # Check duplicates
    duplicates = _check_duplicates(data)
    if duplicates:
        return jsonify({
            'error': 'Duplicate found',
            'duplicate': True,
            'details': duplicates,
        }), 409

    try:
        expert = Expert(
            expert_id=data.get('expert_id', '').strip(),
            salutation=data.get('salutation', '').strip() or None,
            first_name=data['first_name'].strip(),
            last_name=data['last_name'].strip(),
            primary_email=data.get('primary_email', '').strip() or None,
            secondary_email=data.get('secondary_email', '').strip() or None,
            primary_phone=data.get('primary_phone', '').strip() or None,
            secondary_phone=data.get('secondary_phone', '').strip() or None,
            linkedin_url=data.get('linkedin_url', '').strip() or None,
            location=data.get('location', '').strip() or None,
            timezone=data.get('timezone', '').strip() or None,
            region=data.get('region', '').strip() or None,
            current_employment_status=data.get('current_employment_status', '').strip() or None,
            seniority=data.get('seniority', '').strip() or None,
            years_of_experience=data.get('years_of_experience') or None,
            title_headline=data.get('title_headline', '').strip() or None,
            bio=data.get('bio', '').strip() or None,
            employment_history=data.get('employment_history', '').strip() or None,
            primary_sector=data.get('primary_sector', '').strip() or None,
            company_role=data.get('company_role', '').strip() or None,
            expert_function=data.get('expert_function', '').strip() or None,
            strength_topics=data.get('strength_topics', '').strip() or None,
            currency=data.get('currency', '').strip() or None,
            hourly_rate=data.get('hourly_rate') or None,
            hcms_classification=data.get('hcms_classification', '').strip() or None,
            expert_status=data.get('expert_status', '').strip() or None,
            notes=data.get('notes', '').strip() or None,
            payment_details=data.get('payment_details', '').strip() or None,
            events_invited_to=data.get('events_invited_to', '').strip() or None,
            profile_pdf_url=data.get('profile_pdf_url', '').strip() or None,
            total_calls_completed=data.get('total_calls_completed', 0) or 0,
            project_id_added_to=data.get('project_id_added_to', '').strip() or None,
        )

        db.session.add(expert)
        db.session.commit()

        return jsonify({
            'message': 'Expert created successfully',
            'data': expert.to_dict(),
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create expert: {str(e)}'}), 500


# ── UPDATE expert ──────────────────────────────────────────────────────

@experts_bp.route('/<string:expert_uuid>', methods=['PUT'])
def update_expert(expert_uuid):
    """PUT /api/v1/experts/:id"""
    expert = Expert.query.get(expert_uuid)
    if not expert:
        return jsonify({'error': 'Expert not found'}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    # Check duplicates (excluding current record)
    duplicates = _check_duplicates(data, exclude_id=expert_uuid)
    if duplicates:
        return jsonify({
            'error': 'Duplicate found',
            'duplicate': True,
            'details': duplicates,
        }), 409

    # Update fields
    updatable_fields = [
        'salutation', 'first_name', 'last_name', 'primary_email',
        'secondary_email', 'primary_phone', 'secondary_phone',
        'linkedin_url', 'location', 'timezone', 'region',
        'current_employment_status', 'seniority', 'years_of_experience',
        'title_headline', 'bio', 'employment_history', 'primary_sector',
        'company_role', 'expert_function', 'strength_topics', 'currency',
        'hourly_rate', 'hcms_classification', 'expert_status', 'notes', 'payment_details', 'events_invited_to',
        'profile_pdf_url', 'total_calls_completed', 'project_id_added_to',
    ]

    try:
        for field in updatable_fields:
            if field in data:
                value = data[field]
                if isinstance(value, str):
                    value = value.strip() or None
                setattr(expert, field, value)

        db.session.commit()
        return jsonify({
            'message': 'Expert updated successfully',
            'data': expert.to_dict(),
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update expert: {str(e)}'}), 500


# ── DELETE expert ──────────────────────────────────────────────────────

@experts_bp.route('/<string:expert_uuid>', methods=['DELETE'])
def delete_expert(expert_uuid):
    """DELETE /api/v1/experts/:id"""
    expert = Expert.query.get(expert_uuid)
    if not expert:
        return jsonify({'error': 'Expert not found'}), 404

    try:
        db.session.delete(expert)
        db.session.commit()
        return jsonify({'message': 'Expert deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete expert: {str(e)}'}), 500


@experts_bp.route('/bulk-delete', methods=['POST'])
def bulk_delete():
    """POST /api/v1/experts/bulk-delete"""
    data = request.get_json(silent=True)
    if not data or 'ids' not in data:
        return jsonify({'error': 'IDs are required'}), 400

    ids = data['ids']
    if not ids:
        return jsonify({'message': 'No experts selected for deletion'}), 200

    try:
        experts = Expert.query.filter(Expert.id.in_(ids)).all()
        for expert in experts:
            db.session.delete(expert)
        db.session.commit()
        return jsonify({'message': f'{len(experts)} experts deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete experts: {str(e)}'}), 500


@experts_bp.route('/export', methods=['GET'])
def export_experts():
    """
    GET /api/v1/experts/export?search=...&region=...
    Exports filtered experts to Excel.
    """
    query = Expert.query
    query = _apply_experts_filters(query, request.args)
    
    # Sorting
    sort_by = request.args.get('sort_by', 'updated_at', type=str)
    sort_order = request.args.get('sort_order', 'desc', type=str)
    sort_column = getattr(Expert, sort_by, Expert.updated_at)
    if sort_order.lower() == 'asc':
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
    
    experts = query.all()
    
    # Columns matching import template exactly
    excel_columns = [
        'S.No', 'Salutation', 'Expert ID', 'First Name', 'Last Name', 'Primary Email 1', 
        'Secondary Email ', 'Primary Phone 1', 'Secondary Phone 1', 'LinkedIn URL', 
        'Location', 'Timezone', 'Region', 'Current Employment Status', 'Seniority', 
        'Years of Experience', 'Title / Headline', 'BIO', 'Employment History', 
        'Primary Sector', 'Company Role', 'Expert Function', 'Strength Topics', 
        'Currency', 'Hourly Rate', 'HCMS Classification', 'Expert Status', 
        'Last Modified', 'Project ID Added To', 'Total Calls Completed', 
        'Payment Details', 'Link to Profile PDF', 'Events Invited To', 'Notes'
    ]

    # Mapping from models to Excel columns for data population
    # Map model attributes -> Excel headers
    attr_to_col = {
        'salutation': 'Salutation',
        'expert_id': 'Expert ID',
        'first_name': 'First Name',
        'last_name': 'Last Name',
        'primary_email': 'Primary Email 1',
        'secondary_email': 'Secondary Email ',
        'primary_phone': 'Primary Phone 1',
        'secondary_phone': 'Secondary Phone 1',
        'linkedin_url': 'LinkedIn URL',
        'location': 'Location',
        'timezone': 'Timezone',
        'region': 'Region',
        'current_employment_status': 'Current Employment Status',
        'seniority': 'Seniority',
        'years_of_experience': 'Years of Experience',
        'title_headline': 'Title / Headline',
        'bio': 'BIO',
        'employment_history': 'Employment History',
        'primary_sector': 'Primary Sector',
        'company_role': 'Company Role',
        'expert_function': 'Expert Function',
        'strength_topics': 'Strength Topics',
        'currency': 'Currency',
        'hourly_rate': 'Hourly Rate',
        'hcms_classification': 'HCMS Classification',
        'expert_status': 'Expert Status',
        'updated_at': 'Last Modified',
        'project_id_added_to': 'Project ID Added To',
        'total_calls_completed': 'Total Calls Completed',
        'profile_pdf_url': 'Link to Profile PDF',
        'payment_details': 'Payment Details',
        'events_invited_to': 'Events Invited To',
        'notes': 'Notes',
    }

    data = []
    for i, e in enumerate(experts, 1):
        row = {col: '' for col in excel_columns}
        row['S.No'] = i
        
        for attr, col in attr_to_col.items():
            val = getattr(e, attr)
            if isinstance(val, datetime):
                val = val.strftime('%Y-%m-%d')
            elif val is None:
                val = ''
            row[col] = val
            
        data.append(row)

    df = pd.DataFrame(data, columns=excel_columns)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Experts')
    
    output.seek(0)
    
    filename = f"experts_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )


@experts_bp.route('/email-export', methods=['POST'])
def email_export():
    """
    POST /api/v1/experts/email-export
    Body: { "expert_ids": ["uuid1", "uuid2"] }
    Returns key contact info for selected experts.
    """
    data = request.get_json(silent=True)
    if not data or 'expert_ids' not in data:
        return jsonify({'error': 'Expert IDs are required'}), 400

    ids = data['expert_ids']
    if not ids:
        return jsonify({'data': []})

    experts = Expert.query.filter(Expert.id.in_(ids)).all()
    
    # Sort alphabetically by name
    experts.sort(key=lambda x: (x.first_name or '', x.last_name or ''))

    return jsonify({
        'data': [{
            'id': e.id,
            'name': f"{e.first_name or ''} {e.last_name or ''}".strip() or "Unnamed Expert",
            'email': e.primary_email or "No Email Provided",
            'title': e.title_headline or "No Title",
            'company': e.company_role or "No Company"
        } for e in experts]
    })


@experts_bp.route('/upload-pdf', methods=['POST'])
def upload_pdf():
    """
    POST /api/v1/experts/upload-pdf
    Multipart form data: file
    Returns the URL where the file is stored.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    # Check extension (pdf, doc, docx)
    allowed_extensions = {'pdf', 'doc', 'docx'}
    ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    
    if ext not in allowed_extensions:
        return jsonify({'error': 'File type not allowed (PDF or Word only)'}), 400
    
    import os
    import uuid
    from werkzeug.utils import secure_filename
    
    # Create unique filename
    unique_name = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
    
    # Define save path (expert_pdf is in backend relative to app.py)
    # Using relative path from current routes file
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_folder = os.path.join(base_dir, 'expert_pdf')
    
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    
    file_path = os.path.join(upload_folder, unique_name)
    file.save(file_path)
    
    # Return the full URL for cross-origin frontend access
    from flask import request as flask_request
    full_url = f"{flask_request.host_url.rstrip('/')}/expert_pdf/{unique_name}"
    
    return jsonify({
        'url': full_url,
        'filename': file.filename
    })
