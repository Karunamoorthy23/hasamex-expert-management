import os
import pandas as pd
from flask import Blueprint, request, jsonify, send_file
from io import BytesIO
from extensions import db
from models import *
from datetime import datetime
import re
from decimal import Decimal
from sqlalchemy import or_

import_experts_bp = Blueprint('import_experts', __name__, url_prefix='/api/v1/import')

EXCEL_COLUMNS_MAPPING = {
    'First Name': 'first_name',
    'Last Name': 'last_name',
    'Primary Email 1': 'primary_email',
    'Secondary Email ': 'secondary_email',
    'Primary Phone 1': 'primary_phone',
    'Secondary Phone 1': 'secondary_phone',
    'LinkedIn URL': 'linkedin_url',
    'Years of Experience': 'years_of_experience',
    'Title / Headline': 'title_headline',
    'BIO': 'bio',
    'Hourly Rate': 'hourly_rate',
    'Link to Profile PDF': 'profile_pdf_url',
    'Total Calls Completed': 'total_calls_completed',
    'Project ID Added To': 'project_id_added_to',
    'Payment Details': 'payment_details',
    'Events Invited To': 'events_invited_to',
    'Notes': 'notes'
}

LOOKUP_MAPPING = {
    'Salutation': (LkSalutation, 'salutation_id'),
    'Region': (LkRegion, 'region_id'),
    'Current Employment Status': (LkEmploymentStatus, 'current_employment_status_id'),
    'Seniority': (LkSeniority, 'seniority_id'),
    'Primary Sector': (LkPrimarySector, 'primary_sector_id'),
    'Company Role': (LkCompanyRole, 'company_role_id'),
    'Expert Function': (LkExpertFunction, 'expert_function_id'),
    'Currency': (LkCurrency, 'currency_id'),
    'HCMS Classification': (LkHcmsClassification, 'hcms_classification_id'),
    'Expert Status': (LkExpertStatus, 'expert_status_id'),
}

REQUIRED_COLUMNS = ['First Name', 'Last Name', 'Primary Email 1']


@import_experts_bp.route('/template', methods=['GET'])
def download_template():
    columns = [
        'S.No', 'Salutation', 'Expert ID', 'First Name', 'Last Name', 'Primary Email 1',
        'Secondary Email ', 'Primary Phone 1', 'Secondary Phone 1', 'LinkedIn URL',
        'Location', 'Timezone', 'Region', 'Current Employment Status', 'Seniority',
        'Years of Experience', 'Title / Headline', 'BIO', 'Employment History',
        'Primary Sector', 'Company Role', 'Expert Function', 'Strength Topics',
        'Currency', 'Hourly Rate', 'HCMS Classification', 'Expert Status',
        'Last Modified', 'Project ID Added To', 'Total Calls Completed',
        'Payment Details', 'Link to Profile PDF', 'Events Invited To', 'Notes'
    ]
    
    sample_data = [{
        'S.No': 1, 'Salutation': 'Mr.', 'Expert ID': 'EX-00001', 'First Name': 'John', 'Last Name': 'Doe',
        'Primary Email 1': 'john.doe@example.com', 'Secondary Email ': 'j.doe@work.com',
        'Primary Phone 1': '+65 9123 4567', 'Secondary Phone 1': '+65 8123 4567',
        'LinkedIn URL': 'https://linkedin.com/in/johndoe', 'Location': 'Singapore', 'Timezone': 'GMT+8',
        'Region': 'APAC', 'Current Employment Status': 'Currently Employed', 'Seniority': 'Senior Manager',
        'Years of Experience': 12, 'Title / Headline': 'Senior Director of Technology',
        'BIO': 'Expert in semiconductors and supply chain management.',
        'Employment History': 'Director, TechCorp (2015-Present)\nManager, SemiSystems (2010-2015)',
        'Primary Sector': 'TMT', 'Company Role': 'Technology Provider', 'Expert Function': 'Engineering',
        'Strength Topics': 'Semiconductors\nSupply Chain\nLogistics', 'Currency': 'USD',
        'Hourly Rate': 350.00, 'HCMS Classification': 'Premium', 'Expert Status': 'Lead',
        'Last Modified': datetime.now().strftime('%Y-%m-%d'), 'Project ID Added To': 'PRJ-101',
        'Total Calls Completed': 5, 'Payment Details': 'Bank Transfer',
        'Link to Profile PDF': 'https://storage.example.com/profiles/johndoe.pdf',
        'Events Invited To': 'Tech Summit 2024', 'Notes': 'Highly recommended.'
    }]
    
    df = pd.DataFrame(sample_data, columns=columns)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Experts')
    output.seek(0)
    
    return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', as_attachment=True, download_name='expert_import_template.xlsx')

