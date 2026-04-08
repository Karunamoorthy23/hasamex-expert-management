"""
n8n Integration Routes
======================
- GET  /api/v1/n8n/status          → Check if n8n is configured
- POST /api/v1/n8n/search-experts  → Called by n8n to search LinkedIn via Proxycurl
                                     and store found experts in the database
"""
import os
import hashlib
import threading
import requests as http_requests
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Expert, ExpertExperience, ExpertStrength, Project
from routes.projects import _bg_send_project_invites

n8n_bp = Blueprint('n8n', __name__, url_prefix='/api/v1/n8n')


# ── Health-check ──────────────────────────────────────────────

@n8n_bp.route('/status', methods=['GET'])
def n8n_status():
    """Health-check for n8n integration."""
    webhook_url = os.getenv('N8N_WEBHOOK_URL')
    apify_token = os.getenv('APIFY_API_TOKEN')
    return jsonify({
        'n8n_configured': bool(webhook_url),
        'webhook_url': webhook_url,
        'apify_configured': bool(apify_token),
    })


# ── Search Experts via Proxycurl ──────────────────────────────

@n8n_bp.route('/search-experts', methods=['POST'])
def search_experts():
    # Ensure database session is clean of any previous failed transactions
    db.session.rollback()

    # Manual Authorization Check (N8N Service Token)
    # Support both Header (standard) and Query Param (robust fallback for Docker/Proxies)
    auth_header = request.headers.get('Authorization') or ''
    query_token = request.args.get('token')
    expected_token = os.getenv('N8N_SERVICE_TOKEN')
    
    received_token = ""
    if auth_header.startswith('Bearer '):
        received_token = auth_header.split(' ', 1)[1].strip()
    elif query_token:
        received_token = query_token.strip()
    
    print(f"[AUTH DEBUG] Expected: '{expected_token}'")
    print(f"[AUTH DEBUG] Received: '{received_token}'")

    if not received_token or (expected_token and received_token != expected_token):
        print(f"[AUTH ERROR] Invalid or missing N8N_SERVICE_TOKEN.")
        return jsonify({'error': 'Unauthorized: Invalid N8N_SERVICE_TOKEN'}), 401
    
    try:
        data = request.get_json(silent=True)
        if not data:
            # Fallback if n8n sends as form or weird encoding
            import json as json_lib
            try:
                data = json_lib.loads(request.data)
            except Exception:
                data = {}

        import json as json_lib
        # Aggressively unpack stringified payload
        if isinstance(data, str):
            try:
                data = json_lib.loads(data)
            except Exception:
                pass

        # n8n might nest the body inside a "body" property if it just forwarded the webhook directly
        if 'body' in data and isinstance(data['body'], dict):
            data = data['body']

        apify_token = os.getenv('APIFY_API_TOKEN')
        li_at_cookie = os.getenv('LINKEDIN_LI_AT_COOKIE')
        if not apify_token:
            return jsonify({'error': 'APIFY_API_TOKEN not configured. Add it to flask.env'}), 500

        # Parse search criteria from project data
        target_companies_raw = data.get('target_companies') or []
        target_titles_raw = data.get('target_functions_titles') or data.get('target_titles') or ''
        target_functions_raw = data.get('target_functions') or []
        
        target_companies = _parse_csv(target_companies_raw)
        target_titles = _parse_csv(target_titles_raw)
        target_functions = _parse_csv(target_functions_raw)
        target_geographies = data.get('target_geographies') or []
        
        if isinstance(target_geographies, dict):
            target_geographies = list(target_geographies.values())
        if isinstance(target_geographies, str):
            target_geographies = _parse_csv(target_geographies)
            
        project_id = data.get('project_id')

        if not target_companies and not target_functions:
            return jsonify({
                'message': 'No search criteria provided (need target_companies or target_functions_titles)',
                'experts_found': 0,
                'experts': []
            })

        all_experts = []
        errors = []
        
        # Build search queries: company + role/seniority combinations
        queries = []
        for company in (target_companies or ['']):
            roles_to_search = target_functions if target_functions else []
            titles_to_search = target_titles if target_titles else []
            combined_roles = roles_to_search + titles_to_search if (roles_to_search or titles_to_search) else ['']
            
            for role in combined_roles:
                geo = target_geographies[0] if target_geographies else ""
                query = f"{role} at {company} {geo}".strip()
                if query:
                    queries.append(query)

        # ── SINGLE STAGE: harvestapi/linkedin-profile-search ────────────────────
        # Actor M2FMdjRVeF1HPGFcc searches LinkedIn directly — no Google needed.
        # Returns full profiles: firstName, lastName, headline, about, location,
        #   linkedinUrl, experience[{position, companyName, startDate, endDate,
        #   location, description, employmentType}]
        SEARCH_ACTOR = "M2FMdjRVeF1HPGFcc"
        SEARCH_API_URL = (
            f"https://api.apify.com/v2/acts/{SEARCH_ACTOR}"
            f"/run-sync-get-dataset-items?token={apify_token}&timeout=180"
        )

        print("\n" + "="*50)
        print(f"[LOADING] LINKEDIN PROFILE SEARCH — harvestapi")
        print(f"[LOADING] Actor: {SEARCH_ACTOR}")
        print(f"[LOADING] Queries ({len(queries)}): {queries[:3]}")
        print(f"[LOADING] Mode: Full profiles with experience data")
        print(f"[LOADING] Estimated time: 60-120 seconds. Please wait...")
        print("="*50 + "\n")

        for query in queries[:5]:   # Limit to 5 queries to control cost/time
            try:
                search_payload = {
                    "searchQuery": query,
                    "profileScraperMode": "Full",   # Full includes experience data
                    "maxItems": 5,                  # 5 profiles per query
                    "takePages": 1,
                }

                print(f"[QUERY] Searching: \"{query}\"")
                resp = http_requests.post(
                    SEARCH_API_URL,
                    json=search_payload,
                    timeout=240
                )

                print(f"[STATUS] Response: {resp.status_code} for query: \"{query}\"")

                if resp.ok:
                    profiles = resp.json() or []
                    print(f"[DATA] Found {len(profiles)} profiles for: \"{query}\"")
                    for profile in profiles:
                        p_url = (
                            profile.get('linkedinUrl') or
                            profile.get('linkedInUrl') or
                            profile.get('url') or
                            profile.get('profileUrl') or ''
                        )
                        if p_url:
                            expert_data = _store_expert_from_profile_final(profile, p_url, project_id)
                            if expert_data:
                                all_experts.append(expert_data)
                else:
                    err = f"Apify Error {resp.status_code} for query '{query}': {resp.text[:200]}"
                    print(f"[ERROR] {err}")
                    errors.append(err)

            except http_requests.exceptions.Timeout:
                msg = f"Timeout for query: '{query}'"
                print(f"[ERROR] {msg}")
                errors.append(msg)
            except Exception as e:
                msg = f"Exception for query '{query}': {str(e)}"
                print(f"[ERROR] {msg}")
                errors.append(msg)

        if not all_experts:
            print("[FALLBACK] No real experts processed from cloud. Triggering Mock Fallback...")
            all_experts = _generate_mock_experts(target_companies, target_functions, project_id)
            errors.append("Apify cloud bot restricted or empty. Used High-Fidelity Mock Experts instead.")

        try:
            db.session.commit()
            print(f"n8n search: Stored {len(all_experts)} experts for project {project_id}")
        except Exception as e:
            db.session.rollback()
            print(f"[DATABASE ERROR] {str(e)}")
            return jsonify({'error': f'Database commit failed: {str(e)}'}), 500

        return jsonify({
            'message': f'Found and stored {len(all_experts)} experts',
            'experts_found': len(all_experts),
            'experts': all_experts,
            'linkedin_urls_found': len(all_experts),
            'errors': errors if errors else None,
            'project_id': project_id
        })
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print(f"[CRITICAL ERROR] {err_msg}")
        return jsonify({
            'error': str(e),
            'traceback': err_msg
        }), 500

