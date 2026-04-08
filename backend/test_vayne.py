import os
import requests
import json
from dotenv import load_dotenv

# Load env from backend/flask.env
load_dotenv(os.path.join(os.path.dirname(__file__), 'flask.env'))

CONTACTOUT_API_KEY = os.getenv('CONTACTOUT_API_KEY', 'Placeholder-ContactOut-Token')
# Official ContactOut LinkedIn Profile API Endpoint
CONTACTOUT_URL = "https://api.contactout.com/v1/people/linkedin"

def enrich_expert_with_contactout(linkedin_url):
    """
    Calls ContactOut API to find email/phone for a LinkedIn profile.
    Documentation: https://api.contactout.com/#linkedin-profile-api
    """
    print(f"\n[CONTACTOUT] Attempting contact discovery for: {linkedin_url}")
    
    # ContactOut uses a GET request with query params
    params = {"url": linkedin_url}
    
    # Auth is usually passed via 'token' header or query param
    headers = {
        "token": CONTACTOUT_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        if "Placeholder" in CONTACTOUT_API_KEY:
            print("[CONTACTOUT] [MOCK] Using Placeholder Key. Simulating success...")
            return {
                "email": "contactout.enriched@professional.com",
                "phone": "+1-202-555-0199",
                "status": "success"
            }

        response = requests.get(CONTACTOUT_URL, params=params, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            profile = data.get('profile', {})
            
            # --- IMPROVED PARSING ---
            # ContactOut often returns 'emails' as a list of objects or addresses
            raw_emails = profile.get('emails', [])
            work_email = profile.get('work_email')
            personal_email = profile.get('personal_email')
            
            # Extract first valid email from various potential fields
            email = None
            if isinstance(work_email, list) and work_email: email = work_email[0]
            elif isinstance(work_email, str): email = work_email
            elif isinstance(personal_email, list) and personal_email: email = personal_email[0]
            elif isinstance(personal_email, str): email = personal_email
            elif raw_emails:
                first = raw_emails[0]
                email = first.get('address') if isinstance(first, dict) else first

            # Phone numbers logic
            raw_phones = profile.get('phone_numbers', []) or profile.get('phones', [])
            phone = None
            if raw_phones:
                first_p = raw_phones[0]
                phone = first_p.get('number') if isinstance(first_p, dict) else first_p

            print(f"[CONTACTOUT] DEBUG: Raw Emails: {raw_emails} | Work: {work_email} | Personal: {personal_email}")
            
            # Check for dummy data returned by trial/free keys
            is_dummy = (email and "example.com" in str(email))
            
            return {
                "email": email,
                "phone": phone,
                "status": "success" if (email or phone) and not is_dummy else "not_found"
            }
        else:
            print(f"[CONTACTOUT] API Error {response.status_code}: {response.text}")
            return None
            
    except Exception as e:
        print(f"[CONTACTOUT] Technical Error: {str(e)}")
        return None

def update_expert_in_db(linkedin_url, email, phone):
    """Updates the expert contact info in the PostgreSQL database."""
    import psycopg2
    
    # Connection details from flask.env
    conn_params = {
        "dbname": os.getenv('DB_NAME', 'hasamex'),
        "user": os.getenv('DB_USER', 'postgres'),
        "password": os.getenv('DB_PASSWORD', '@KM230803postgres'),
        "host": os.getenv('DB_HOST', 'localhost'),
        "port": os.getenv('DB_PORT', '5432')
    }
    
    try:
        conn = psycopg2.connect(**conn_params)
        cur = conn.cursor()
        
        # Update email and phone
        sql = """
            UPDATE experts 
            SET primary_email = %s, primary_phone = %s 
            WHERE linkedin_url = %s
        """
        cur.execute(sql, (email, phone, linkedin_url))
        conn.commit()
        
        if cur.rowcount > 0:
            print(f"[DB] Successfully updated {cur.rowcount} expert(s) for URL: {linkedin_url}")
        else:
            print(f"[DB] No expert found with URL: {linkedin_url}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[DB ERROR] {str(e)}")

if __name__ == "__main__":
    # Test with a known LinkedIn URL
    test_url = "https://in.linkedin.com/in/karkali" 
    contact = enrich_expert_with_contactout(test_url)
    
    if contact and contact['status'] == 'success':
        print(f"[SUCCESS] Found Email: {contact['email']}")
        print(f"[SUCCESS] Found Phone: {contact['phone']}")
        
        # PERSIST TO DATABASE
        update_expert_in_db(test_url, contact['email'], contact['phone'])
    else:
        print("[FAIL] Contact info not found or API error.")
