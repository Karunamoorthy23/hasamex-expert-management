"""
n8n Integration Routes
======================
WATERFALL ENRICHMENT PIPELINE (3-Stage):
  Stage 1 → Google X-Ray Search (apify/google-search-scraper)
           LLM Boolean query → N1 profiles (name, URL, location, snippet)
  Stage 2 → LinkedIn Deep Profile (anchor/linkedin-profile-enrichment)
           N1 profile URLs → N2 full profiles (experience, skills, bio)
  Stage 3 → SignalHire Contact Enrichment
           N2 profiles → email + phone (async via callbackUrl)
"""
import os
import hashlib
import threading
import time
import requests as http_requests
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Expert, ExpertExperience, ExpertStrength, Project
from routes.projects import _bg_send_project_invites

print('--- N8N WEBHOOK LOADED (v2-curious-coder) ---')

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


# ── SignalHire async callback ─────────────────────────────────

@n8n_bp.route('/signalhire-callback', methods=['POST'])
def signalhire_callback():
    """
    POST /api/v1/n8n/signalhire-callback
    Receives async contact data from SignalHire after Stage 3 enrichment.
    Payload: { "items": [{ "linkedin": "...", "contacts": [...] }] }
    """
    data = request.get_json(silent=True) or {}
    items = data.get('items') or []

    enriched = 0
    for item in items:
        linkedin_url = (item.get('linkedin') or item.get('linkedin_url') or '').strip()
        if not linkedin_url:
            continue

        contacts = item.get('contacts') or []
        emails = [c.get('value') for c in contacts if c.get('type') == 'email' and c.get('value')]
        phones = [c.get('value') for c in contacts if c.get('type') == 'phone' and c.get('value')]

        email = emails[0] if emails else None
        phone = phones[0] if phones else None

        if not email and not phone:
            continue

        try:
            expert = Expert.query.filter_by(linkedin_url=linkedin_url).first()
            if expert:
                if email and not expert.primary_email:
                    expert.primary_email = email[:255]
                if phone and not expert.primary_phone:
                    expert.primary_phone = phone[:50]
                db.session.commit()
                enriched += 1
                print(f"[SIGNALHIRE CB] Updated {linkedin_url}: {email} | {phone}")
        except Exception as e:
            db.session.rollback()
            print(f"[SIGNALHIRE CB ERROR] {e}")

    return jsonify({'enriched': enriched}), 200


# ── Search Experts (3-Stage Waterfall) ───────────────────────