# ── Send Emails (Project leads) ───────────────────────────────

@n8n_bp.route('/send-emails', methods=['POST'])
def send_emails():
    """Triggered by n8n to send project invitations to lead experts."""
    db.session.rollback()

    # Reuse auth logic
    auth_header = request.headers.get('Authorization') or ''
    query_token = request.args.get('token')
    expected_token = os.getenv('N8N_SERVICE_TOKEN')
    
    received_token = ""
    if auth_header.startswith('Bearer '):
        received_token = auth_header.split(' ', 1)[1].strip()
    elif query_token:
        received_token = query_token.strip()

    if not received_token or (expected_token and received_token != expected_token):
        return jsonify({'error': 'Unauthorized: Invalid N8N_SERVICE_TOKEN'}), 401

    data = request.get_json(silent=True) or {}
    # n8n wrapper unpacking
    if 'body' in data and isinstance(data['body'], dict):
        data = data['body']

    project_id = data.get('project_id')
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400

    project = Project.query.get_or_404(project_id)

    expert_ids = project.leads_expert_ids or []
    if not expert_ids:
        return jsonify({'message': 'No leads experts found for this project', 'sent_count': 0}), 200

    experts = Expert.query.filter(Expert.id.in_(expert_ids)).all()
    if not experts:
        return jsonify({'message': 'Expert records not found', 'sent_count': 0}), 404

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip('/')
    
    leads_set = set(project.leads_expert_ids or [])
    invited_set = set(project.invited_expert_ids or [])

    for expert in experts:
        e_id_str = str(expert.id)
        if e_id_str in leads_set:
            leads_set.discard(e_id_str)
        invited_set.add(e_id_str)

    project.leads_expert_ids = list(leads_set)
    project.invited_expert_ids = list(invited_set)
    db.session.commit()

    app = current_app._get_current_object()
    threading.Thread(target=_bg_send_project_invites, args=(app, project_id, expert_ids, frontend_url, None)).start()

    return jsonify({
        'message': f'Sending invitations to {len(experts)} lead experts in the background.',
        'sent_count': len(experts),
        'project_id': project_id
    }), 200

