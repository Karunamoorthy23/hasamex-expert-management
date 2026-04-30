import os
import requests
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load env
dotenv_path = os.path.join('backend', 'flask.env')
if not os.path.exists(dotenv_path):
    dotenv_path = 'flask.env'
load_dotenv(dotenv_path)

client_id = os.getenv('ZOHO_CLIENT_ID')
client_secret = os.getenv('ZOHO_SECRET')
refresh_token = os.getenv('ZOHO_REFRESH_TOKEN')
domain = os.getenv('ZOHO_DOMAIN', 'zoho.com')
print(f"DEBUG: Using domain {domain}")

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

def test_update_event():
    token = get_access_token()
    event_id = "c15bb8d5511d4b7bb712469311dc23b8@zoho.in"
    test_attendee = "karuna.s@hasamex.com"
    
    # 1. Get current event to get etag
    cal_res = requests.get(f"https://calendar.{domain}/api/v1/calendars", headers={"Authorization": f"Bearer {token}"})
    print(f"Cal List Status: {cal_res.status_code}")
    print(f"Cal List Response: {cal_res.text}")
    calendars = cal_res.json().get('calendars', [])
    if not calendars:
        print("No calendars found for this account/token.")
        return
    cal_id = calendars[0]['uid']
    
    url = f"https://calendar.{domain}/api/v1/calendars/{cal_id}/events/{event_id}"
    headers = {"Authorization": f"Bearer {token}"}
    
    get_res = requests.get(url, headers=headers)
    current_event = get_res.json().get('events', [{}])[0]
    etag = current_event.get('etag')
    
    print(f"Current Etag: {etag}")
    
    # 2. Update with new time (1 hour later than original test)
    st = datetime.now() + timedelta(days=1, hours=2)
    et = st + timedelta(hours=1)
    
    event_data = {
        "uid": event_id,
        "etag": etag,
        "title": "Test Update Notification 3",
        "dateandtime": {
            "start": st.strftime('%Y%m%dT%H%M%S'),
            "end": et.strftime('%Y%m%dT%H%M%S'),
            "timezone": "Asia/Kolkata"
        },
        "attendees": [
            {"email": test_attendee, "permission": 1}
        ],
        "notify_attendee": 1,
        "notifyType": 1
    }
    
    # PASS notify_attendee at TOP LEVEL as well
    params = {
        "eventdata": json.dumps(event_data),
        "notify_attendee": 1, 
        "notifyType": 1
    }
    
    print("Trying UPDATE with Query Params (Top Level notify flags)...")
    res = requests.put(url, params=params, headers=headers)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
    
if __name__ == "__main__":
    test_update_event()