@n8n_bp.route('/search-experts', methods=['POST'])
def search_experts():
    """
    3-Stage Waterfall:
      1. Google X-Ray  → N1 profiles (name, url, location, snippet)
      2. Anchor Enrichment → N2 profiles (experience, skills, full bio)
      3. SignalHire    → emails + phone (async callback)
    """
    db.session.rollback()

    # ── Auth ──────────────────────────────────────────────────
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
            import json as json_lib
            try:
                data = json_lib.loads(request.data)
            except Exception:
                data = {}

        import json as json_lib
        if isinstance(data, str):
            try:
                data = json_lib.loads(data)
            except Exception:
                pass

        if 'body' in data and isinstance(data['body'], dict):
            data = data['body']

        apify_token = os.getenv('APIFY_API_TOKEN')
        if not apify_token:
            return jsonify({'error': 'APIFY_API_TOKEN not configured. Add it to flask.env'}), 500

        # ── Parse project search criteria ─────────────────────
        target_companies_raw = data.get('target_companies') or []
        target_titles_raw    = data.get('target_functions_titles') or data.get('target_titles') or ''
        target_functions_raw = data.get('target_functions') or []

        target_companies  = _parse_csv(target_companies_raw)
        target_titles     = _parse_csv(target_titles_raw)
        target_functions  = _parse_csv(target_functions_raw)
        target_geographies = data.get('target_geographies') or []

        if isinstance(target_geographies, dict):
            target_geographies = list(target_geographies.values())

        project_id = data.get('project_id')

        errors = []
        n1_profiles = []
        n2_profiles = {}
        
        # Consolidate project and min_years lookup
        project = Project.query.get(project_id) if project_id else None
        min_years = data.get('min_years')
        if min_years is None and project:
            min_years = _extract_min_experience_from_desc(project.project_description)

        if isinstance(target_geographies, str):
            target_geographies = _parse_csv(target_geographies)

        if not target_companies and not target_functions and not target_titles:
            return jsonify({
                'message': 'No search criteria provided (need target_companies or target_functions_titles)',
                'experts_found': 0,
                'experts': []
            })

        # ── LLM Boolean Query Generation ──────────────────────
        print("\n" + "-"*60)
        print("[STAGE 0] Generating AI Boolean search query...")
        all_raw_roles = target_titles + target_functions
        boolean_query = _refine_search_criteria_with_llm(target_companies, all_raw_roles)
        print(f"[STAGE 0] Boolean Query: {boolean_query}")
        print("-"*60 + "\n")

        # ═══════════════════════════════════════════════════════
        # STAGE 1: Google X-Ray Search → N1 snippets
        # ═══════════════════════════════════════════════════════
        print("=" * 60)
        print("[STAGE 1] Google X-Ray Search for LinkedIn Profiles")
        print("=" * 60)

        GOOGLE_ACTOR_URL = (
            "https://api.apify.com/v2/acts/apify~google-search-scraper"
            f"/run-sync-get-dataset-items?token={apify_token}&timeout=180"
        )

        n1_profiles = []   # List of { url, name, title, snippet, location }

        if boolean_query:
            try:
                google_payload = {
                    "queries": f"site:linkedin.com/in/ {boolean_query}",
                    "maxPagesPerQuery": 1,
                    "resultsPerPage": 15
                }
                print(f"[STAGE 1] Query: site:linkedin.com/in/ {boolean_query}")
                resp1 = http_requests.post(GOOGLE_ACTOR_URL, json=google_payload, timeout=300)

                if resp1.ok:
                    google_data = resp1.json()
                    organic = []
                    if google_data and isinstance(google_data, list) and 'organicResults' in google_data[0]:
                        organic = google_data[0]['organicResults']

                    print(f"[STAGE 1] Found {len(organic)} raw profiles from Google")

                    for result in organic:
                        url = result.get('url') or ''
                        if 'linkedin.com/in/' not in url:
                            continue
                        pi = result.get('personalInfo') or {}
                        n1_profiles.append({
                            'url':      url,
                            'title':    result.get('title') or '',
                            'snippet':  result.get('description') or '',
                            'location': pi.get('location') or '',
                            'jobTitle': pi.get('jobTitle') or '',
                            'company':  pi.get('companyName') or '',
                        })
                else:
                    print(f"[STAGE 1] Google error {resp1.status_code}: {resp1.text[:200]}")

            except Exception as e:
                print(f"[STAGE 1 ERROR] {e}")

        print(f"[STAGE 1] N1 profiles collected: {len(n1_profiles)}")

        if not n1_profiles:
            db.session.commit()
            return jsonify({
                'message': 'Stage 1 returned 0 profiles from Google X-Ray.',
                'experts_found': 0, 'experts': [],
                'errors': ['Google X-Ray returned 0 results. Check your search query.'],
                'project_id': project_id
            })

        # ═══════════════════════════════════════════════════════
        # STAGE 2: LinkedIn Deep Profile Enrichment → N2 full data
        # Uses apify/linkedin-profile-scraper (official / high quality)
        # Schema: multiple (handled by _store_expert_from_profile_final)
        # ═══════════════════════════════════════════════════════
        print("\n" + "=" * 60)
        print("[STAGE 2] Deep LinkedIn Profile Enrichment (Apify Official)")
        print("=" * 60)

        LI_ACTOR_URL = (
            "https://api.apify.com/v2/acts/apify~linkedin-profile-scraper"
            f"/run-sync-get-dataset-items?token={apify_token}&timeout=300"
        )

        n1_urls = [p['url'] for p in n1_profiles][:10] # Batch size of 10 for performance/reliability
        n2_profiles = {}

        li_cookie = os.getenv('LINKEDIN_LI_AT_COOKIE')

        try:
            payload = {
                "urls": n1_urls,
                "proxyConfiguration": {"useApifyProxy": True},
            }
            if li_cookie:
                # Official scraper requires array format
                payload["cookie"] = [{"name": "li_at", "value": li_cookie, "domain": ".linkedin.com"}]
                
            print(f"[STAGE 2] Enriching {len(n1_urls)} profiles via apify official actor...")
            print(f"[STAGE 2 DEBUG] Payload: {json.dumps(payload, indent=2)}")
            resp2 = http_requests.post(LI_ACTOR_URL, json=payload, timeout=360)

            print(f"[STAGE 2] Scraper Response Status: {resp2.status_code}")
            print(f"[STAGE 2 DEBUG] Raw Response (first 1000): {resp2.text[:1000]}")
            if resp2.ok:
                results = resp2.json() or []
                print(f"[STAGE 2] Received {len(results)} enriched profiles")
                for profile in results:
                    purl = (
                        profile.get('url') or profile.get('linkedinUrl') or ''
                    ).strip().rstrip('/')
                    if purl:
                        exps = profile.get('positions') or profile.get('experience') or profile.get('experiences') or []
                        print(f"[STAGE 2] Got deep data for: {purl} (exp rows: {len(exps)})")
                        n2_profiles[purl] = profile
            else:
                print(f"[STAGE 2] Scraper error {resp2.status_code}: {resp2.text[:500]}")

        except Exception as e:
            print(f"[STAGE 2 ERROR] {e}")

        # ── Merge and Store ──────────────────────────────────
        all_experts = []

        def normalize_url(u):
            return u.lower().replace('https://', '').replace('http://', '').replace('www.', '').strip().rstrip('/')

        n2_keys = {normalize_url(k): v for k, v in n2_profiles.items()}

        for n1 in n1_profiles:
            raw_url = n1['url']
            n2 = n2_keys.get(normalize_url(raw_url))

            if n2:
                # Merge: N2 takes precedence, fill gaps from N1 snippet
                merged = {**n1, **n2}
                source = 'deep'
            else:
                # No Stage 2 match — fall back to snippet data only
                merged = n1.copy()
                source = 'snippet'

            expert_data = _store_expert_from_profile_final(merged, raw_url, project_id, source=source)
            if not expert_data:
                continue

            exp_years = expert_data.get('years_of_experience', 0) or 0
            if min_years and exp_years < min_years:
                print(f"[FUNNEL] Skipping {expert_data.get('full_name')} — {exp_years} yrs < {min_years}")
                continue

            # Relevance scoring
            relevance = 0
            if project and project.project_description:
                bio_text = ((expert_data.get('bio') or '') + ' ' + (expert_data.get('title_headline') or '')).lower()
                for kw in (project.project_title or '').split():
                    if len(kw) > 3 and kw.lower() in bio_text:
                        relevance += 1

            expert_data['relevance_score'] = relevance
            expert_data['enrichment_source'] = source
            all_experts.append(expert_data)

        # Rank by relevance + experience
        all_experts.sort(key=lambda x: (x.get('relevance_score', 0), x.get('years_of_experience', 0)), reverse=True)
        all_experts = all_experts[:15]

        if not all_experts:
            print("[WARNING] No experts survived after filtering/enrichment.")
            errors.append("Pipeline returned 0 qualified experts after enrichment.")

        # ── Commit Stage 1+2 results ──────────────────────────
        try:
            db.session.commit()
            print(f"[DB] Committed {len(all_experts)} experts for project {project_id}")
        except Exception as e:
            db.session.rollback()
            print(f"[DATABASE ERROR] {e}")
            return jsonify({'error': f'Database commit failed: {str(e)}'}), 500

        # ═══════════════════════════════════════════════════════
        # STAGE 3: SignalHire Contact Enrichment (async)
        # Fires off a background request; results arrive at /signalhire-callback
        # ═══════════════════════════════════════════════════════
        print("\n" + "=" * 60)
        print("[STAGE 3] SignalHire Contact Enrichment (async)")
        print("=" * 60)

        signalhire_key = os.getenv('SIGNALHIRE_API_KEY')
        # Build a public callback URL that SignalHire can POST back to
        host = os.getenv('BACKEND_PUBLIC_URL', 'http://localhost:8080')
        callback_url = f"{host}/api/v1/n8n/signalhire-callback"

        if signalhire_key and all_experts:
            app_ctx = current_app._get_current_object()
            threading.Thread(
                target=_bg_signalhire_enrich,
                args=(app_ctx, signalhire_key, all_experts, callback_url),
                daemon=True
            ).start()
            print(f"[STAGE 3] Dispatched {len(all_experts)} profiles to SignalHire (callback: {callback_url})")
        else:
            missing = "SIGNALHIRE_API_KEY" if not signalhire_key else "no experts"
            print(f"[STAGE 3] Skipping — {missing} not available")

        return jsonify({
            'message': f'Pipeline complete: {len(all_experts)} experts found and stored',
            'experts_found': len(all_experts),
            'experts': all_experts,
            'stage1_n1': len(n1_profiles),
            'stage2_n2': len(n2_profiles),
            'signalhire_dispatched': bool(signalhire_key and all_experts),
            'errors': errors if errors else None,
            'project_id': project_id
        })

    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print(f"[CRITICAL ERROR] {err_msg}")
        return jsonify({'error': str(e), 'traceback': err_msg}), 500


