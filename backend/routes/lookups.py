"""
Lookups API Blueprint — /api/v1/lookups
Provides dropdown values for the frontend.
"""

from flask import Blueprint, jsonify, request
from extensions import db
from models import LookupTable

lookups_bp = Blueprint('lookups', __name__, url_prefix='/api/v1/lookups')


@lookups_bp.route('', methods=['GET'])
def get_all_lookups():
    """
    GET /api/v1/lookups
    Returns all lookup values grouped by category.
    """
    lookups = LookupTable.query.order_by(
        LookupTable.category, LookupTable.display_order
    ).all()

    grouped = {}
    for item in lookups:
        if item.category not in grouped:
            grouped[item.category] = []
        grouped[item.category].append(item.value)

    return jsonify({'data': grouped})


@lookups_bp.route('/<string:category>', methods=['GET'])
def get_lookups_by_category(category):
    """
    GET /api/v1/lookups/:category
    Returns lookup values for a specific category.
    """
    lookups = (
        LookupTable.query
        .filter(LookupTable.category == category)
        .order_by(LookupTable.display_order)
        .all()
    )

    if not lookups:
        return jsonify({'error': f'Category "{category}" not found'}), 404

    return jsonify({
        'data': [item.value for item in lookups],
    })
