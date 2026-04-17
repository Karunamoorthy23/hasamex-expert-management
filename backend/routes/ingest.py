from flask import Blueprint, request, jsonify
from extensions import db
from models import Expert, ExpertExperience, ExpertStrength
import os
import hashlib
import requests

ingest_bp = Blueprint('ingest', __name__, url_prefix='/api/v1/ingest')

@ingest_bp.route('/expert', methods=['POST'])
def ingest_expert():
    data = request.get_json() or {}
    source = (data.get('source') or '').strip().lower()
    if source != 'linkedin':
        return jsonify({'error': 'Unsupported source'}), 400
    input_data = data.get('input') or {}
    linkedin_url = (input_data.get('linkedin_url') or '').strip()
    if not linkedin_url or 'linkedin.com' not in linkedin_url.lower():
        return jsonify({'error': 'Invalid LinkedIn URL'}), 400
    key = os.getenv('PROXYCURL_API_KEY') or ''
    if not key:
        return jsonify({'error': 'Missing Proxycurl API key'}), 500
    headers = {'Authorization': f'Bearer {key}'}
    try:
        resp = requests.get('https://api.proxycurl.com/v2/linkedin', params={'url': linkedin_url}, headers=headers, timeout=15)
    except Exception:
        return jsonify({'error': 'Upstream error'}), 502
    if not resp.ok:
        return jsonify({'error': 'Upstream error', 'status': resp.status_code}), resp.status_code
    try:
        payload = resp.json() or {}
    except Exception:
        payload = {}
    first_name = (payload.get('first_name') or '').strip()
    last_name = (payload.get('last_name') or '').strip()
    expert = Expert.query.filter_by(linkedin_url=linkedin_url).first()
    if not expert:
        code = 'EX-' + hashlib.md5(linkedin_url.encode()).hexdigest()[:8].upper()
        expert = Expert(expert_id=code, first_name=first_name or None, last_name=last_name or None, linkedin_url=linkedin_url)
        db.session.add(expert)
        db.session.flush()
    else:
        if first_name:
            expert.first_name = first_name
        if last_name:
            expert.last_name = last_name
    experiences = payload.get('experiences') or []
    for exp in experiences:
        company = (exp.get('company') or exp.get('company_name') or '').strip() or 'Unknown Company'
        role = (exp.get('title') or exp.get('role_title') or '').strip()
        start = exp.get('start_year')
        end = exp.get('end_year')
        exists = ExpertExperience.query.filter_by(expert_id=expert.id, company_name=company, role_title=role, start_year=start, end_year=end).first()
        if not exists:
            db.session.add(ExpertExperience(expert_id=expert.id, company_name=company, role_title=role, start_year=start, end_year=end))
    strengths = payload.get('skills') or payload.get('strengths') or []
    for s in strengths:
        txt = (s or '').strip()
        if not txt:
            continue
        exists = ExpertStrength.query.filter_by(expert_id=expert.id, topic_name=txt).first()
        if not exists:
            db.session.add(ExpertStrength(expert_id=expert.id, topic_name=txt))
    db.session.commit()
    return jsonify({'data': {'expert_id': expert.expert_id, 'linkedin_url': expert.linkedin_url}})
