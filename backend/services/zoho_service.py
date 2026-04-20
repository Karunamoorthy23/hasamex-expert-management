import os
import requests
import json
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class ZohoCalendarService:
    def __init__(self):
        self.client_id = os.getenv('ZOHO_CLIENT_ID')
        self.client_secret = os.getenv('ZOHO_SECRET')
        self.refresh_token = os.getenv('ZOHO_REFRESH_TOKEN')
        self.domain = os.getenv('ZOHO_DOMAIN', 'zoho.com')
        self.calendar_id = os.getenv('ZOHO_CALENDAR_ID') # Optional, will use primary if not set

    def get_access_token(self):
        """Exchange refresh token for a fresh access token."""
        if not all([self.client_id, self.client_secret, self.refresh_token]):
            logger.error("Zoho credentials missing in environment")
            return None

        url = f"https://accounts.{self.domain}/oauth/v2/token"
        params = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": self.refresh_token
        }

        try:
            response = requests.post(url, params=params)
            response.raise_for_status()
            return response.json().get('access_token')
        except Exception as e:
            logger.error(f"Failed to refresh Zoho access token: {e}")
            return None

    def create_event(self, summary, description, start_time, duration_mins, attendee_email, timezone="Asia/Kolkata"):
        """Create an event on Zoho Calendar for a single attendee."""
        token = self.get_access_token()
        if not token:
            return None

        # Zoho Calendar API uses https://calendar.zoho.in/api/v1/ (or .com)
        base_api_url = f"https://calendar.{self.domain}/api/v1"
        
        # If calendar_id is not provided, we need to find the primary calendar
        cal_id = self.calendar_id
        if not cal_id:
            # Fetch calendars to find primary
            try:
                cal_list_res = requests.get(f"{base_api_url}/calendars", headers={"Authorization": f"Bearer {token}"})
                cal_list_res.raise_for_status()
                calendars = cal_list_res.json().get('calendars', [])
                if calendars:
                    cal_id = calendars[0].get('uid')
            except Exception as e:
                logger.error(f"Failed to fetch Zoho calendars: {e}")
                return None

        if not cal_id:
            logger.error("No Zoho Calendar ID found")
            return None

        url = f"{base_api_url}/calendars/{cal_id}/events"
        
        # Format times for Zoho
        # Zoho expects "dateandtime" format or similar. 
        # Example format: 20260421T133000+0530
        if isinstance(start_time, datetime):
            st = start_time
        else:
            # Assume ISO format string
            try:
                st = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            except:
                logger.error(f"Invalid start_time format: {start_time}")
                return None

        et = st + timedelta(minutes=duration_mins)
        
        # Zoho format: yyyymmddThhmmss
        def format_zoho_time(dt):
            return dt.strftime('%Y%m%dT%H%M%S')

        event_data = {
            "title": summary,
            "description": description,
            "dateandtime": {
                "start": format_zoho_time(st),
                "end": format_zoho_time(et),
                "timezone": timezone
            },
            "attendees": [
                {"email": attendee_email}
            ],
            "reminders": [
                {"minutes": "15", "action": "email"}
            ],
            "notify_attendee": 1,
            "notifyType": 1,
            "allowForwarding": True
        }

        req_headers = {
            "Authorization": f"Bearer {token}"
        }
        
        try:
            # Zoho API v1 expects eventdata as a form parameter (stringified JSON)
            payload = {
                "eventdata": json.dumps(event_data)
            }
            response = requests.post(url, data=payload, headers=req_headers)
            if response.status_code >= 400:
                 logger.error(f"Zoho Event Creation Failed: {response.status_code} - {response.text}")
                 response.raise_for_status()
            
            data = response.json()
            # Zoho returns event details in 'events' array usually, but let's be robust
            events = data.get('events', [])
            if events:
                return events[0].get('uid')
            return data.get('uid')
        except Exception as e:
            logger.error(f"Failed to create Zoho event: {e}")
            return None

zoho_calendar_service = ZohoCalendarService()
