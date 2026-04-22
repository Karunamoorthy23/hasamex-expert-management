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

    def get_calendar_id(self, token):
        """Find the primary calendar ID if not already known."""
        if self.calendar_id:
            return self.calendar_id
        
        base_api_url = f"https://calendar.{self.domain}/api/v1"
        try:
            cal_list_res = requests.get(f"{base_api_url}/calendars", headers={"Authorization": f"Bearer {token}"})
            cal_list_res.raise_for_status()
            calendars = cal_list_res.json().get('calendars', [])
            if calendars:
                return calendars[0].get('uid')
        except Exception as e:
            logger.error(f"Failed to fetch Zoho calendars: {e}")
        return None

    def get_event(self, event_id):
        """Retrieve details for a specific Zoho Calendar event."""
        token = self.get_access_token()
        if not token:
            return None

        cal_id = self.get_calendar_id(token)
        if not cal_id:
            return None

        url = f"https://calendar.{self.domain}/api/v1/calendars/{cal_id}/events/{event_id}"
        headers = {"Authorization": f"Bearer {token}"}

        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            # Zoho returns event in 'events' array usually
            data = response.json()
            events = data.get('events', [])
            return events[0] if events else None
        except Exception as e:
            logger.error(f"Failed to fetch Zoho event {event_id}: {e}")
            return None

    def create_event(self, summary, description, start_time, duration_mins, attendee_email, timezone="Asia/Kolkata"):
        """Create an event on Zoho Calendar for a single attendee."""
        token = self.get_access_token()
        if not token:
            return None

        cal_id = self.get_calendar_id(token)
        if not cal_id:
            return None

        url = f"https://calendar.{self.domain}/api/v1/calendars/{cal_id}/events"
        
        if isinstance(start_time, datetime):
            st = start_time
        else:
            try:
                st = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            except:
                logger.error(f"Invalid start_time format: {start_time}")
                return None

        et = st + timedelta(minutes=duration_mins)
        
        def format_zoho_time(dt):
            return dt.strftime('%Y%m%dT%H%M%S')

        event_data = {
            "title": summary,
            "richtext_description": description,
            "dateandtime": {
                "start": format_zoho_time(st),
                "end": format_zoho_time(et),
                "timezone": timezone
            },
            "attendees": [
                {"email": attendee_email, "permission": 1}
            ],
            "reminders": [
                {"minutes": "15", "action": "email"}
            ],
            "notify_attendee": 1,
            "notifyType": 1,
            "allowForwarding": True
        }

        headers = {"Authorization": f"Bearer {token}"}
        
        try:
            # Zoho v1 triggers notifications correctly when eventdata and notify flags are sent as query parameters (params)
            payload = {
                "eventdata": json.dumps(event_data),
                "notify_attendee": 1,
                "notifyType": 1
            }
            response = requests.post(url, params=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            events = data.get('events', [])
            return events[0].get('uid') if events else data.get('uid')
        except Exception as e:
            logger.error(f"Failed to create Zoho event: {e}")
            return None

    def update_event(self, event_id, summary, description, start_time, duration_mins, attendee_email, timezone="Asia/Kolkata"):
        """Update an existing Zoho Calendar event."""
        # 1. Fetch current event to get the etag
        current_event = self.get_event(event_id)
        if not current_event:
            logger.error(f"Cannot update Zoho event {event_id}: Not found")
            return None

        etag = current_event.get('etag')
        if not etag:
            logger.error(f"Cannot update Zoho event {event_id}: ETag missing")
            return None

        token = self.get_access_token()
        cal_id = self.get_calendar_id(token)
        
        url = f"https://calendar.{self.domain}/api/v1/calendars/{cal_id}/events/{event_id}"
        
        if isinstance(start_time, datetime):
            st = start_time
        else:
            st = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        
        et = st + timedelta(minutes=duration_mins)
        
        def format_zoho_time(dt):
            return dt.strftime('%Y%m%dT%H%M%S')

        # Note: PUT is a full replacement in Zoho v1, so include mandatory etag
        event_data = {
            "uid": event_id,
            "etag": etag,
            "title": summary,
            "richtext_description": description,
            "dateandtime": {
                "start": format_zoho_time(st),
                "end": format_zoho_time(et),
                "timezone": timezone
            },
            "attendees": [
                {"email": attendee_email, "permission": 1}
            ],
            "reminders": [
                {"minutes": "15", "action": "email"}
            ],
            "notify_attendee": 1,
            "notifyType": 1,
            "allowForwarding": True
        }

        headers = {"Authorization": f"Bearer {token}"}
        
        try:
            # Zoho v1 PUT also requires query parameters (params) for notification triggers.
            # However, top-level notify flags (like notifyType) can cause EXTRA_PARAM_FOUND errors in Zoho India.
            # We keep them only inside the eventdata JSON for updates.
            payload = {
                "eventdata": json.dumps(event_data)
            }
            response = requests.put(url, params=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            events = data.get('events', [])
            return events[0].get('uid') if events else event_id
        except Exception as e:
            logger.error(f"Failed to update Zoho event {event_id}: {e}")
            return None

zoho_calendar_service = ZohoCalendarService()
