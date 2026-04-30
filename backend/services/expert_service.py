import os
import uuid
from datetime import datetime
from sqlalchemy import text
from extensions import db
from models import Expert, ExpertExperience, ExpertStrength, ProjectExpert, Project, LkCompanyRole, StagingExpertEnhancement, LkLocation
from utils.timezone_util import find_iana_timezone

def normalize_linkedin_url(url: str) -> str:
    """Standardize LinkedIn URL for consistent matching."""
    if not url: return ""
    url = url.strip().lower().rstrip('/')
    url = url.replace('https://', '').replace('http://', '')
    url = url.replace('www.', '')
    # Handle subdomains like in.linkedin.com -> linkedin.com/in/...
    if 'linkedin.com' in url:
        parts = url.split('linkedin.com')
        if len(parts) > 1:
            return 'linkedin.com' + parts[1]
    return url

def _generate_expert_id() -> str:
    """Generate a unique incremental expert ID like EX-00001."""
    try:
        res = db.session.execute(text("SELECT COALESCE(MAX(CAST(SUBSTRING(expert_id FROM '\\d+$') AS INTEGER)), 0) FROM experts WHERE expert_id ~ '^EX-\\d+$'"))
        max_num = res.scalar() or 0
        return f"EX-{max_num + 1:05d}"
    except Exception as e:
        print(f"[EXPERT SERVICE] ID Generation fallback: {e}")
        return f"EX-{str(uuid.uuid4())[:8].upper()}"

def _safe_strip(val: any) -> str:
    """Safely convert any value to a stripped string."""
    if val is None:
        return ""
    if isinstance(val, dict):
        # If it's a dict, try to get a name/title field or just stringify
        return str(val.get('name') or val.get('title') or val.get('label') or val).strip()
    return str(val).strip()

def _match_company_role(title: str) -> int:
    """Attempts to match a job title to an LkCompanyRole ID."""
    if not title: return None
    roles = LkCompanyRole.query.all()
    title_lower = title.lower()
    
    # Priority matches
    priority_keywords = ["President", "Founder", "Director", "Executive", "Manager", "Consultant", "Advisor"]
    for kw in priority_keywords:
        if kw.lower() in title_lower:
            # Find the actual role in DB that matches this keyword
            for r in roles:
                if kw.lower() == r.name.lower() or kw.lower() in r.name.lower():
                    return r.id
    
    # Generic matches
    for role in roles:
        if role.name.lower() in title_lower:
            return role.id
            
    return None

def _get_or_create_location(location_str: str) -> int:
    """Finds or creates an LkLocation entry and returns its ID."""
    if not location_str: return None
    
    loc_clean = location_str.strip()
    if not loc_clean: return None

    # Try exact match (case-insensitive)
    from sqlalchemy import func
    existing = LkLocation.query.filter(func.lower(LkLocation.display_name) == loc_clean.lower()).first()
    if existing:
        return existing.id
        
    # Create new with timezone resolution
    detected_tz = find_iana_timezone(loc_clean)
    new_loc = LkLocation(
        display_name=loc_clean,
        timezone=detected_tz,
        created_at=datetime.utcnow()
    )
    db.session.add(new_loc)
    db.session.flush() # flush to get the ID
    return new_loc.id