# ── Send Emails (Project leads) ───────────────────────────────

@n8n_bp.route('/send-emails', methods=['POST'])
def send_emails():
    """Triggered by n8n to send project invitations to lead experts."""
    db.session.rollback()

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

    leads_set   = set(project.leads_expert_ids or [])
    invited_set = set(project.invited_expert_ids or [])

    for expert in experts:
        e_id_str = str(expert.id)
        if e_id_str in leads_set:
            leads_set.discard(e_id_str)
        invited_set.add(e_id_str)

    project.leads_expert_ids   = list(leads_set)
    project.invited_expert_ids = list(invited_set)
    db.session.commit()

    app = current_app._get_current_object()
    threading.Thread(
        target=_bg_send_project_invites,
        args=(app, project_id, expert_ids, frontend_url, None)
    ).start()

    return jsonify({
        'message': f'Sending invitations to {len(experts)} lead experts in the background.',
        'sent_count': len(experts),
        'project_id': project_id
    })


# ═══════════════════════════════════════════════════════════════
# BACKGROUND HELPERS
# ═══════════════════════════════════════════════════════════════

def _bg_signalhire_enrich(app, api_key, experts, callback_url):
    """
    Background task: sends N2 profiles to SignalHire for contact enrichment.
    SignalHire will POST results back to callback_url asynchronously.
    """
    with app.app_context():
        SIGNALHIRE_URL = "https://www.signalhire.com/api/v1/candidate/search"
        headers = {
            "Content-Type": "application/json",
            "apikey": api_key
        }

        # SignalHire processes up to 25 items per request
        BATCH = 25
        for i in range(0, len(experts), BATCH):
            batch = experts[i:i+BATCH]
            items = []
            for exp in batch:
                li_url = exp.get('linkedin_url') or ''
                if li_url:
                    items.append({"linkedin": li_url})

            if not items:
                continue

            payload = {
                "items": items,
                "callbackUrl": callback_url
            }

            try:
                resp = http_requests.post(SIGNALHIRE_URL, json=payload, headers=headers, timeout=30)
                if resp.status_code in (200, 201, 202):
                    print(f"[SIGNALHIRE] Batch {i//BATCH+1}: {len(items)} profiles queued (status {resp.status_code})")
                else:
                    print(f"[SIGNALHIRE] Error {resp.status_code}: {resp.text[:200]}")
            except Exception as e:
                print(f"[SIGNALHIRE] Request failed: {e}")

            # Polite delay between batches
            if i + BATCH < len(experts):
                time.sleep(1)