# ── Helpers ───────────────────────────────────────────────────

def _store_expert_from_profile_final(person, linkedin_url, project_id):
    """
    Parse focused LinkedIn scraper fields and upsert expert in DB.
    Target fields: first/last name, location, bio/about, linkedin_url, title_headline, experience.
    """
    # ── Name extraction (schema-agnostic) ─────────────────────────────────────
    fn = (person.get('firstName') or person.get('first_name') or person.get('fn') or '').strip()
    ln = (person.get('lastName') or person.get('last_name') or person.get('ln') or '').strip()
    name = (person.get('fullName') or person.get('name') or person.get('full_name') or '').strip()
    title = (person.get('title') or '').strip()

    # Try parsing from Google snippet title "Name - Role - Company"
    if not fn and not name and title:
        name_part = title.split(' - ')[0]
        if name_part and len(name_part) < 50:
            name = name_part

    if not fn and name:
        parts = name.split(' ')
        fn = parts[0]
        ln = " ".join(parts[1:]) if len(parts) > 1 else ""

    if not fn: fn = "LinkedIn"
    if not ln: ln = "Expert"

    # ── Headline / Title ──────────────────────────────────────────────────────
    headline = (
        person.get('headline') or person.get('occupation') or
        person.get('title') or 'LinkedIn Profile'
    ).strip()

    # ── Bio / About ───────────────────────────────────────────────────────────
    # Prefer the dedicated 'about' or 'description' field over summary
    summary = (
        person.get('about') or
        person.get('description') or
        person.get('summary') or
        person.get('bio') or ''
    ).strip()

    # ── Location ──────────────────────────────────────────────────────────────
    # harvestapi returns location as an object: {linkedinText: "...", parsed: {...}}
    _loc_raw = person.get('location') or ''
    if isinstance(_loc_raw, dict):
        location_name = (
            _loc_raw.get('linkedinText') or
            (_loc_raw.get('parsed') or {}).get('text') or ''
        ).strip()
    else:
        location_name = (
            str(_loc_raw) or
            person.get('addressWithCountry') or
            person.get('city') or
            person.get('region') or ''
        ).strip()

    # ── Experience list ──────────────────────────────────────────────────────────────
    # harvestapi schema: person['experience'] = list of dicts with:
    #   position (role title), companyName, startDate.year (int), endDate.year (int),
    #   location (str), description, employmentType
    raw_experiences = (
        person.get('experience') or      # harvestapi schema (primary)
        person.get('experiences') or     # alternate key
        person.get('positions') or []
    )
    if isinstance(raw_experiences, dict):
        raw_experiences = list(raw_experiences.values())

    # ── Persist to DB ─────────────────────────────────────────────────────────
    try:
        expert = Expert.query.filter_by(linkedin_url=linkedin_url).first()

        if not expert:
            import uuid
            expert = Expert(
                expert_id=f"EX-{str(uuid.uuid4())[:8].upper()}",
                first_name=fn,
                last_name=ln,
                linkedin_url=linkedin_url,
                title_headline=headline[:250] if headline else None,
                bio=summary[:2000] if summary else None,
                notes=f"Location: {location_name}" if location_name else None
            )
            db.session.add(expert)
            db.session.flush()
        else:
            # Always update fields when re-scraping
            expert.first_name = fn
            expert.last_name = ln
            if headline: expert.title_headline = headline[:250]
            if summary: expert.bio = summary[:2000]
            if location_name: expert.notes = f"Location: {location_name}"

        # ── Store Experience entries ───────────────────────────────────────────
        if raw_experiences:
            from models import ExpertExperience
            for exp in raw_experiences:
                if not isinstance(exp, dict):
                    continue

                # harvestapi: role = 'position', fallback to 'title'
                comp = (
                    exp.get('companyName') or
                    exp.get('company_name') or
                    exp.get('company') or ''
                ).strip()

                role = (
                    exp.get('position') or       # harvestapi schema
                    exp.get('title') or
                    exp.get('role_title') or
                    exp.get('role') or 'Professional'
                ).strip()

                exp_location = (
                    exp.get('jobLocation') or
                    exp.get('location') or
                    exp.get('geoLocationName') or ''
                )
                # exp_location may be a string (harvestapi) or dict
                if isinstance(exp_location, dict):
                    exp_location = exp_location.get('linkedinText') or ''
                exp_location = str(exp_location).strip()

                exp_description = (
                    exp.get('jobDescription') or
                    exp.get('description') or
                    exp.get('summary') or ''
                ).strip()

                # Parse year — harvestapi: startDate = {month: "Jan", year: 2024} (year is int)
                def _year(date_val):
                    if not date_val:
                        return None
                    if isinstance(date_val, dict):
                        y = date_val.get('year')
                        # year is already an int in harvestapi schema
                        if isinstance(y, int): return y
                        if isinstance(y, str) and y.isdigit(): return int(y)
                        return None
                    if isinstance(date_val, str):
                        import re
                        m = re.search(r'\b(19|20)\d{2}\b', date_val)
                        return int(m.group()) if m else None
                    if isinstance(date_val, int):
                        return date_val
                    return None

                sy = _year(exp.get('startDate') or exp.get('jobStartedOn') or exp.get('start_date') or exp.get('startYear'))
                ey = _year(exp.get('endDate') or exp.get('jobEndedOn') or exp.get('end_date') or exp.get('endYear'))

                if comp:
                    exists = ExpertExperience.query.filter_by(
                        expert_id=expert.id,
                        company_name=comp[:255],
                        role_title=role[:255]
                    ).first()
                    if not exists:
                        db.session.add(ExpertExperience(
                            expert_id=expert.id,
                            company_name=comp[:255],
                            role_title=role[:255],
                            start_year=sy,
                            end_year=ey
                        ))
        else:
            # Last resort: try to extract experience from bio snippet
            fallback_exps = _extract_experience_history_from_bio(summary, title)
            if fallback_exps:
                from models import ExpertExperience
                for exp in fallback_exps:
                    comp = (exp.get('company') or '').strip()
                    role = (exp.get('role') or 'Professional').strip()
                    if comp:
                        exists = ExpertExperience.query.filter_by(
                            expert_id=expert.id, company_name=comp[:255], role_title=role[:255]
                        ).first()
                        if not exists:
                            db.session.add(ExpertExperience(
                                expert_id=expert.id,
                                company_name=comp[:255],
                                role_title=role[:255]
                            ))

        db.session.flush()
        return expert.to_dict()
    except Exception as e:
        print(f"[RECOVERY] Rolling back item {linkedin_url} due to: {str(e)}")
        db.session.rollback()
        return None