def save_or_update_expert_profile(data: dict, project_id: int = None) -> Expert:
    """
    Master function to save or update an expert profile with intelligent merging.
    data structure expected:
    {
        'linkedin_url': str,
        'first_name': str,
        'last_name': str,
        'full_name': str,
        'headline': str,
        'location': str,
        'summary': str,
        'summary': str,
        'experiences': [{'title': str, 'company': str, 'description': str, 'location': str, 'starts_at': dict, 'ends_at': dict}],
        'skills': [str],
        'education': [{'school': str, 'degree': str, 'field': str, 'starts_at': dict, 'ends_at': dict}],
        'email': str,
        'phone': str
    }
    """
    raw_url = data.get('linkedin_url')
    if not raw_url:
        print("[EXPERT SERVICE ERROR] No LinkedIn URL provided.")
        return None

    norm_url = normalize_linkedin_url(raw_url)
    
    # 1. Find existing expert
    expert = None
    # We look for ANY expert that normalizes to this URL
    all_experts = Expert.query.all()
    for e in all_experts:
        if normalize_linkedin_url(e.linkedin_url) == norm_url:
            expert = e
            break
    if not expert:
        # Resolve location
        loc_id = _get_or_create_location(data.get('location'))
        
        # Create new
        print(f"[EXPERT SERVICE] Creating new expert: {data.get('full_name') or 'N/A'}")
        expert = Expert(
            expert_id=_generate_expert_id(),
            first_name=data.get('first_name') or data.get('full_name', 'LinkedIn').split(' ')[0],
            last_name=" ".join(data.get('full_name', '').split(' ')[1:]) if not data.get('last_name') else data.get('last_name'),
            linkedin_url=raw_url,
            title_headline=data.get('headline')[:500] if data.get('headline') else None,
            bio=data.get('summary') if data.get('summary') else None,
            education=[{
                'institution': e.get('schoolName') or e.get('university') or e.get('school') or 'N/A',
                'degree': e.get('degree') or e.get('degreeName') or 'N/A',
                'field': e.get('fieldOfStudy') or e.get('field_of_study') or '',
                'start_year': (e.get('start') or e.get('starts_at') or {}).get('year') if isinstance(e.get('start') or e.get('starts_at'), dict) else None,
                'end_year': (e.get('end') or e.get('ends_at') or {}).get('year') if isinstance(e.get('end') or e.get('ends_at'), dict) else None
            } for e in (data.get('education') or []) if isinstance(e, dict)],
            primary_email=data.get('email')[:255] if data.get('email') else None,
            primary_phone=data.get('phone')[:50] if data.get('phone') else None,
            company_role_id=_match_company_role(data.get('headline')),
            location_id=loc_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.session.add(expert)
        db.session.flush()
    else:
        # Update existing (Merge Logic)
        print(f"[EXPERT SERVICE] Updating existing expert: {expert.full_name} ({expert.expert_id})")
        
        # Resolve location
        loc_id = _get_or_create_location(data.get('location'))
        
        # Scalar fields - update if present in new data
        if data.get('headline'): expert.title_headline = data.get('headline')[:500]
        if data.get('summary'): expert.bio = data.get('summary')
        if loc_id: expert.location_id = loc_id
        
        # Format Education for JSONB
        raw_edu = data.get('education') or []
        formatted_edu = []
        for edu in raw_edu:
            if not isinstance(edu, dict): continue
            start = edu.get('start') or edu.get('starts_at') or {}
            end = edu.get('end') or edu.get('ends_at') or {}
            formatted_edu.append({
                'institution': edu.get('schoolName') or edu.get('university') or edu.get('school') or 'N/A',
                'degree': edu.get('degree') or edu.get('degreeName') or 'N/A',
                'field': edu.get('fieldOfStudy') or edu.get('field_of_study') or '',
                'start_year': start.get('year') if isinstance(start, dict) else None,
                'end_year': end.get('year') if isinstance(end, dict) else None
            })
        if formatted_edu: expert.education = formatted_edu
        
        # Contact Protection - only set if currently empty
        if not expert.primary_email and data.get('email'):
            expert.primary_email = data.get('email')[:255]
        if not expert.primary_phone and data.get('phone'):
            expert.primary_phone = data.get('phone')[:50]
            
        # Update Role and Timezone
        if data.get('headline') and not expert.company_role_id:
            expert.company_role_id = _match_company_role(data.get('headline'))
            


        expert.updated_at = datetime.utcnow()

    # 2. Merge Skills (ExpertStrength)
    new_skills = data.get('skills') or []
    existing_skills = {s.topic_name.lower().strip() for s in expert.strengths}
    
    for skill in new_skills:
        clean_skill = _safe_strip(skill)
        if clean_skill and clean_skill.lower() not in existing_skills:
            db.session.add(ExpertStrength(expert_id=expert.id, topic_name=clean_skill))
            existing_skills.add(clean_skill.lower())

    # 3. Merge Experiences (ExpertExperience)
    new_exps = data.get('experiences') or []
    # Key for comparison: (company_name, role_title)
    existing_exps = {(e.company_name.lower().strip(), e.role_title.lower().strip()) for e in expert.experiences}
    
    for exp in new_exps:
        if not isinstance(exp, dict): continue
        title = _safe_strip(exp.get('jobTitle') or exp.get('title') or exp.get('role') or exp.get('position') or 'N/A')
        company = _safe_strip(exp.get('companyName') or exp.get('company') or exp.get('organization_name') or 'N/A')
        
        # Date extraction (handle nested start/end objects)
        start_year = exp.get('start_year')
        start_obj = exp.get('start') or exp.get('starts_at')
        if not start_year and isinstance(start_obj, dict):
            start_year = start_obj.get('year')
        elif not start_year and exp.get('duration'):
            import re
            years = re.findall(r'\d{4}', exp['duration'])
            if years: start_year = int(years[0])
        
        end_year = exp.get('end_year')
        end_obj = exp.get('end') or exp.get('ends_at')
        if not end_year and isinstance(end_obj, dict):
            end_year = end_obj.get('year')
            # Handle "0" as Present
            if end_year == 0: end_year = None
        elif not end_year and exp.get('duration'):
            import re
            years = re.findall(r'\d{4}', exp['duration'])
            if len(years) > 1: end_year = int(years[1])
            
        if (company.lower(), title.lower()) not in existing_exps:
            # Add description if available
            desc = exp.get('jobDescription') or exp.get('description') or exp.get('summary')
            
            db.session.add(ExpertExperience(
                expert_id=expert.id,
                company_name=company[:255],
                role_title=title[:255],
                start_year=start_year,
                end_year=end_year
            ))
            existing_exps.add((company.lower(), title.lower()))

    # 4. Project Mapping
    if project_id:
        mapping = ProjectExpert.query.filter_by(project_id=project_id, expert_id=expert.id).first()
        if not mapping:
            db.session.add(ProjectExpert(project_id=project_id, expert_id=expert.id, stage='Leads'))
        
        # Also update the project's leads_expert_ids list (JSONB)
        project = Project.query.get(project_id)
        if project:
            leads = list(project.leads_expert_ids or [])
            if expert.id not in leads:
                leads.append(expert.id)
                project.leads_expert_ids = leads

    db.session.commit()
    return expert

def save_to_staging(project_id: int, basic_details: dict) -> bool:
    """
    Saves basic expert search results to the staging table.
    Ensures no duplicates by LinkedIn URL within the same project.
    """
    try:
        url = basic_details.get('url') or basic_details.get('linkedin_url')
        if not url: return False
        
        # Check if already in staging for this project
        existing = StagingExpertEnhancement.query.filter_by(project_id=project_id).all()
        for e in existing:
            if normalize_linkedin_url(e.basic_details.get('url') or e.basic_details.get('linkedin_url')) == normalize_linkedin_url(url):
                return True # Already exists
                
        # Also check if already in main experts table
        existing_expert = Expert.query.all()
        for e in existing_expert:
            if normalize_linkedin_url(e.linkedin_url) == normalize_linkedin_url(url):
                # Expert is already enriched and in main table, skip staging
                return True

        new_staging = StagingExpertEnhancement(
            project_id=project_id,
            basic_details=basic_details
        )
        db.session.add(new_staging)
        db.session.commit()
        return True
    except Exception as e:
        print(f"[EXPERT SERVICE ERROR] save_to_staging: {e}")
        db.session.rollback()
        return False

def remove_from_staging(project_id: int, linkedin_url: str) -> bool:
    """
    Removes an expert from the staging table once they have been successfully enriched.
    """
    try:
        if not linkedin_url: return False
        norm_url = normalize_linkedin_url(linkedin_url)
        
        # Find all staging records for this project
        staged = StagingExpertEnhancement.query.filter_by(project_id=project_id).all()
        for s in staged:
            staged_url = s.basic_details.get('url') or s.basic_details.get('linkedin_url')
            if staged_url and normalize_linkedin_url(staged_url) == norm_url:
                db.session.delete(s)
                db.session.commit()
                print(f"[EXPERT SERVICE] Removed {linkedin_url} from staging.")
                return True
        return False
    except Exception as e:
        print(f"[EXPERT SERVICE ERROR] remove_from_staging: {e}")
        db.session.rollback()
        return False
