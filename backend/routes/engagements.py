"""
Engagements API Blueprint — /api/v1/engagements
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, date
from sqlalchemy.orm import joinedload
from sqlalchemy import text
from extensions import db
from models import Engagement, Project, Expert, Client, User, HasamexUser, LkEngagementMethod, LkCurrency, LkPostCallStatus, LkPaymentStatus
from services.zoom_service import zoom_service
from services.zoho_service import zoho_calendar_service

engagements_bp = Blueprint('engagements', __name__, url_prefix='/api/v1/engagements')

@engagements_bp.route('/filter-options', methods=['GET'])
def get_filter_options():
    """
    GET /api/v1/engagements/filter-options
    Returns only the specific enumerations required by EngagementFilters.jsx
    """
    return jsonify({
        'payment_status': [{'id': item.id, 'name': item.name} for item in LkPaymentStatus.query.order_by(LkPaymentStatus.id).all()]
    })


@engagements_bp.route('/form-lookups', methods=['GET'])
def get_form_lookups():
    """
    GET /api/v1/engagements/form-lookups
    Returns lookups for EngagementEditPage, entirely excluding the massive Experts recursive lists.
    """
    return jsonify({
        'projects': [{'id': item.project_id, 'name': item.title} for item in Project.query.order_by(Project.project_id).all()],
        'clients': [{'id': item.client_id, 'name': item.client_name} for item in Client.query.order_by(Client.client_name).all()],
        'users': [{'id': item.user_id, 'name': item.user_name} for item in User.query.order_by(User.user_name).all()],
        'hasamex_users': [{'id': item.id, 'name': (" ".join([p for p in [item.first_name, item.last_name] if p]).strip() or item.username)} for item in HasamexUser.query.filter_by(is_active=True).all()],
        'engagement_method': [{'id': item.id, 'name': item.name} for item in LkEngagementMethod.query.order_by(LkEngagementMethod.id).all()],
        'currencies': [{'id': item.id, 'name': item.name} for item in LkCurrency.query.order_by(LkCurrency.id).all()],
        'post_call_status': [{'id': item.id, 'name': item.name} for item in LkPostCallStatus.query.order_by(LkPostCallStatus.id).all()],
        'payment_status': [{'id': item.id, 'name': item.name} for item in LkPaymentStatus.query.order_by(LkPaymentStatus.id).all()]
    })


EXCHANGE_RATES_USD = {
    'USD': 1.0,
    'EUR': 1.09,
    'GBP': 1.27,
    'INR': 0.012,
    'SGD': 0.74,
    'AED': 0.27,
}

def _normalize_amount(amount: float, currency: str, base_currency: str = 'USD') -> float:
    if amount is None:
        return None
    cur = (currency or 'USD').upper()
    base = (base_currency or 'USD').upper()
    usd_per_cur = EXCHANGE_RATES_USD.get(cur, 1.0)
    usd_per_base = EXCHANGE_RATES_USD.get(base, 1.0)
    amount_usd = float(amount) * usd_per_cur
    # Convert USD to base currency
    return amount_usd / usd_per_base if usd_per_base else amount_usd

def compute_profit_and_margin(
    client_rate: float,
    client_currency: str,
    expert_rate: float,
    expert_currency: str,
    base_currency: str = 'USD',
    discount_percent: float | None = None,
    billable_override_in_base: float | None = None,
) -> dict:
    # apply discount to client_rate if present
    effective_client_rate = float(client_rate) if client_rate is not None else 0.0
    if discount_percent is not None:
        try:
            effective_client_rate = effective_client_rate * max(0.0, (100.0 - float(discount_percent))) / 100.0
        except Exception:
            pass
    normalized_client = _normalize_amount(effective_client_rate, client_currency, base_currency)
    normalized_expert = _normalize_amount(float(expert_rate or 0.0), expert_currency, base_currency)
    if billable_override_in_base is not None:
        try:
            normalized_client = float(billable_override_in_base)
        except Exception:
            pass
    gross_profit = None
    margin_pct = None
    try:
        gross_profit = round((normalized_client or 0.0) - (normalized_expert or 0.0), 2)
        if (normalized_client or 0.0) > 0:
            margin_pct = round((gross_profit / normalized_client) * 100.0, 2)
        else:
            margin_pct = 0.0
    except Exception:
        gross_profit = None
        margin_pct = None
    return {
        'base_currency': (base_currency or 'USD').upper(),
        'client_rate': client_rate,
        'client_currency': (client_currency or 'USD').upper(),
        'expert_rate': expert_rate,
        'expert_currency': (expert_currency or 'USD').upper(),
        'normalized_client_rate': round(normalized_client, 2) if normalized_client is not None else None,
        'normalized_expert_rate': round(normalized_expert, 2) if normalized_expert is not None else None,
        'gross_profit': gross_profit,
        'margin_percentage': margin_pct,
    }

def _none_if_empty(v):
    if v is None:
        return None
    if isinstance(v, str) and v.strip() == '':
        return None
    return v

def _to_int(v):
    v = _none_if_empty(v)
    if v is None:
        return None
    try:
        return int(v)
    except Exception:
        return None

def _to_float(v):
    v = _none_if_empty(v)
    if v is None:
        return None
    try:
        return float(v)
    except Exception:
        return None

def _to_date(v):
    v = _none_if_empty(v)
    if v is None:
        return None
    try:
        if isinstance(v, date) and not isinstance(v, datetime):
            return v
        if isinstance(v, datetime):
            return v.date()
        # Expect YYYY-MM-DD
        return date.fromisoformat(str(v)[:10])
    except Exception:
        return None

def _to_datetime(v):
    v = _none_if_empty(v)
    if v is None:
        return None
    try:
        if isinstance(v, datetime):
            return v
        # Accept 'YYYY-MM-DDTHH:MM' or ISO strings
        return datetime.fromisoformat(str(v))
    except Exception:
        return None

def normalize_engagement_payload(data: dict) -> dict:
    if not isinstance(data, dict):
        return {}
    return {
        # FKs and ids
        'project_id': _to_int(data.get('project_id')),
        'expert_id': _none_if_empty(data.get('expert_id')),
        'client_id': _to_int(data.get('client_id')),
        'poc_user_id': _to_int(data.get('poc_user_id')),
        'call_owner_id': _to_int(data.get('call_owner_id')),
        'engagement_method_id': _to_int(data.get('engagement_method_id')),
        'client_currency_id': _to_int(data.get('client_currency_id')),
        'expert_currency_id': _to_int(data.get('expert_currency_id')),
        'expert_post_call_status_id': _to_int(data.get('expert_post_call_status_id')),
        'expert_payment_status_id': _to_int(data.get('expert_payment_status_id')),
        # Dates
        'call_date': _to_datetime(data.get('call_date')),
        'expert_payment_due_date': _to_date(data.get('expert_payment_due_date')),
        'actual_expert_payment_date': _to_date(data.get('actual_expert_payment_date')),
        'client_invoice_date': _to_date(data.get('client_invoice_date')),
        'client_payment_received_date': _to_date(data.get('client_payment_received_date')),
        # Numerics
        'actual_call_duration_mins': _to_int(data.get('actual_call_duration_mins')),
        'client_rate': _to_float(data.get('client_rate')),
        'discount_offered_percent': _to_float(data.get('discount_offered_percent')),
        'billable_client_amount_usd': _to_float(data.get('billable_client_amount_usd')),
        'expert_rate': _to_float(data.get('expert_rate')),
        'prorated_expert_amount_base': _to_float(data.get('prorated_expert_amount_base')),
        'prorated_expert_amount_usd': _to_float(data.get('prorated_expert_amount_usd')),
        'gross_margin_percent': _to_float(data.get('gross_margin_percent')),
        'gross_profit_usd': _to_float(data.get('gross_profit_usd')),
        # Text
        'notes': _none_if_empty(data.get('notes')),
        'transcript_link_folder': _none_if_empty(data.get('transcript_link_folder')),
        'expert_paid_from': _none_if_empty(data.get('expert_paid_from')),
        'expert_payout_ref_id': _none_if_empty(data.get('expert_payout_ref_id')),
        'client_invoice_number': _none_if_empty(data.get('client_invoice_number')),
        'client_payment_received_account': _none_if_empty(data.get('client_payment_received_account')),
        'expert_timezone': _none_if_empty(data.get('expert_timezone')),
        'client_timezone': _none_if_empty(data.get('client_timezone')),
    }

@engagements_bp.route('', methods=['GET'])
def get_engagements():
    """
    GET /api/v1/engagements
    """
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    sort_by = request.args.get('sort_by', 'call_date', type=str)
    order = request.args.get('order', 'desc', type=str)

    query = Engagement.query.options(
        joinedload(Engagement.project),
        joinedload(Engagement.expert),
        joinedload(Engagement.client),
        joinedload(Engagement.poc_user),
        joinedload(Engagement.call_owner),
        joinedload(Engagement.engagement_method),
        joinedload(Engagement.client_currency),
        joinedload(Engagement.expert_currency),
        joinedload(Engagement.expert_post_call_status),
        joinedload(Engagement.expert_payment_status)
    )

    # Filtering logic
    from sqlalchemy import or_, extract
    
    search = request.args.get('search', '').strip()
    status = request.args.get('status', '').strip()
    month = request.args.get('month', '').strip() # Expected format: YYYY-MM
    filter_client_id = request.args.get('client_id', type=int)
    filter_project_id = request.args.get('project_id', type=int)
    filter_poc_user_id = request.args.get('poc_user_id', type=int)

    if search:
        search_pattern = f"%{search}%"
        query = query.join(Engagement.project).join(Engagement.expert).filter(
            or_(
                Project.title.ilike(search_pattern),
                Expert.first_name.ilike(search_pattern),
                Expert.last_name.ilike(search_pattern),
                Engagement.notes.ilike(search_pattern),
                Engagement.client_invoice_number.ilike(search_pattern)
            )
        )
    if filter_client_id:
        query = query.filter(Engagement.client_id == filter_client_id)
    if filter_project_id:
        query = query.filter(Engagement.project_id == filter_project_id)
    if filter_poc_user_id:
        query = query.filter(Engagement.poc_user_id == filter_poc_user_id)

    if status:
        query = query.join(Engagement.expert_payment_status).filter(LkPaymentStatus.name == status)

    if month:
        try:
            year_val, month_val = map(int, month.split('-'))
            query = query.filter(
                extract('year', Engagement.call_date) == year_val,
                extract('month', Engagement.call_date) == month_val
            )
        except ValueError:
            pass # Ignore invalid month format

    sort_attr = Engagement.engagement_code if sort_by == 'engagement_id' else getattr(Engagement, sort_by, Engagement.call_date)
    if order == 'desc':
        query = query.order_by(sort_attr.desc())
    else:
        query = query.order_by(sort_attr.asc())

    total_records = query.count()
    total_pages = max(1, -(-total_records // limit))
    page = min(page, total_pages)

    engagements = query.offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        'data': [e.to_dict() for e in engagements],
        'meta': {
            'total_records': total_records,
            'current_page': page,
            'total_pages': total_pages,
            'limit': limit,
        }
    })

@engagements_bp.route('/<engagement_id>', methods=['GET'])
def get_engagement(engagement_id):
    engagement = Engagement.query.options(
        joinedload(Engagement.project),
        joinedload(Engagement.expert),
        joinedload(Engagement.client),
        joinedload(Engagement.poc_user),
        joinedload(Engagement.call_owner),
        joinedload(Engagement.engagement_method),
        joinedload(Engagement.client_currency),
        joinedload(Engagement.expert_currency),
        joinedload(Engagement.expert_post_call_status),
        joinedload(Engagement.expert_payment_status)
    ).get_or_404(engagement_id)
    return jsonify({'data': engagement.to_dict()})

@engagements_bp.route('', methods=['POST'])
def create_engagement():
    data = request.get_json() or {}
    payload = normalize_engagement_payload(data)
    required = ['project_id', 'expert_id', 'client_id', 'call_date']
    for r in required:
        if payload.get(r) in (None, ''):
            return jsonify({'error': f'Missing required field: {r}'}), 400
    new_engagement = Engagement(**payload)
    # compute and store gross profit + margin (base USD)
    try:
        # Resolve currency codes
        client_currency = None
        expert_currency = None
        if payload.get('client_currency_id'):
            row = LkCurrency.query.get(payload['client_currency_id'])
            client_currency = row.name if row else None
        if payload.get('expert_currency_id'):
            row = LkCurrency.query.get(payload['expert_currency_id'])
            expert_currency = row.name if row else None
        result = compute_profit_and_margin(
            client_rate=payload.get('client_rate'),
            client_currency=client_currency or 'USD',
            expert_rate=payload.get('expert_rate'),
            expert_currency=expert_currency or 'USD',
            base_currency='USD',
            discount_percent=payload.get('discount_offered_percent'),
            billable_override_in_base=payload.get('billable_client_amount_usd'),
        )
        new_engagement.gross_profit_usd = result['gross_profit']
        new_engagement.gross_margin_percent = result['margin_percentage']
    except Exception:
        pass
    db.session.add(new_engagement)
    db.session.flush()
    if not new_engagement.engagement_code:
        try:
            next_val = db.session.execute(text("SELECT nextval('engagement_code_seq')")).scalar()
            if next_val is not None:
                code = f"EC-{str(int(next_val)).zfill(4)}"
                new_engagement.engagement_code = code
        except Exception:
            pass
    try:
        proj = Project.query.get(new_engagement.project_id)
        if proj is not None:
            arr = list(proj.engagement_ids or [])
            if new_engagement.id not in arr:
                arr.append(new_engagement.id)
                proj.engagement_ids = arr
    except Exception:
        pass
    db.session.commit()
    return jsonify(new_engagement.to_dict()), 201

@engagements_bp.route('/<engagement_id>', methods=['PUT'])
def update_engagement(engagement_id):
    engagement = Engagement.query.get_or_404(engagement_id)
    old_project_id = engagement.project_id
    data = request.get_json() or {}
    payload = normalize_engagement_payload(data)
    for key, value in payload.items():
        if hasattr(engagement, key):
            setattr(engagement, key, value)
    # recompute after updates
    try:
        client_currency = None
        expert_currency = None
        if engagement.client_currency_id:
            row = LkCurrency.query.get(engagement.client_currency_id)
            client_currency = row.name if row else None
        if engagement.expert_currency_id:
            row = LkCurrency.query.get(engagement.expert_currency_id)
            expert_currency = row.name if row else None
        result = compute_profit_and_margin(
            client_rate=engagement.client_rate,
            client_currency=client_currency or 'USD',
            expert_rate=engagement.expert_rate,
            expert_currency=expert_currency or 'USD',
            base_currency='USD',
            discount_percent=engagement.discount_offered_percent,
            billable_override_in_base=engagement.billable_client_amount_usd,
        )
        engagement.gross_profit_usd = result['gross_profit']
        engagement.gross_margin_percent = result['margin_percentage']
    except Exception:
        pass
    try:
        if old_project_id != engagement.project_id:
            if old_project_id:
                old_proj = Project.query.get(old_project_id)
                if old_proj is not None:
                    old_arr = list(old_proj.engagement_ids or [])
                    if engagement.id in old_arr:
                        old_arr = [x for x in old_arr if x != engagement.id]
                        old_proj.engagement_ids = old_arr
            if engagement.project_id:
                new_proj = Project.query.get(engagement.project_id)
                if new_proj is not None:
                    new_arr = list(new_proj.engagement_ids or [])
                    if engagement.id not in new_arr:
                        new_arr.append(engagement.id)
                        new_proj.engagement_ids = new_arr
    except Exception:
        pass
    db.session.commit()
    return jsonify(engagement.to_dict())

@engagements_bp.route('/compute-profit', methods=['POST'])
def compute_profit_api():
    data = request.get_json() or {}
    required = ['client_rate', 'client_currency', 'expert_rate', 'expert_currency']
    for r in required:
        if data.get(r) in (None, ''):
            return jsonify({'error': f'Missing required field: {r}'}), 400
    base_currency = data.get('base_currency') or 'USD'
    try:
        result = compute_profit_and_margin(
            client_rate=float(data.get('client_rate')),
            client_currency=str(data.get('client_currency')),
            expert_rate=float(data.get('expert_rate')),
            expert_currency=str(data.get('expert_currency')),
            base_currency=str(base_currency),
        )
        return jsonify({'data': result})
    except Exception as e:
        return jsonify({'error': 'Could not compute gross profit', 'details': str(e)}), 400

@engagements_bp.route('/<id>/schedule', methods=['POST'])
def schedule_meeting(id):
    """
    POST /api/v1/engagements/<id>/schedule
    Generates a Zoom meeting and sends Zoho Calendar invites (separate for expert and client).
    """
    engagement = Engagement.query.get_or_404(id)
    
    # 1. Gather Details
    topic = f"{engagement.project.title} | Expert Call | Hasamex"
    start_time = engagement.call_date
    duration = engagement.actual_call_duration_mins or 60
    
    expert_email = engagement.expert.primary_email if engagement.expert else None
    
    # Client email comes from User model (poc_user_id relationship)
    client_email = engagement.poc_user.email if engagement.poc_user else None

    print(f"DEBUG: Scheduling call for Engagement {id}")
    print(f"DEBUG: Expert Email found: {expert_email}")
    print(f"DEBUG: Client Email found: {client_email}")

    # 2. Create Zoom Meeting
    zoom_data = zoom_service.create_meeting(topic, start_time, duration)
    if not zoom_data:
        return jsonify({'error': 'Failed to create Zoom meeting'}), 500
    
    # Update engagement with Zoom details
    engagement.zoom_meeting_id = zoom_data['meeting_id']
    engagement.zoom_join_url = zoom_data['join_url']
    engagement.zoom_start_url = zoom_data['start_url']
    engagement.zoom_password = zoom_data['password']
    
    # Also update transcript_link_folder as it's used in the dashboard cards for the meeting link
    engagement.transcript_link_folder = zoom_data['join_url']
    
    db.session.commit()

    # 3. Create Zoho Calendar Invites
    description_template = f"""This Hasamex expert call is confirmed as per the details below:

