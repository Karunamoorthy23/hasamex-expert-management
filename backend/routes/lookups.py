"""
Lookups API Blueprint — /api/v1/lookups
Provides dropdown values for the frontend.
"""

from flask import Blueprint, jsonify
from extensions import db
from models import (
    LkRegion, LkPrimarySector, LkExpertStatus, LkEmploymentStatus,
    LkSeniority, LkCurrency, LkCompanyRole, LkExpertFunction,
    LkSalutation, LkHcmsClassification
)

lookups_bp = Blueprint('lookups', __name__, url_prefix='/api/v1/lookups')

@lookups_bp.route('', methods=['GET'])
def get_all_lookups():
    """
    GET /api/v1/lookups
    Returns all lookup values mapped to categories so the frontend doesn't break.
    """
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
        'hcms_classification': [item.name for item in LkHcmsClassification.query.order_by(LkHcmsClassification.id).all()]
    }

    return jsonify({'data': grouped})
