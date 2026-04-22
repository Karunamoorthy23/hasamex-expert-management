import os
import requests
import json
import time
from dotenv import load_dotenv

def _normalize_li_url(url):
    """Normalize a LinkedIn URL to a standard handle for API comparison."""
    if not url: return ''
    import re
    # Remove query params and trailing slashes
    clean = url.strip().split('?')[0].rstrip('/')
    # Extract the handle part
    handle = re.sub(r'https?://(www\.)?linkedin\.com/in/', '', clean)
    return handle.lower()

def check_credits(api_key):
    """Check remaining API credits from SignalHire."""
    try:
        r = requests.get(
            "https://www.signalhire.com/api/v1/credits",
            headers={"apikey": api_key},
            timeout=10
        )
        if r.status_code == 200:
            return r.json().get('credits', 'unknown')
    except Exception:
        pass
    return 'unknown'

def get_expert_contact(linkedin_url, first_name, last_name, location):
    # Determine the path to flask.env
    current_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(os.path.dirname(current_dir), 'flask.env')
    
    load_dotenv(env_path)
    
    api_key = os.getenv('SIGNALHIRE_API_KEY')
    if not api_key:
        print(f"Error: SIGNALHIRE_API_KEY is not set in {env_path}")
        return

    # -- Credit check FIRST ---------------------------------------
    credits = check_credits(api_key)
    print(f"1. SignalHire API Credits Remaining: {credits}")
    norm_handle = _normalize_li_url(linkedin_url)
    # We will try both the full URL and just the handle (some scrapers prefer one over the other)
    # Based on tests, sometimes the handle alone works better if the full URL is failing.
    
    # Create the temporary webhook
    wh_response = requests.post("https://webhook.site/token")
    if wh_response.status_code not in (200, 201):
        print("Error: Could not generate temporary webhook.", wh_response.text)
        return
    
    wh_token = wh_response.json()["uuid"]
    callback_url = f"https://webhook.site/{wh_token}"

    url = "https://www.signalhire.com/api/v1/candidate/search"
    headers = {
        "Content-Type": "application/json",
        "apikey": api_key
    }
    
    # We'll try the most standard format
    target_url = f"https://linkedin.com/in/{norm_handle}"
    
    payload = {
        "items": [
            {
                "linkedin": target_url,
                "firstName": first_name,
                "lastName": last_name,
                "location": location
            }
        ],
        "callbackUrl": callback_url
    }
    
    print(f"2. Requesting SignalHire enrichment for: {first_name} {last_name}")
    print(f"   Target LinkedIn: {target_url}")
    print("--------------------------------------------------")
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code in (200, 201, 202):
            resp_data = response.json()
            req_id = resp_data.get('requestId')
            print(f"   Request Accepted! Request ID: {req_id}")
            print("   Waiting for callback... (this usually takes 7-15 seconds)")
            
            # Poll webhook.site
            max_attempts = 25
            attempts = 0
            found_data = None
            
            while attempts < max_attempts:
                time.sleep(3)
                attempts += 1
                
                req_resp = requests.get(f"https://webhook.site/token/{wh_token}/requests")
                if req_resp.status_code == 200:
                    requests_data = req_resp.json().get('data', [])
                    if len(requests_data) > 0:
                        # We got a callback!
                        content_str = requests_data[0].get('content', '{}')
                        found_data = json.loads(content_str)
                        
                        # Handle case where it might be a list or a dict
                        if isinstance(found_data, list) and len(found_data) > 0:
                            status = found_data[0].get('status')
                            if status == 'duplicate_query':
                                print(f"   Wait... (status: {status}, retrying search with handle-only format)")
                                # If it's a duplicate query, SignalHire suggests wait or check existing.
                                # Let's just break and show it.
                                break
                            elif status == 'failed':
                                # Don't break yet, maybe another request will come? 
                                # Actually SignalHire usually sends one callback per request.
                                break
                        break
                
                print(f"   Waiting... ({attempts * 3}s)")

            if found_data is not None:
                print("\n3. Status Received!")
                
                # Check for "duplicate_query" specifically
                if isinstance(found_data, list) and len(found_data) > 0:
                    status = found_data[0].get('status')
                    if status == 'duplicate_query':
                        print("\n[INFO] SignalHire says 'duplicate_query'.")
                        print("This happens if this URL was recently searched or is currently being processed.")
                        print("Wait a few minutes before trying this exact URL again.")
                        return

                if isinstance(found_data, list):
                    items = found_data
                else:
                    items = found_data.get('items', [])

                if items:
                    for item in items:
                        # Check for API-level failures
                        status = item.get('status')
                        if status in ('failed', 'duplicate_query'):
                            print(f"\n[!] SignalHire status: '{status}'")
                            if status == 'failed':
                                print(f"    This profile is NOT in SignalHire's pre-scraped database.")
                                print(f"    The API only returns data it already holds internally.")
                                print(f"    The dashboard works differently (live LinkedIn scrape via browser extension).")
                                print(f"    Credits remaining: {credits} (none deducted for failed lookups).")
                                print(f"    Try a profile that is more widely indexed (senior exec, public figure, etc.)")
                            else:
                                print(f"    This URL was recently submitted. Wait a few minutes before retrying.")
                            print("-" * 50)
                            continue

                        # SignalHire callback format might have candidate directly or inside item
                        candidate = item.get('candidate') or item
                        contacts = item.get('contacts') or candidate.get('contacts') or []
                        
                        full_name = candidate.get('fullName', candidate.get('name', f'{first_name} {last_name}'))
                        
                        print("\n==================================================")
                        print(f"SUCCESS: Found Expert : {full_name}")
                        
                        headline = candidate.get('headline') or candidate.get('title')
                        if headline: print(f"Headline     : {headline}")
                            
                        # Parse Experiences
                        experiences = candidate.get('positions') or candidate.get('experience') or candidate.get('experiences') or {}
                        if isinstance(experiences, dict): experiences = list(experiences.values())
                        
                        if experiences:
                            print("\nExperiences:")
                            for exp in experiences[:3]: # Show top 3
                                title = exp.get('title') or exp.get('role') or 'Unknown Title'
                                company = exp.get('companyName') or exp.get('company') or 'Unknown Company'
                                print(f"  - {title} at {company}")
                        
                        # Contacts
                        emails = [c['value'] for c in contacts if c.get('type') == 'email' and c.get('value')]
                        phones = [c['value'] for c in contacts if c.get('type') == 'phone' and c.get('value')]
                        
                        print("\nEmails:")
                        if emails:
                            for e in emails: print(f"  ✅ {e}")
                        else: print("  - None found")
                            
                        print("Phones:")
                        if phones:
                            for p in phones: print(f"  📞 {p}")
                        else: print("  - None found")
                        print("==================================================")
                else:
                    print("Received callback, but no items were found in the payload.")
            else:
                print("\nTimeout: SignalHire did not send the data within 60 seconds.")
                
        else:
            print(f"Failed. Error {response.status_code}: {response.text}")
            
    except Exception as e:
        import traceback
        print(f"Exception occurred: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    # Test Data from input
    linkedin_input = "https://www.linkedin.com/in/raagavi-durairaj-11602b241/"
    first_name_input = "Raagavi"
    last_name_input = "Durairaj"
    location_input = "Chennai, Tamil Nadu, India"
    
    get_expert_contact(linkedin_input, first_name_input, last_name_input, location_input)