Topic: {engagement.project.title}
Link: {zoom_data['join_url']}
Meeting ID: {zoom_data['meeting_id']}
Passcode: {zoom_data['password']}

_______________________________________________

Please ensure that the discussion remains aligned with Hasamex’s compliance standards.

As a reminder:
* Please do not request or discuss any confidential, proprietary, or non-public information, including internal financials or employer-specific data.
* Please do not request or share personal contact information (email, phone number, etc.) during the call.
* Any follow-up work or additional discussions should be routed only through Hasamex.
* This call will be recorded and transcribed.

For any compliance-related questions, please feel free to reach out to us on compliance@hasamex.com

- Hasamex Team
www.hasamex.com
"""

    zoho_errors = []
    
    # Invitation Title
    summary = f"Invitation: {topic} @ {start_time.strftime('%a %b %d, %Y %I:%M %p')} ({engagement.expert_timezone or 'Asia/Kolkata'})"

    # Expert Invitation
    if expert_email:
        expert_event_id = zoho_calendar_service.create_event(
            summary=summary,
            description=description_template,
            start_time=start_time,
            duration_mins=duration,
            attendee_email=expert_email,
            timezone=engagement.expert_timezone or "Asia/Kolkata"
        )
        if expert_event_id:
            engagement.zoho_event_id_expert = expert_event_id
        else:
            zoho_errors.append(f"Failed to send invite to expert ({expert_email})")
    else:
        zoho_errors.append("Expert email missing")

    # Client Invitation
    if client_email:
        client_event_id = zoho_calendar_service.create_event(
            summary=summary,
            description=description_template,
            start_time=start_time,
            duration_mins=duration,
            attendee_email=client_email,
            timezone=engagement.client_timezone or "Asia/Kolkata"
        )
        if client_event_id:
             engagement.zoho_event_id_client = client_event_id
        else:
            zoho_errors.append(f"Failed to send invite to client ({client_email})")
    else:
        zoho_errors.append("Client email missing")

    db.session.commit()

    return jsonify({
        'message': 'Meeting scheduled and invites sent (if emails were found)',
        'zoom': zoom_data,
        'zoho_errors': zoho_errors,
        'engagement': engagement.to_dict()
    }), 200

@engagements_bp.route('/<engagement_id>', methods=['DELETE'])
def delete_engagement(engagement_id):
    engagement = Engagement.query.get_or_404(engagement_id)
    try:
        proj = Project.query.get(engagement.project_id)
        if proj is not None:
            arr = list(proj.engagement_ids or [])
            if engagement.id in arr:
                proj.engagement_ids = [x for x in arr if x != engagement.id]
    except Exception:
        pass
    db.session.delete(engagement)
    db.session.commit()
    return '', 204
