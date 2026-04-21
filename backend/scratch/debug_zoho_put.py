import os
import requests
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

dotenv_path = os.path.join('backend', 'flask.env')
load_dotenv(dotenv_path)

client_id = os.getenv('ZOHO_CLIENT_ID')
client_secret = os.getenv('ZOHO_SECRET')
refresh_token = os.getenv('ZOHO_REFRESH_TOKEN')
domain = os.getenv('ZOHO_DOMAIN', 'zoho.com')

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

def test_put_variants():
    token = get_access_token()
    event_id = "7fd4b3d2df144e7fbc97b5da36a40e8c@zoho.in"
    # The etag might đã change if a previous PUT somehow partially worked or if we need a fresh one
    # But usually 400 means no change.
    etag = "1776674021935" 
    cal_id = "4e553e4826ed4fdd936177ef1278a5df"
    
    url = f"https://calendar.{domain}/api/v1/calendars/{cal_id}/events/{event_id}"
    headers = {"Authorization": f"Bearer {token}"}
    
    st = datetime.now() + timedelta(days=2)
    et = st + timedelta(minutes=45)
    
    def format_zoho_time(dt):
        return dt.strftime('%Y%m%dT%H%M%S')

    base_ev = {
        "title": "Debug Update Test 7",
        "dateandtime": {
            "start": format_zoho_time(st),
            "end": format_zoho_time(et),
            "timezone": "Asia/Kolkata"
        },
        "attendees": [{"email": "karunamoorthy179@gmail.com", "permission": 1}],
        "notify_attendee": 1,
        "notifyType": 1
    }

    # Variant 7: Only eventdata in params, flags INSIDE, UID with @zoho.in
    print("\n--- Variant 7: Only eventdata in params, flags INSIDE, full UID ---")
    ev7 = {**base_ev, "uid": event_id, "etag": etag}
    res7 = requests.put(url, params={"eventdata": json.dumps(ev7)}, headers=headers)
    print(f"Status: {res7.status_code}")
    print(f"Response: {res7.text}")

    # Variant 8: Only eventdata in params, flags INSIDE, UID WITHOUT @zoho.in
    print("\n--- Variant 8: Only eventdata in params, flags INSIDE, stripped UID ---")
    ev8 = {**base_ev, "uid": event_id.split('@')[0], "etag": etag}
    res8 = requests.put(url, params={"eventdata": json.dumps(ev8)}, headers=headers)
    print(f"Status: {res8.status_code}")
    print(f"Response: {res8.text}")

if __name__ == "__main__":
    test_put_variants()

    # Variant 4: Clean eventdata (no notify flags inside) + params notify_attendee only
    print("\n--- Variant 4: Flags ONLY in params, Clean eventdata ---")
    clean_ev = {
        "uid": event_id,
        "etag": etag,
        "title": "Debug Update Test 4",
        "dateandtime": base_event_data["dateandtime"],
        "attendees": base_event_data["attendees"]
    }
    params4 = {"eventdata": json.dumps(clean_ev), "notify_attendee": 1}
    res4 = requests.put(url, params=params4, headers=headers)
    print(f"Status: {res4.status_code}")
    print(f"Response: {res4.text}")

    # Variant 6: Only notify_attendee in params, no notifyType
    print("\n--- Variant 6: Only notify_attendee in params ---")
    ev6 = {**base_event_data, "uid": event_id, "etag": etag}
    params6 = {"eventdata": json.dumps(ev6), "notify_attendee": 1}
    res6 = requests.put(url, params=params6, headers=headers)
    print(f"Status: {res6.status_code}")
    print(f"Response: {res6.text}")

if __name__ == "__main__":
    test_put_variants()

if __name__ == "__main__":
    test_put_variants()
