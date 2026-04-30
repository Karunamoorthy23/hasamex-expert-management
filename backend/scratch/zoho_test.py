import os
import json
import requests
from dotenv import load_dotenv

load_dotenv('flask.env')

client_id = os.getenv('ZOHO_CLIENT_ID')
client_secret = os.getenv('ZOHO_SECRET')
refresh_token = os.getenv('ZOHO_REFRESH_TOKEN')
domain = os.getenv('ZOHO_DOMAIN', 'zoho.com')

print(f"Domain: {domain}")

url_token = f"https://accounts.{domain}/oauth/v2/token"
params_token = {
    "grant_type": "refresh_token",
    "client_id": client_id,
    "client_secret": client_secret,
    "refresh_token": refresh_token
}
res = requests.post(url_token, params=params_token)
token = res.json().get('access_token')
print("Token fetched:", bool(token))

cal_url = f"https://calendar.{domain}/api/v1/calendars"
cal_res = requests.get(cal_url, headers={"Authorization": f"Bearer {token}"})
calendars = cal_res.json().get('calendars', [])
cal_id = calendars[0].get('uid') if calendars else None
print("Calendar ID:", cal_id)

url = f"https://calendar.{domain}/api/v1/calendars/{cal_id}/events"

event_data = {
    "title": "Test Call",
    "dateandtime": {
        "start": "20260423T083300",
        "end": "20260423T091800",
        "timezone": "Asia/Kolkata"
    },
    "attendees": [
        {"email": "karuna.s@hasamex.com", "permission": 1}
    ],
    "reminders": [
        {"minutes": "15", "action": "email"}
    ],
    "notify_attendee": 1,
    "notifyType": 1,
    "allowForwarding": True
}

payload = {
    "eventdata": json.dumps(event_data)
}

res = requests.post(url, params=payload, headers={"Authorization": f"Bearer {token}"})
print("Status Code:", res.status_code)
print("Response text:", res.text)
