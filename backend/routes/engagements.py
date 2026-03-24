"""
Engagements API Blueprint — /api/v1/engagements
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, date
from sqlalchemy.orm import joinedload
from extensions import db
from models import Engagement, Project, Expert, Client, User, HasamexUser, LkEngagementMethod, LkCurrency, LkPostCallStatus, LkPaymentStatus

engagements_bp = Blueprint('engagements', __name__, url_prefix='/api/v1/engagements')

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
    db.session.commit()
    return jsonify(new_engagement.to_dict()), 201

@engagements_bp.route('/<engagement_id>', methods=['PUT'])
def update_engagement(engagement_id):
    engagement = Engagement.query.get_or_404(engagement_id)
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

@engagements_bp.route('/<engagement_id>', methods=['DELETE'])
def delete_engagement(engagement_id):
    engagement = Engagement.query.get_or_404(engagement_id)
    db.session.delete(engagement)
    db.session.commit()
    return '', 204