@import_experts_bp.route('/preview', methods=['POST'])
def preview_import():
    if 'file' not in request.files: return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if not file.filename.endswith(('.xlsx', '.xls')): return jsonify({'error': 'Invalid format'}), 400

    try:
        df = pd.read_excel(file)
        missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        if missing_columns: return jsonify({'error': f'Missing columns: {", ".join(missing_columns)}'}), 400

        preview_data = []
        emails = df['Primary Email 1'].dropna().unique().tolist()
        linkedin_urls = df['LinkedIn URL'].dropna().unique().tolist() if 'LinkedIn URL' in df.columns else []
        
        existing_by_email = {e.primary_email: e for e in Expert.query.filter(Expert.primary_email.in_(emails)).all()}
        existing_by_linkedin = {e.linkedin_url: e for e in Expert.query.filter(Expert.linkedin_url.in_(linkedin_urls)).all()} if linkedin_urls else {}

        for index, row in df.iterrows():
            if pd.isna(row.get('First Name')) or pd.isna(row.get('Last Name')) or pd.isna(row.get('Primary Email 1')):
                continue

            row_data = {k: (None if pd.isna(v) else v) for k, v in row.to_dict().items()}
            email = row_data.get('Primary Email 1')
            linkedin = row_data.get('LinkedIn URL')
            
            by_email_link = existing_by_email.get(email) or existing_by_linkedin.get(linkedin)

            existing = by_email_link
            
            status = 'New'
            if existing:
                is_exact = True
                differences = {}
                
                def normalize_for_comparison(v, is_numeric=False, is_lookup=False):
                    if pd.isna(v) or v is None:
                        return None
                    if isinstance(v, str) and v.startswith('#') and v.endswith('!'):
                        return None
                    if is_numeric:
                        try:
                            return float(v)
                        except (ValueError, TypeError):
                            return v
                    if isinstance(v, str):
                        v = v.replace('\r\n', '\n').replace('\r', '\n')
                        lines = [line.strip() for line in v.split('\n')]
                        v = '\n'.join(lines).strip()
                        v = re.sub(r' +', ' ', v)
                        if is_lookup:
                            v = v.lower().replace('.', '').strip()
                        if not v:
                            return None
                    if isinstance(v, Decimal):
                        return float(v)
                    return v

                PREVIEW_COLUMN_MAPPING = {
                    'Salutation': 'salutation', 'First Name': 'first_name',
                    'Last Name': 'last_name', 'Primary Email 1': 'primary_email', 'Secondary Email ': 'secondary_email',
                    'Primary Phone 1': 'primary_phone', 'Secondary Phone 1': 'secondary_phone', 'LinkedIn URL': 'linkedin_url',
                    'Location': 'location', 'Timezone': 'timezone', 'Region': 'region',
                    'Current Employment Status': 'current_employment_status', 'Seniority': 'seniority',
                    'Years of Experience': 'years_of_experience', 'Title / Headline': 'title_headline',
                    'BIO': 'bio', 'Employment History': 'employment_history', 'Primary Sector': 'primary_sector',
                    'Company Role': 'company_role', 'Expert Function': 'expert_function', 'Strength Topics': 'strength_topics',
                    'Currency': 'currency', 'Hourly Rate': 'hourly_rate', 'HCMS Classification': 'hcms_classification',
                    'Expert Status': 'expert_status', 'Link to Profile PDF': 'profile_pdf_url',
                    'Total Calls Completed': 'total_calls_completed', 'Project ID Added To': 'project_id_added_to',
                    'Payment Details': 'payment_details', 'Events Invited To': 'events_invited_to', 'Notes': 'notes'
                }

                lookup_attrs = ['salutation', 'region', 'current_employment_status', 'seniority', 'primary_sector', 'company_role', 'expert_function', 'currency', 'hcms_classification', 'expert_status']

                for excel_col, model_attr in PREVIEW_COLUMN_MAPPING.items():
                    if excel_col in row_data:
                        val = row_data[excel_col]
                        existing_val = getattr(existing, model_attr, None)
                        
                        is_num_field = (model_attr in ['hourly_rate', 'total_calls_completed', 'years_of_experience'] or 'phone' in excel_col.lower())
                        is_lookup = (model_attr in lookup_attrs)
                        
                        norm_val = normalize_for_comparison(val, is_num_field, is_lookup)
                        norm_existing = normalize_for_comparison(existing_val, is_num_field, is_lookup)

                        if model_attr == 'total_calls_completed':
                            if (norm_val == 0 or norm_val is None) and (norm_existing == 0 or norm_existing is None):
                                norm_val = norm_existing = "MATCH"

                        if model_attr == 'employment_history':
                            if isinstance(norm_val, str):
                                lines = norm_val.replace(';', '\n').split('\n')
                                normalized_lines = []
                                for line in lines:
                                    line = line.strip()
                                    if not line: continue
                                    year_match = re.search(r'\((.*?)\)', line)
                                    start_year, end_year = '??', 'Present'
                                    if year_match:
                                        years_str = year_match.group(1).replace('–', '-').replace('—', '-')
                                        years = years_str.split('-')
                                        start_year = years[0][:4] if len(years) > 0 and years[0][:4].isdigit() else '??'
                                        end_year = years[1][:4] if len(years) > 1 and years[1][:4].isdigit() else 'Present'
                                    
                                    job_info = re.sub(r'\s*\(.*?\)\s*', '', line).strip()
                                    job_parts = job_info.split(',', 1)
                                    role = job_parts[0].strip() if len(job_parts) > 0 else "Unknown Role"
                                    company = job_parts[1].strip() if len(job_parts) > 1 else "Unknown Company"
                                    
                                    normalized_lines.append(f"{role}, {company} ({start_year}-{end_year})".lower())
                                norm_val = "\n".join(sorted(normalized_lines))
                                
                            if isinstance(norm_existing, str):
                                norm_existing = "\n".join(sorted([s.lower().strip() for s in norm_existing.split('\n') if s.strip()]))

                        if model_attr == 'strength_topics':
                            if isinstance(norm_val, str):
                                norm_val = "\n".join(sorted([s.replace('•', '').replace('-', '').strip().lower() for s in norm_val.replace(';', '\n').split('\n') if s.strip()]))
                            if isinstance(norm_existing, str):
                                norm_existing = "\n".join(sorted([s.strip().lower() for s in norm_existing.split('\n') if s.strip()]))

                        if norm_val != norm_existing:
                            is_exact = False
                            disp_old = "—" if existing_val is None else str(existing_val)
                            disp_new = "—" if val is None else str(val)
                            differences[excel_col] = {'old': disp_old, 'new': disp_new}
                
                if is_exact:
                    status = 'Duplicate'
                else:
                    status = 'Update'
            
            preview_data.append({
                'id': index,
                'status': status,
                'data': row_data,
                'existing_id': existing.id if existing else None,
                'differences': differences if status == 'Update' else None
            })

        return jsonify({'data': preview_data})
    except Exception as e:
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500

