import os
import requests
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load from flask.env
load_dotenv('flask.env')

client_id = os.getenv('ZOHO_CLIENT_ID')
client_secret = os.getenv('ZOHO_SECRET')
refresh_token = os.getenv('ZOHO_REFRESH_TOKEN')
domain = os.getenv('ZOHO_DOMAIN', 'zoho.in')

def get_access_token():
    url = f"https://accounts.{domain}/oauth/v2/token"
    params = {
        "grant_type": "refresh_token",
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token
    }
    res = requests.post(url, params=params)
    return res.json().get('access_token')

def get_primary_calendar(token):
    url = f"https://calendar.{domain}/api/v1/calendars"
    res = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    print(f"Fetch Calendars Status: {res.status_code}")
    cals = res.json().get('calendars', [])
    return cals[0].get('uid') if cals else None

def test_variation(name, url, method, auth_token, payload_key=None, json_obj=None, use_params=False):
    print(f"\n>>> TESTING: {name}")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    if method == "POST":
        if use_params:
            # Send as Query Parameters
            params = {payload_key: json.dumps(json_obj)} if payload_key else json_obj
            res = requests.post(url, params=params, headers=headers)
        else:
            # Send in Body
            if payload_key:
                # Form-encoded or nested JSON?
                # Test 1: Content-Type application/json with wrapper
                res_body = requests.post(url, json={payload_key: json_obj}, headers=headers)
                print(f"  Attempt Body (JSON with wrapper) status: {res_body.status_code} - {res_body.text}")
                
                # Test 2: Form-encoded with stringified JSON
                res_form = requests.post(url, data={payload_key: json.dumps(json_obj)}, headers=headers)
                print(f"  Attempt Form-Encoded status: {res_form.status_code} - {res_form.text}")
                return
            else:
                # Raw body
                res = requests.post(url, json=json_obj, headers=headers)
    
    print(f"  Result: {res.status_code} - {res.text}")

def main():
    token = get_access_token()
    if not token:
        print("Failed to get access token. Check credentials in flask.env")
        return

    cal_id = get_primary_calendar(token)
    if not cal_id:
        print("No primary calendar found.")
        return

    base_url = f"https://calendar.{domain}/api/v1/calendars/{cal_id}/events"
    
    # Standard Date Structure
    date_info = {
        "start": (datetime.now() + timedelta(days=1)).strftime('%Y%m%dT100000'),
        "end": (datetime.now() + timedelta(days=1)).strftime('%Y%m%dT110000'),
        "timezone": "Asia/Kolkata"
    }

    # Variation list
    # 1. 'title' vs 'summary'
    # 2. Wrapper 'eventdata' vs none
    # 3. Transport (handled in test_variation helper)

    # V1: title + dateandtime (Minimal - often suggested for v1)
    minimal_v1 = {
        "title": "Zoho SDK Tester Minimal",
        "description": "Test Description",
        "dateandtime": date_info,
        "attendees": [
            {"email": "karuna.s@hasamex.com"}
        ],
        "reminders": [
            {"minutes": "15", "action": "email"}
        ]
    }

    # V2: summary + start/end (Google style - sometimes used in specific Zoho gateways)
    google_style = {
        "summary": "Zoho SDK Tester Google Style",
        "start": {"dateTime": (datetime.now() + timedelta(days=1)).isoformat() + "Z"},
        "end": {"dateTime": (datetime.now() + timedelta(days=1, hours=1)).isoformat() + "Z"}
    }
    
    # Run tests
    test_variation("Minimal V1 - Body Wrapper", base_url, "POST", token, payload_key="eventdata", json_obj=minimal_v1)
    test_variation("Minimal V1 - Query Param", base_url, "POST", token, payload_key="eventdata", json_obj=minimal_v1, use_params=True)
    test_variation("Minimal V1 - Double Nested", base_url, "POST", token, payload_key="eventdata", json_obj={"eventdata": minimal_v1}, use_params=True)
    test_variation("Raw JSON Body (No Wrapper)", base_url, "POST", token, json_obj=minimal_v1)
    test_variation("Google Style Body", base_url, "POST", token, json_obj=google_style)

if __name__ == "__main__":
    main()