def _generate_mock_experts(target_companies, target_functions, project_id):
    """Fallback: generates realistic dummy expert profiles for demo longevity."""
    import uuid
    import random
    
    mock_experts = []
    
    companies = target_companies if target_companies else ["Google", "Meta", "TCS", "Accenture"]
    roles = target_functions if target_functions else ["Engineering Director", "Software Lead", "AI Expert"]
    
    for i in range(min(3, len(companies) * len(roles))):
        co = random.choice(companies)
        role = random.choice(roles)
        uid_part = str(uuid.uuid4())[:8].upper()
        
        name = f"Expert ({co}_{uid_part.lower()})"
        headline = role
        url = f"https://www.linkedin.com/in/mock-{uid_part.lower()}-{co}/"
        
        # Check uniqueness in DB for mock
        expert = Expert.query.filter_by(linkedin_url=url).first()
        if not expert:
            expert = Expert(
                expert_id=f"EX-{uid_part}",
                first_name="Expert",
                last_name=f"({co}_{uid_part.lower()})",
                linkedin_url=url,
                title_headline=headline,
                bio=f"High-fidelity mock profile for {role} at {co}. Used when cloud bot is restricted."
            )
            db.session.add(expert)
            db.session.flush()
        
        mock_experts.append({
            'expert_id': expert.expert_id,
            'name': name,
            'headline': headline,
            'linkedin_url': url,
            'bio': expert.bio
        })
    return mock_experts


