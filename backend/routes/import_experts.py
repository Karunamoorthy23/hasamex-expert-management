import os
import pandas as pd
from flask import Blueprint, request, jsonify, send_file
from io import BytesIO
from extensions import db
from models import Expert
from datetime import datetime
import re
from decimal import Decimal
from sqlalchemy import or_

import_experts_bp = Blueprint('import_experts', __name__, url_prefix='/api/v1/import')

EXCEL_COLUMNS_MAPPING = {
    'Salutation': 'salutation',
    'Expert ID': 'expert_id',
    'First Name': 'first_name',
    'Last Name': 'last_name',
    'Primary Email 1': 'primary_email',
    'Secondary Email ': 'secondary_email',
    'Primary Phone 1': 'primary_phone',
    'Secondary Phone 1': 'secondary_phone',
    'LinkedIn URL': 'linkedin_url',
    'Location': 'location',
    'Timezone': 'timezone',
    'Region': 'region',
    'Current Employment Status': 'current_employment_status',
    'Seniority': 'seniority',
    'Years of Experience': 'years_of_experience',
    'Title / Headline': 'title_headline',
    'BIO': 'bio',
    'Employment History': 'employment_history',
    'Primary Sector': 'primary_sector',
    'Company Role': 'company_role',
    'Expert Function': 'expert_function',
    'Strength Topics': 'strength_topics',
    'Currency': 'currency',
    'Hourly Rate': 'hourly_rate',
    'HCMS Classification': 'hcms_classification',
    'Expert Status': 'expert_status',
    'Link to Profile PDF': 'profile_pdf_url',
    'Total Calls Completed': 'total_calls_completed',
    'Project ID Added To': 'project_id_added_to',
    'Payment Details': 'payment_details',
    'Events Invited To': 'events_invited_to',
    'Notes': 'notes'
}

REQUIRED_COLUMNS = ['First Name', 'Last Name', 'Primary Email 1']

@import_experts_bp.route('/template', methods=['GET'])
def download_template():
    """
    GET /api/v1/import/template
    Generates and returns an Excel template for expert import.
    """
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
    
    sample_data = [
        {
            'S.No': 1,
            'Salutation': 'Mr.',
            'Expert ID': 'EX-00001',
            'First Name': 'John',
            'Last Name': 'Doe',
            'Primary Email 1': 'john.doe@example.com',
            'Secondary Email ': 'j.doe@work.com',
            'Primary Phone 1': '+65 9123 4567',
            'Secondary Phone 1': '+65 8123 4567',
            'LinkedIn URL': 'https://linkedin.com/in/johndoe',
            'Location': 'Singapore',
            'Timezone': 'GMT+8',
            'Region': 'APAC',
            'Current Employment Status': 'Employed',
            'Seniority': 'Senior',
            'Years of Experience': 12,
            'Title / Headline': 'Senior Director of Technology',
            'BIO': 'Expert in semiconductors and supply chain management with over 10 years experience.',
            'Employment History': 'TechCorp (2015-Present), SemiSystems (2010-2015)',
            'Primary Sector': 'TMT',
            'Company Role': 'Director',
            'Expert Function': 'Engineering',
            'Strength Topics': 'Semiconductors, Supply Chain, Logistics',
            'Currency': 'USD',
            'Hourly Rate': 350.00,
            'HCMS Classification': 'A',
            'Expert Status': 'Lead',
            'Last Modified': datetime.now().strftime('%Y-%m-%d'),
            'Project ID Added To': 'PRJ-101',
            'Total Calls Completed': 5,
            'Payment Details': 'Bank Transfer',
            'Link to Profile PDF': 'https://storage.example.com/profiles/johndoe.pdf',
            'Events Invited To': 'Tech Summit 2024',
            'Notes': 'Highly recommended for TMT projects.'
        }
    ]
    
    df = pd.DataFrame(sample_data, columns=columns)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Experts')
    
    output.seek(0)
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='expert_import_template.xlsx'
    )

