import os
import requests
import json
from typing import Optional, Dict, Any

def extract_username(url: str) -> Optional[str]:
    """
    Extracts the LinkedIn username from a profile URL.
    Examples:
    - https://www.linkedin.com/in/larry-orrel/ -> larry-orrel
    - https://linkedin.com/in/larry-orrel -> larry-orrel
    """
    if not url or 'linkedin.com/in/' not in url:
        return None
    
    # Strip trailing slash
    url = url.strip().rstrip('/')
    
    # Split by /in/ and take the last part
    parts = url.split('/in/')
    if len(parts) > 1:
        username = parts[1].split('?')[0] # Remove query params
        return username
    
    return None

def fetch_full_profile(linkedin_url: str) -> Optional[Dict[str, Any]]:
    """
    Fetches the full professional profile from LinkdAPI.
    """
    api_key = os.getenv('LINKD_API_KEY')
    if not api_key:
        print("[LINKD SERVICE ERROR] LINKD_API_KEY not found in environment.")
        return None

    username = extract_username(linkedin_url)
    if not username:
        print(f"[LINKD SERVICE ERROR] Could not extract username from URL: {linkedin_url}")
        return None

    url = "https://linkdapi.com/api/v1/profile/full"
    params = {"username": username}
    headers = {
        "X-linkdapi-apikey": api_key,
        "Content-Type": "application/json"
    }

    try:
        print(f"[LINKD SERVICE] Fetching profile data for: {username}...")
        response = requests.get(url, params=params, headers=headers, timeout=30)
        
        if response.status_code == 200:
            resp_json = response.json()
            return resp_json
        elif response.status_code == 429:
            print(f"[LINKD SERVICE] Rate limit reached for {username} (429).")
            return None
        elif response.status_code == 404:
            print(f"[LINKD SERVICE] Profile not found for: {username}")
            return None
        elif response.status_code == 401:
            print("[LINKD SERVICE] Unauthorized: Check your LINKD_API_KEY.")
            return None
        else:
            print(f"[LINKD SERVICE ERROR] {response.status_code}: {response.text}")
            return None
            
    except Exception as e:
        print(f"[LINKD SERVICE EXCEPTION] {str(e)}")
        return None

def print_detailed_profile(profile: Dict[str, Any]):
    """
    Helper to print a detailed view of the profile to the terminal.
    """
    if not profile:
        print("   No detailed profile available.")
        return

    data = profile.get('data', {})
    if not data:
        data = profile # Some APIs return data at root

def print_detailed_profile(profile: Dict[str, Any]):
    """
    Prints the entire raw JSON response from the Linkd API.
    """
    if not profile:
        print("   No detailed profile available.")
        return

    print(f"\n   {'='*60}")
    print(f"   RAW LINKD API RESPONSE")
    print(f"   {'='*60}")
    print(json.dumps(profile, indent=2))
    print(f"   {'='*60}\n")