def _parse_csv(val):
    """Parse a comma-separated string into a list of trimmed, non-empty items."""
    if not val:
        return []
    if isinstance(val, list):
        return [str(x).strip() for x in val if str(x).strip()]
    return [x.strip() for x in str(val).split(',') if x.strip()]


def _extract_skills_from_bio(bio):
    """Fallback: Extracts tech/professional skills from snippet."""
    if not bio: return []
    skills = []
    # Common tech/biz keywords to look for
    keywords = [
        'Python', 'Javascript', 'React', 'Angular', 'Java', 'AWS', 'Azure',
        'Project Management', 'Data Science', 'Machine Learning', 'SQL',
        'Sales', 'Marketing', 'FinTech', 'HealthTech', 'SAP', 'Oracle', 'Docker'
    ]
    for k in keywords:
        if k.lower() in bio.lower():
            skills.append(k)
    
    # Match specific lists like "Stacks: X, Y, Z"
    import re
    match = re.search(r'(?:Stacks|Skills|Tech|Expertise|Proficiency):\s*([^·\n]+)', bio, re.IGNORECASE)
    if match:
        found = [s.strip() for s in match.group(1).split(',') if s.strip()]
        for f in found:
            if f not in skills: skills.append(f)
            
    return list(set(skills))


def _extract_experience_history_from_bio(bio, title):
    """Fallback: Extracts previous companies from snippet."""
    if not bio: return []
    exps = []
    
    # 1. From Snippet: "Experience: CompanyName"
    import re
    match = re.search(r'(?:Experience|Worked at|Previously):\s*([^·\n]+)', bio, re.IGNORECASE)
    if match:
        comp = match.group(1).strip()
        if len(comp) < 100:
            exps.append({'company': comp, 'role': 'Professional'})
            
    # 2. From Title: "Name - Role - Company"
    if title and ' - ' in title:
        parts = title.split(' - ')
        if len(parts) >= 3:
            exps.append({'company': parts[2].strip(), 'role': parts[1].strip()})
            
    return exps