@import_experts_bp.route('/preview', methods=['POST'])
def preview_import():
    """
    POST /api/v1/import/preview
    Uploads an Excel file and returns a categorization of records.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        return jsonify({'error': 'Invalid file format. Only .xlsx and .xls are allowed.'}), 400

    try:
        df = pd.read_excel(file)
        
        # Validate required columns
        missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        if missing_columns:
            return jsonify({'error': f'Missing required columns: {", ".join(missing_columns)}'}), 400

        preview_data = []
        
        # Batch fetch existing experts to avoid N+1 queries
        emails = df['Primary Email 1'].dropna().unique().tolist()
        linkedin_urls = df['LinkedIn URL'].dropna().unique().tolist() if 'LinkedIn URL' in df.columns else []
        
        # Build lookups for existing records
        existing_by_email = {e.primary_email: e for e in Expert.query.filter(Expert.primary_email.in_(emails)).all()}
        existing_by_linkedin = {e.linkedin_url: e for e in Expert.query.filter(Expert.linkedin_url.in_(linkedin_urls)).all()} if linkedin_urls else {}

        for index, row in df.iterrows():
            # Basic validation
            if pd.isna(row.get('First Name')) or pd.isna(row.get('Last Name')) or pd.isna(row.get('Primary Email 1')):
                continue

            row_data = {k: (None if pd.isna(v) else v) for k, v in row.to_dict().items()}
            email = row_data.get('Primary Email 1')
            linkedin = row_data.get('LinkedIn URL')
            
            existing = existing_by_email.get(email) or existing_by_linkedin.get(linkedin)
            
            status = 'New'
            if existing:
                # Check for updates - simple comparison
                is_exact = True
                differences = {}
                
                def normalize_for_comparison(v, is_numeric=False):
                    if pd.isna(v) or v is None:
                        return None
                    
                    # Handle Excel error strings
                    if isinstance(v, str) and v.startswith('#') and v.endswith('!'):
                        return None # Treat as empty/invalid

                    if is_numeric:
                        try:
                            # Use float for comparison, but handle 0 vs None if necessary
                            return float(v)
                        except (ValueError, TypeError):
                            return v # Fallback to original if not numeric

                    if isinstance(v, str):
                        # 1. Normalize line endings and whitespace
                        v = v.replace('\r\n', '\n').replace('\r', '\n')
                        # 2. Split by lines, strip each line, then join back
                        lines = [line.strip() for line in v.split('\n')]
                        v = '\n'.join(lines).strip()
                        # 3. Collapse multiple internal spaces to single space for robust comparison
                        v = re.sub(r' +', ' ', v)
                        if not v:
                            return None
                    
                    # Convert Decimals to floats for comparison
                    if isinstance(v, Decimal):
                        return float(v)
                        
                    return v

                for excel_col, model_attr in EXCEL_COLUMNS_MAPPING.items():
                    if excel_col in row_data:
                        val = row_data[excel_col]
                        existing_val = getattr(existing, model_attr)
                        
                        is_num_field = (model_attr in ['hourly_rate', 'total_calls_completed', 'years_of_experience'] or 
                                       'phone' in excel_col.lower())
                        
                        norm_val = normalize_for_comparison(val, is_num_field)
                        norm_existing = normalize_for_comparison(existing_val, is_num_field)

                        # Special case: Total Calls Completed 0 == None
                        if model_attr == 'total_calls_completed':
                            if (norm_val == 0 or norm_val is None) and (norm_existing == 0 or norm_existing is None):
                                norm_val = norm_existing = "MATCH"

                        if norm_val != norm_existing:
                            is_exact = False
                            # Format for display
                            disp_old = "—" if existing_val is None else str(existing_val)
                            disp_new = "—" if val is None else str(val)
                            differences[excel_col] = {'old': disp_old, 'new': disp_new}
                
                if is_exact:
                    status = 'Duplicate'
                else:
                    status = 'Update'
            
            preview_data.append({
                'id': index, # unique for frontend UI
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
    """
    POST /api/v1/import/confirm
    Finalizes the import process by inserting/updating records.
    """
    data = request.get_json(silent=True)
    if not data or 'records' not in data:
        return jsonify({'error': 'Invalid request data'}), 400

    records = data['records']
    results = {'inserted': 0, 'updated': 0, 'ignored': 0, 'errors': []}

    try:
        # Pre-calculate starting expert ID number
        last = db.session.query(Expert.expert_id).order_by(Expert.expert_id.desc()).first()
        start_num = 1
        if last and last[0]:
            try:
                start_num = int(last[0].split('-')[1]) + 1
            except (IndexError, ValueError):
                pass
        
        id_counter = start_num

        def _generate_expert_id():
            nonlocal id_counter
            new_id = f'EX-{id_counter:05d}'
            id_counter += 1
            return new_id

        for item in records:
            status = item.get('status')
            data_row = item.get('data')
            existing_id = item.get('existing_id')

            if status == 'Duplicate':
                results['ignored'] += 1
                continue

            try:
                if status == 'New':
                    expert = Expert(expert_id=_generate_expert_id())
                    db.session.add(expert)
                    results['inserted'] += 1
                else: # Update
                    expert = Expert.query.get(existing_id)
                    if not expert:
                        results['errors'].append(f"Expert {existing_id} not found for update")
                        continue
                    results['updated'] += 1

                for excel_col, model_attr in EXCEL_COLUMNS_MAPPING.items():
                    # NEVER overwrite expert_id from Excel; it's system-managed
                    if model_attr == 'expert_id':
                        continue

                    if excel_col in data_row:
                        val = data_row[excel_col]
                        if pd.isna(val) or val == 'nan': val = None
                        if isinstance(val, str): val = val.strip() or None
                        
                        # Numeric fields conversion
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
                
            except Exception as e:
                db.session.rollback()
                results['errors'].append(f"Error preparing row '{data_row.get('First Name', '')}': {str(e)}")
                continue

        try:
            db.session.commit()
            return jsonify({'message': 'Import completed', 'results': results})
        except Exception as e:
            db.session.rollback()
            # Try to identify duplicate key error for better message
            err_msg = str(e)
            if 'unique constraint "experts_expert_id_key"' in err_msg.lower():
                err_msg = "Conflict: One or more generated Expert IDs already exist. Please try again."
            elif 'unique constraint "experts_primary_email_key"' in err_msg.lower():
                err_msg = "Conflict: One or more Email addresses already exist in the database."
            elif 'unique constraint "experts_linkedin_url_key"' in err_msg.lower():
                err_msg = "Conflict: One or more LinkedIn URLs already exist in the database."
            
            return jsonify({'error': f'Import failed: {err_msg}'}), 500

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Import process failed: {str(e)}'}), 500