# ═══════════════════════════════════════════════════════════════
# LLM REFINEMENT
# ═══════════════════════════════════════════════════════════════

def _extract_min_experience_from_desc(desc):
    """Extract minimum years of experience requirement from project description."""
    if not desc:
        return None
    import re
    match = re.search(r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)', desc, re.IGNORECASE)
    return int(match.group(1)) if match else None


def _refine_search_criteria_with_llm(companies, titles):
    """
    Uses Gemini to generate a precise Boolean query for Google X-Ray search.
    Returns a string like: ("procurement" OR "sourcing") AND (Bayer OR Orifarm)
    """
    import os
    from agents.gemini_client import generate

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return _simple_boolean_fallback(companies, titles)

    # Clean obvious over-specified inputs
    clean_companies = [c.split('(')[0].split(',')[0].strip() for c in (companies or []) if c.strip()]
    clean_titles    = [t.split('(')[0].strip() for t in (titles or []) if t.strip()]

    system_prompt = """You are a LinkedIn Boolean search expert.
Generate ONE precise Boolean search string to find LinkedIn profiles of people who:
- Work at (or have worked at) the listed companies
- Have job titles related to the listed roles/functions

RULES:
1. Use only 2-4 keywords per group — keep it tight.
2. Use OR between synonyms, AND between different criteria groups.
3. Use short/abbreviated company names (e.g. "Bayer" not "Bayer Consumer Health GmbH")
4. Wrap multi-word terms in double quotes.
5. Output ONLY valid JSON: { "boolean_query": "..." }
6. Do NOT include location, seniority, or LinkedIn in the query.
"""

    user_text = f"""Companies: {clean_companies}
Roles/Functions: {clean_titles}

Generate the boolean query."""

    try:
        response = generate(api_key, "gemini-2.0-flash", system_prompt, user_text, temperature=0.3)
        if not response:
            return _simple_boolean_fallback(companies, titles)

        clean_resp = response.strip()
        if clean_resp.startswith("```json"):
            clean_resp = clean_resp[7:]
        if clean_resp.startswith("```"):
            clean_resp = clean_resp[3:]
        if clean_resp.endswith("```"):
            clean_resp = clean_resp[:-3]

        import json
        data = json.loads(clean_resp.strip())
        return data.get("boolean_query", "") or _simple_boolean_fallback(companies, titles)

    except Exception as e:
        print(f"[LLM FILTER ERROR] {e}")
        return _simple_boolean_fallback(companies, titles)