@import_experts_bp.route('/confirm', methods=['POST'])
def confirm_import():
    data = request.get_json(silent=True)
    if not data or 'records' not in data: return jsonify({'error': 'Invalid request data'}), 400

    records = data['records']
    results = {'inserted': 0, 'updated': 0, 'ignored': 0, 'errors': []}

    try:
        from sqlalchemy import text
        res = db.session.execute(text("SELECT COALESCE(MAX(CAST(SUBSTRING(expert_id FROM '\\\\d+$') AS INTEGER)), 0) FROM experts WHERE expert_id ~ '^EX-\\\\d+$'"))
        current_max_id = res.scalar() or 0
        # Pre-load all lookups locally into a dictionary structure to prevent thousands of small DB queries
        lookups_cache = {}
        for col_name, (model_class, _) in LOOKUP_MAPPING.items():
            lookups_cache[col_name] = {item.name: item.id for item in model_class.query.all()}

        for item in records:
            status = item.get('status')
            data_row = item.get('data')
            existing_id = item.get('existing_id')

            try:
                if status == 'New':
                    while True:
                        current_max_id += 1
                        eid = f"EX-{current_max_id:05d}"
                        if not Expert.query.filter_by(expert_id=eid).first():
                            break
                    expert = Expert(expert_id=eid)
                    db.session.add(expert)
                else:
                    expert = Expert.query.get(existing_id)
                
                # Assign Direct Columns
                for excel_col, model_attr in EXCEL_COLUMNS_MAPPING.items():
                    if excel_col in data_row:
                        val = data_row[excel_col]
                        if pd.isna(val) or val == 'nan': val = None
                        if isinstance(val, str): val = val.strip() or None
                        
                        if model_attr == 'hourly_rate' and val is not None:
                            try: val = float(val)
                            except: val = None
                        if model_attr == 'total_calls_completed' and val is not None:
                            try: val = int(val)
                            except: val = 0
                        if model_attr == 'years_of_experience' and val is not None:
                            try: val = int(val)
                            except: val = None

                        setattr(expert, model_attr, val)

                # Assign Foreign Keys via Lookup Cache
                for excel_col, (model_class, fk_col) in LOOKUP_MAPPING.items():
                    val = data_row.get(excel_col)
                    if pd.isna(val) or val == 'nan': val = None
                    if isinstance(val, str): val = val.strip()

                    if val:
                        val_lower = val.lower().replace('.', '').strip()
                        found_id = None
                        for lk_name, lk_id in lookups_cache[excel_col].items():
                            if lk_name.lower().replace('.', '').strip() == val_lower:
                                found_id = lk_id
                                break
                        
                        if not found_id:
                            new_lk = model_class(name=val)
                            db.session.add(new_lk)
                            db.session.flush()
                            found_id = new_lk.id
                            lookups_cache[excel_col][val] = found_id
                            
                        setattr(expert, fk_col, found_id)
                    else:
                        setattr(expert, fk_col, None)

                db.session.flush() # So we can get the ID for relations if New

                # Process Expert Location
                loc_val = data_row.get('Location')
                tz_val = data_row.get('Timezone')
                if pd.isna(loc_val) or str(loc_val) == 'nan': loc_val = None
                if isinstance(loc_val, str): loc_val = loc_val.strip()
                if pd.isna(tz_val) or str(tz_val) == 'nan': tz_val = None
                if isinstance(tz_val, str): tz_val = tz_val.strip()

                if loc_val:
                    lk_loc = LkLocation.query.filter(LkLocation.display_name.ilike(loc_val)).first()
                    if not lk_loc:
                        lk_loc = LkLocation(display_name=loc_val, timezone=tz_val)
                        db.session.add(lk_loc)
                        db.session.flush()
                    expert.location_id = lk_loc.id
                else:
                    expert.location_id = None

                # Process Expert Strengths (1-to-Many)
                raw_strengths = data_row.get('Strength Topics')
                if raw_strengths and not pd.isna(raw_strengths):
                    # Delete existing if update
                    ExpertStrength.query.filter_by(expert_id=expert.id).delete()
                    
                    topics = raw_strengths.replace(';', '\n').split('\n')
                    for topic in set(topics):
                        clean_topic = topic.replace('•', '').replace('-', '').strip()
                        if clean_topic:
                            db.session.add(ExpertStrength(expert_id=expert.id, topic_name=clean_topic))

                # Process Experiences (1-to-Many)
                raw_history = data_row.get('Employment History')
                if raw_history and not pd.isna(raw_history):
                    # Delete existing if update
                    ExpertExperience.query.filter_by(expert_id=expert.id).delete()
                    
                    history_lines = raw_history.replace(';', '\n').split('\n')
                    for line in history_lines:
                        line = line.strip()
                        if not line: continue
                        
                        year_match = re.search(r'\((.*?)\)', line)
                        start_year, end_year = None, None
                        
                        if year_match:
                            years_str = year_match.group(1).replace('–', '-').replace('—', '-')
                            years = years_str.split('-')
                            start_year = years[0][:4] if len(years) > 0 and years[0][:4].isdigit() else None
                            end_year = years[1][:4] if len(years) > 1 and years[1][:4].isdigit() else None
                            
                        job_info = re.sub(r'\s*\(.*?\)\s*', '', line).strip()
                        job_parts = job_info.split(',', 1)
                        role = job_parts[0].strip() if len(job_parts) > 0 else "Unknown Role"
                        company = job_parts[1].strip() if len(job_parts) > 1 else "Unknown Company"
                        
                        db.session.add(ExpertExperience(
                            expert_id=expert.id, company_name=company, role_title=role,
                            start_year=start_year, end_year=end_year
                        ))

                if status == 'New': results['inserted'] += 1
                else: results['updated'] += 1

            except Exception as e:
                db.session.rollback()
                results['errors'].append(f"Error preparing row '{data_row.get('First Name', '')}': {str(e)}")
                continue

        try:
            db.session.commit()
            return jsonify({'message': 'Import completed', 'results': results})
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Import failed: {str(e)}'}), 500

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Import process failed: {str(e)}'}), 500
