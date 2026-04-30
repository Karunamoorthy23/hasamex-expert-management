from flask import Blueprint, request, jsonify, current_app
import requests
import os
import json
from extensions import db
from models import Project, LkProjectTargetGeography
from agents.boolean_agent import generate_boolean_query

manual_search_bp = Blueprint('manual_search', __name__, url_prefix='/api/v1/search')

@manual_search_bp.route('/find-experts', methods=['POST'])
def find_experts():
    """
    Trigger a manual expert search for a project.
    1. Fetch project details.
    2. Generate Boolean query via BooleanAgent.
    3. Run Apify Google X-Ray Search.
    4. Print results to terminal.
    """
    data = request.get_json() or {}
    project_id = data.get('project_id')

    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400

    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    # Extract criteria
    companies = project.target_companies or []
    titles = project.target_functions_titles or ""
    functions = project.target_functions or []
    geographies = [g.name for g in project.target_geographies] if project.target_geographies else []
    description = project.project_description or project.description or ""

    print(f"\n{'='*60}")
    print(f" MANUAL EXPERT SEARCH TRIGGERED ")
    print(f" Project: {project.project_title or project.title} (ID: {project_id})")
    print(f"{'='*60}")
    print(companies,'/n',titles,'/n',functions,'/n',geographies,'/n',description)
    # Stage 1: Generate Boolean Query
    print(f"[STAGE 1] Generating AI Boolean Query...")
    boolean_query = generate_boolean_query(companies, titles, functions, geographies, description)
   
    if not boolean_query:
        print("[ERROR] BooleanAgent failed to generate a query.")
        return jsonify({'error': 'Failed to generate search query'}), 500

    print(f"[STAGE 1] Result: {boolean_query}")

    # Stage 2: Execute Apify Search
    apify_token = os.getenv('APIFY_API_TOKEN')
    if not apify_token:
        print("[ERROR] APIFY_API_TOKEN not found in environment.")
        return jsonify({'error': 'APIFY_API_TOKEN not configured'}), 500

    print(f"[STAGE 2] Executing Apify Google X-Ray Search...")
    
    # Using the proven google-search-scraper from n8n_webhook.py
    actor_id = "apify~google-search-scraper"
    url = f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items?token={apify_token}&timeout=180"
    
    # Ensure site:linkedin.com/in/ is present
    final_query = boolean_query
    if 'site:linkedin.com/in/' not in final_query:
        final_query = f"site:linkedin.com/in/ {final_query}"

    payload = {
        "queries": final_query,
        "maxPagesPerQuery": 1,
        "resultsPerPage": 2
    }

    try:
        resp = requests.post(url, json=payload, timeout=200)
        if not resp.ok:
            print(f"[ERROR] Apify request failed: {resp.status_code} {resp.text}")
            return jsonify({'error': 'Apify search failed', 'details': resp.text[:200]}), 500

        resp_data = resp.json()
        
        # Parse organicResults from google-search-scraper
        results = []
        if isinstance(resp_data, list) and len(resp_data) > 0:
            # Force limit to 2 results in Python since Google Search scrapes full pages
            results = resp_data[0].get('organicResults', [])[:1]
            
        print(f"[STAGE 2] Found {len(results)} experts.")

        # Print formatted results to terminal
        print(f"\n{'*'*60}")
        print(f" SEARCH RESULTS FOR: {final_query}")
        print(f"{'*'*60}")
        
        formatted_experts = []
        for idx, result in enumerate(results, 1):
            full_title = result.get('title', 'N/A')
            url = result.get('url', 'N/A')
            snippet = result.get('snippet') or result.get('description') or 'N/A'
            
            # Extract name and job title from Google Result Title
            # Typically: "Name - Job Title - Company | LinkedIn"
            name = full_title
            job_title = "N/A"
            if ' - ' in full_title:
                parts = full_title.split(' - ')
                name = parts[0].strip()
                if len(parts) > 1:
                    job_title = parts[1].split(' | ')[0].strip()
            
            # Attempt to get more data from 'personalInfo' if the scraper provided it
            pi = result.get('personalInfo') or {}
            location = pi.get('location') or 'N/A'
            if pi.get('jobTitle'):
                job_title = pi.get('jobTitle')
            
            print(f"{idx}. {name}")
            print(f"   Title:    {job_title}")
            print(f"   Location: {location}")
            print(f"   Snippet:  {snippet[:100]}...")
            print(f"   Link:    {url}")
            print("-" * 40)
            
            formatted_experts.append({
                'name': name,
                'job_title': job_title,
                'location': location,
                'snippet': snippet,
                'url': url
            })

        print(f"{'*'*60}\n")

        # Stage 3 & 4: Enrichment & Storage
        print(f"[STAGE 3 & 4] Saving search results to staging and attempting enrichment...")
        from services.linkd_service import fetch_full_profile, print_detailed_profile
        from services.expert_service import save_or_update_expert_profile, save_to_staging, remove_from_staging
        
        saved_count = 0
        enriched_count = 0
        staging_count = 0
        
        for idx, exp in enumerate(formatted_experts, 1):
            if idx > 2: # Safety limit for credits
                break
                
            print(f"[{idx}/{len(formatted_experts)}] Processing {exp['name']}...")
            
            # 1. Save to Staging first (Stage 1 data)
            if save_to_staging(project_id, exp):
                staging_count += 1
            
            # 2. Fetch Enrichment (Stage 2)
            profile_data = fetch_full_profile(exp['url'])
            
            # 3. Map and Save to main experts table ONLY if enriched
            if profile_data:
                print_detailed_profile(profile_data)
                data = profile_data.get('data', {}) or profile_data
                enriched_count += 1
                
                # Full Enrichment Save
                geo = data.get('geo', {})
                location_str = geo.get('full') or data.get('location') or exp['location']
                
                save_data = {
                    'linkedin_url': exp['url'],
                    'first_name': data.get('firstName') or data.get('first_name'),
                    'last_name': data.get('lastName') or data.get('last_name'),
                    'full_name': data.get('full_name') or f"{data.get('firstName', '')} {data.get('lastName', '')}".strip() or exp['name'],
                    'headline': data.get('headline') or exp['job_title'],
                    'location': location_str,
                    'summary': data.get('summary') or data.get('about') or exp['snippet'],
                    'experiences': data.get('fullPositions') or data.get('position') or data.get('positions') or data.get('experience') or [],
                    'skills': data.get('skills') or [],
                    'education': data.get('educations') or data.get('education') or [],
                    'email': data.get('email'),
                    'phone': data.get('phone')
                }

                try:
                    saved_expert = save_or_update_expert_profile(save_data, project_id=project_id)
                    if saved_expert:
                        saved_count += 1
                        # Cleanup: Remove from staging once safely in main table
                        remove_from_staging(project_id, exp['url'])
                        
                        # Log raw enrichment JSON
                        from models import ExpertEnrichmentLog
                        from extensions import db
                        
                        log_entry = ExpertEnrichmentLog(
                            expert_id=saved_expert.id,
                            project_id=project_id,
                            raw_json=profile_data
                        )
                        db.session.add(log_entry)
                        db.session.commit()
                except Exception as save_err:
                    print(f"   [ERROR] Failed to save {exp['name']} to main table: {save_err}")
            else:
                print(f"   Note: Enrichment failed/skipped for {exp['name']}. Expert remains in staging only.")

        print(f"Final Status: {staging_count} in staging, {enriched_count} enriched, {saved_count} in main expert table.")

        return jsonify({
            'message': f'Search complete. {staging_count} experts staged, {saved_count} experts fully enriched and saved.',
            'query': boolean_query,
            'experts_found': len(formatted_experts),
            'experts_staged': staging_count,
            'experts_enriched': enriched_count,
            'experts_saved_to_main': saved_count
        })

    except Exception as e:
        print(f"[ERROR] Manual search exception: {e}")
        return jsonify({'error': str(e)}), 500