def _simple_boolean_fallback(companies, titles):
    """Simple OR/AND fallback Boolean builder."""
    c_str = " OR ".join([f'"{c}"' if " " in c else c for c in (companies or [])])
    t_str = " OR ".join([f'"{t}"' if " " in t else t for t in (titles or [])])
    q = []
    if t_str: q.append(f"({t_str})")
    if c_str: q.append(f"({c_str})")
    return " AND ".join(q)


# ═══════════════════════════════════════════════════════════════
# PROFILE STORAGE (Stage 1 — snippet + Stage 2 — deep)
# ═══════════════════════════════════════════════════════════════

def _store_expert_from_profile_final(person, linkedin_url, project_id, source='snippet'):
    """Final storage of expert to DB with mapped fields."""
    try:
        # ── Name ──────────────────────────────────────────────────
        fn   = (person.get('firstName') or person.get('first_name') or '').strip()
        ln   = (person.get('lastName')  or person.get('last_name')  or '').strip()
        name = (person.get('fullName')  or person.get('name')       or person.get('full_name') or '').strip()
        title_raw = (person.get('title') or '').strip()

        # Fallback for name if first/last missing
        if not fn and name:
            parts = name.split()
            fn = parts[0]
            ln = " ".join(parts[1:]) if len(parts) > 1 else ""

        if not fn: fn = "LinkedIn"
        if not ln: ln = "Expert"

        # ── Headline ──────────────────────────────────────────────
        headline = (
            person.get('headline') or person.get('occupation') or
            person.get('jobTitle') or title_raw or 'LinkedIn Profile'
        ).strip()

        # ── Bio / About ───────────────────────────────────────────
        summary = (
            person.get('about') or person.get('description') or
            person.get('summary') or person.get('snippet') or
            person.get('bio') or ''
        ).strip()

        # ── Location ──────────────────────────────────────────────
        _loc_raw = (
            person.get('location') or
            (person.get('personalInfo') or {}).get('location') or
            person.get('geoLocationName') or ''
        )
        if isinstance(_loc_raw, dict):
            location_name = (_loc_raw.get('linkedinText') or (_loc_raw.get('parsed') or {}).get('text') or '').strip()
        else:
            location_name = str(_loc_raw).strip()

        # ── Experience Extraction ─────────────────────────────────
        raw_experiences = (
            person.get('positions') or
            person.get('experience') or
            person.get('experiences') or []
        )
        if isinstance(raw_experiences, dict):
            raw_experiences = list(raw_experiences.values())

        # Build a single-entry fallback from personalInfo if no experience list
        if not raw_experiences and source == 'snippet':
            pi = person.get('personalInfo') or {}
            jt = pi.get('jobTitle') or person.get('jobTitle') or headline
            co = pi.get('companyName') or person.get('company') or ''
            if jt or co:
                raw_experiences = [{'title': jt, 'company': co}]

        total_exp = _calculate_total_experience(raw_experiences)

        # ── Persist to DB ─────────────────────────────────────────
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
                years_of_experience=total_exp,
                notes=f"Location: {location_name}" if location_name else None
            )
            db.session.add(expert)
            db.session.flush()
        else:
            expert.first_name = fn
            expert.last_name  = ln
            expert.years_of_experience = total_exp
            if headline:      expert.title_headline = headline[:250]
            if summary:       expert.bio = summary[:2000]
            if location_name: expert.notes = f"Location: {location_name}"

        # ── Store Experience entries ──────────────────────────
        if raw_experiences:
            from models import ExpertExperience
            for exp in raw_experiences:
                if not isinstance(exp, dict):
                    continue

                # anchor/curious_coder schema: title + company
                comp = (
                    exp.get('companyName') or exp.get('company_name') or
                    exp.get('company')     or ''
                ).strip()

                role = (
                    exp.get('title')     or
                    exp.get('position')  or
                    exp.get('role_title') or
                    exp.get('role')      or 'Professional'
                ).strip()

                # timePeriod: { startDate: {month, year}, endDate: {month, year} }
                def _year(date_val):
                    if not date_val: return None
                    if isinstance(date_val, dict):
                        y = date_val.get('year')
                        if isinstance(y, int): return y
                        if isinstance(y, str) and y.isdigit(): return int(y)
                        return None
                    if isinstance(date_val, str):
                        import re
                        m = re.search(r'\b(19|20)\d{2}\b', date_val)
                        return int(m.group()) if m else None
                    if isinstance(date_val, int): return date_val
                    return None

                time_period = exp.get('timePeriod') or {}
                sy = _year(time_period.get('startDate') or exp.get('startDate') or exp.get('jobStartedOn') or exp.get('start_date') or exp.get('startYear') or exp.get('starts_at') or exp.get('start_year'))
                ey = _year(time_period.get('endDate')   or exp.get('endDate')   or exp.get('jobEndedOn')   or exp.get('end_date')   or exp.get('endYear') or exp.get('ends_at') or exp.get('end_year'))

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
            # Last resort: Gemini LLM parses the bio/snippet
            fallback_exps = _extract_experience_history_from_bio(summary, title_raw)
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

        # ── Store Strength/Skill topics ───────────────────────
        if raw_skills:
            from models import ExpertStrength
            for skill in raw_skills:
                skill_str = str(skill).strip()[:255]
                if not skill_str:
                    continue
                exists = ExpertStrength.query.filter_by(
                    expert_id=expert.id, topic_name=skill_str
                ).first()
                if not exists:
                    db.session.add(ExpertStrength(expert_id=expert.id, topic_name=skill_str))

        db.session.flush()
        return expert.to_dict()
    except Exception as e:
        print(f"[RECOVERY] Rolling back {linkedin_url}: {e}")
        db.session.rollback()
        return None


