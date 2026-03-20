"""
Lookups API Blueprint — /api/v1/lookups
Provides dropdown values for the frontend.
"""

from flask import Blueprint, jsonify
from extensions import db
from models import (
    LkRegion, LkPrimarySector, LkExpertStatus, LkEmploymentStatus,
    LkSeniority, LkCurrency, LkCompanyRole, LkExpertFunction,
    LkSalutation, LkHcmsClassification,
    LkProjectType, LkProjectTargetGeography,
    LkEngagementMethod, LkPostCallStatus, LkPaymentStatus,
    Project, Expert, Client, User, HasamexUser
)

lookups_bp = Blueprint('lookups', __name__, url_prefix='/api/v1/lookups')

@lookups_bp.route('', methods=['GET'])
def get_all_lookups():
    """
    GET /api/v1/lookups
    Returns all lookup values mapped to categories so the frontend doesn't break.
    """
    # Build expert lists with id/code/owner for client forms
    expert_rows = Expert.query.order_by(Expert.first_name).all()
    experts_basic = [{'id': item.id, 'name': f"{item.first_name} {item.last_name}"} for item in expert_rows]
    experts_codes = [{'id': item.id, 'code': item.expert_id, 'name': f"{item.first_name} {item.last_name}"} for item in expert_rows]
    experts_owner_map = [{
        'id': item.id,
        'code': item.expert_id,
        'owner_id': item.client_solution_owner_id,
        'owner_name': item.rel_client_solution_owner.username if item.rel_client_solution_owner else None
    } for item in expert_rows]

    grouped = {
        'region': [item.name for item in LkRegion.query.order_by(LkRegion.id).all()],
        'primary_sector': [item.name for item in LkPrimarySector.query.order_by(LkPrimarySector.id).all()],
        'expert_status': [item.name for item in LkExpertStatus.query.order_by(LkExpertStatus.id).all()],
        'current_employment_status': [item.name for item in LkEmploymentStatus.query.order_by(LkEmploymentStatus.id).all()],
        'seniority': [item.name for item in LkSeniority.query.order_by(LkSeniority.id).all()],
        'currency': [item.name for item in LkCurrency.query.order_by(LkCurrency.id).all()],
        'company_role': [item.name for item in LkCompanyRole.query.order_by(LkCompanyRole.id).all()],
        'expert_function': [item.name for item in LkExpertFunction.query.order_by(LkExpertFunction.id).all()],
        'salutation': [item.name for item in LkSalutation.query.order_by(LkSalutation.id).all()],
        'hcms_classification': [item.name for item in LkHcmsClassification.query.order_by(LkHcmsClassification.id).all()],

        # Project module
        'project_type': [item.name for item in LkProjectType.query.order_by(LkProjectType.id).all()],
        'project_target_geographies': [item.name for item in LkProjectTargetGeography.query.order_by(LkProjectTargetGeography.name).all()],

        # Engagement module
        'engagement_method': [{'id': item.id, 'name': item.name} for item in LkEngagementMethod.query.order_by(LkEngagementMethod.id).all()],
        'post_call_status': [{'id': item.id, 'name': item.name} for item in LkPostCallStatus.query.order_by(LkPostCallStatus.id).all()],
        'payment_status': [{'id': item.id, 'name': item.name} for item in LkPaymentStatus.query.order_by(LkPaymentStatus.id).all()],
        
        # Core entities for dropdowns
        'projects': [{'id': item.project_id, 'name': item.title} for item in Project.query.order_by(Project.project_id).all()],
        'experts': experts_basic,
        'experts_codes': experts_codes,
        'experts_owner_map': experts_owner_map,
        'clients': [{'id': item.client_id, 'name': item.client_name} for item in Client.query.order_by(Client.client_name).all()],
        'users': [{'id': item.user_id, 'name': item.user_name} for item in User.query.order_by(User.user_name).all()],
        'hasamex_users': [{'id': item.id, 'name': item.username} for item in HasamexUser.query.filter_by(is_active=True).all()],
        'currencies': [{'id': item.id, 'name': item.name} for item in LkCurrency.query.order_by(LkCurrency.id).all()],
    }

    return jsonify({'data': grouped})
