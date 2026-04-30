import os
import requests
import json
from dotenv import load_dotenv

def get_prospeo_contact(linkedin_url):
    """
    Retrieve contact info using Prospeo's Enrich Person API.
    """
    # Determine the path to flask.env
    current_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(os.path.dirname(current_dir), 'flask.env')
    
    load_dotenv(env_path)
    
    api_key = os.getenv('PROSPEO_API_KEY')
    if not api_key:
        print(f"Error: PROSPEO_API_KEY is not set in {env_path}")
        return

    print(f"1. Requesting Prospeo enrichment for: {linkedin_url}")
    
    url = "https://api.prospeo.io/enrich-person"
    
    payload = {
        "data": {
            "linkedin_url": linkedin_url
        },
        "enrich_mobile": True
    }
    
    headers = {
        "X-KEY": api_key,
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success"):
                person = data.get("data", {}).get("person", {})
                
                email_obj = person.get('email', {})
                email = email_obj.get('email')
                
                # If email not found by URL, try fallback with Name + Domain
                if not email:
                    print("\n[!] Email not found by LinkedIn URL. Trying fallback (Name + Domain)...")
                    first_name = person.get('first_name')
                    last_name = person.get('last_name')
                    company = data.get('company', {})
                    domain = company.get('domain') or company.get('website')
                    
                    if first_name and last_name and domain:
                        fallback_payload = {
                            "data": {
                                "first_name": first_name,
                                "last_name": last_name,
                                "company_website": domain
                            },
                            "enrich_mobile": True
                        }
                        f_resp = requests.post(url, json=fallback_payload, headers=headers)
                        if f_resp.status_code == 200:
                            f_data = f_resp.json()
                            if f_data.get("success"):
                                person = f_data.get("data", {}).get("person", {})
                                email_obj = person.get('email', {})
                                email = email_obj.get('email')
                                if email:
                                    print("  ✅ Fallback Success!")
                
                print("\n==================================================")
                print(f"SUCCESS: Found Expert : {person.get('full_name')}")
                
                # Emails
                print("\nEmails:")
                if email:
                    print(f"  ✅ {email} ({email_obj.get('status', 'unknown')})")
                else:
                    print("  - None found")
                
                # Phones
                print("\nPhones:")
                mobile = person.get('mobile_number')
                phone = person.get('phone_number')
                
                if mobile:
                    print(f"  📞 {mobile} (Mobile)")
                if phone:
                    print(f"  📞 {phone} (Landline/Other)")
                
                if not mobile and not phone:
                    print("  - None found")
                
                print("==================================================")
            else:
                print(f"\n[!] Prospeo Request Failed.")
                print(f"Response Body: {json.dumps(data, indent=2)}")
                
        elif response.status_code == 401:
            print(f"\n[!] Error 401: Invalid API Key. Please check your PROSPEO_API_KEY.")
        elif response.status_code == 403:
            print(f"\n[!] Error 403: Out of credits or forbidden.")
        else:
            print(f"\n[!] Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"Exception occurred: {str(e)}")

if __name__ == "__main__":
    # Test Data
    test_url = "https://www.linkedin.com/in/deepa-murugan0712/"
    
    get_prospeo_contact(test_url)

    