# ═══════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════

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
    keywords = [
        'Python', 'Javascript', 'React', 'Angular', 'Java', 'AWS', 'Azure',
        'Project Management', 'Data Science', 'Machine Learning', 'SQL',
        'Sales', 'Marketing', 'FinTech', 'HealthTech', 'SAP', 'Oracle',
        'Docker', 'Procurement', 'Supply Chain', 'Sourcing'
    ]
    skills = [k for k in keywords if k.lower() in bio.lower()]
    import re
    match = re.search(r'(?:Stacks|Skills|Tech|Expertise|Proficiency):\s*([^·\n]+)', bio, re.IGNORECASE)
    if match:
        for f in match.group(1).split(','):
            f = f.strip()
            if f and f not in skills:
                skills.append(f)
    return list(set(skills))


def _extract_experience_history_from_bio(bio, title):
    """Fallback: Uses Gemini LLM to extract experience from Google snippet."""
    if not bio: return []
    exps = []

    api_key = os.getenv('GEMINI_API_KEY')
    if api_key and len(bio) > 15:
        from agents.gemini_client import generate
        import json
        system_prompt = """Extract an array of JSON objects containing 'position' (string) and 'companyName' (string).
Parse the text perfectly. Return ONLY a raw JSON array of objects, no markdown, no explanation."""
        try:
            res = generate(api_key, 'gemini-2.0-flash', system_prompt, f"Parse this:\n{bio}\n{title}")
            res = res.strip()
            if res.startswith("```json"): res = res[7:]
            if res.startswith("```"):     res = res[3:]
            if res.endswith("```"):       res = res[:-3]
            parsed_jobs = json.loads(res.strip())
            for job in parsed_jobs:
                comp = job.get('companyName')
                role = job.get('position')
                if comp and role:
                    exps.append({'company': comp.strip(), 'role': role.strip()})
            if exps:
                return exps
        except Exception:
            pass

    # Regex fallbacks
    import re
    match = re.search(r'(?:Experience|Worked at|Previously):\s*([^·\n]+)', bio, re.IGNORECASE)
    if match:
        comp = match.group(1).strip()
        if len(comp) < 100:
            exps.append({'company': comp, 'role': 'Professional'})

    if title and ' - ' in title:
        parts = title.split(' - ')
        if len(parts) >= 3:
            exps.append({'company': parts[2].strip(), 'role': parts[1].strip()})

    return exps


def _calculate_total_experience(raw_experiences):
    """Calculates total years of professional experience."""
    if not raw_experiences or not isinstance(raw_experiences, list):
        return 0

    import datetime
    current_year = datetime.datetime.now().year
    intervals = []

    for exp in raw_experiences:
        if not isinstance(exp, dict): continue

        def _get_y(d):
            if isinstance(d, dict): return d.get('year')
            if isinstance(d, int):  return d
            if isinstance(d, str):
                import re
                m = re.search(r'\b(19|20)\d{2}\b', d)
                return int(m.group()) if m else None
            return None

        # Handle dev_fusion / curious_coder / anchor timePeriod schema
        tp = exp.get('timePeriod') or {}
        sy = _get_y(tp.get('startDate') or exp.get('startDate') or exp.get('jobStartedOn') or exp.get('startYear') or exp.get('starts_at') or exp.get('start_year'))
        ey = _get_y(tp.get('endDate')   or exp.get('endDate')   or exp.get('jobEndedOn')   or exp.get('endYear') or exp.get('ends_at') or exp.get('end_year'))

        if not sy: continue
        if not ey: ey = current_year

        try:
            sy, ey = int(sy), int(ey)
            if 1970 <= sy <= current_year and sy <= ey:
                intervals.append((sy, ey))
        except (TypeError, ValueError):
            continue

    if not intervals:
        return 0

    intervals.sort()
    total = 0
    merged_start, merged_end = intervals[0]
    for s, e in intervals[1:]:
        if s <= merged_end:
            merged_end = max(merged_end, e)
        else:
            total += merged_end - merged_start
            merged_start, merged_end = s, e
    total += merged_end - merged_start
    return min(total, 50)
