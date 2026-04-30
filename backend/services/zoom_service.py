import os
import requests
import base64
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ZoomService:
    def __init__(self):
        self.account_id = os.getenv('ZOOM_ACCOUNT_ID')
        self.client_id = os.getenv('ZOOM_CLIENT_ID')
        self.client_secret = os.getenv('ZOOM_CLIENT_SECRET')
        self.base_url = "https://api.zoom.us/v2"

    def get_access_token(self):
        """Fetch access token using Server-to-Server OAuth."""
        if not all([self.account_id, self.client_id, self.client_secret]):
            logger.error("Zoom credentials missing in environment")
            return None

        url = f"https://zoom.us/oauth/token"
        params = {
            "grant_type": "account_credentials",
            "account_id": self.account_id
        }
        
        # Basic Auth header: base64(client_id:client_secret)
        auth_str = f"{self.client_id}:{self.client_secret}"
        auth_b64 = base64.b64encode(auth_str.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {auth_b64}"
        }

        try:
            response = requests.post(url, params=params, headers=headers)
            response.raise_for_status()
            return response.json().get('access_token')
        except Exception as e:
            logger.error(f"Failed to get Zoom access token: {e}")
            return None

    def create_meeting(self, topic, start_time, duration_mins=60):
        """Create a Zoom meeting and return the details."""
        token = self.get_access_token()
        if not token:
            return None

        url = f"{self.base_url}/users/me/meetings"
        
        # Format start_time to ISO format if it's a datetime object
        if isinstance(start_time, datetime):
            start_time_str = start_time.strftime('%Y-%m-%dT%H:%M:%SZ')
        else:
            start_time_str = start_time

        payload = {
            "topic": topic,
            "type": 2,  # Scheduled meeting
            "start_time": start_time_str,
            "duration": duration_mins,
            "settings": {
                "host_video": True,
                "participant_video": True,
                "join_before_host": True,
                "mute_upon_entry": True,
                "waiting_room": False
            }
        }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return {
                "meeting_id": str(data.get('id')),
                "join_url": data.get('join_url'),
                "start_url": data.get('start_url'),
                "password": data.get('password')
            }
        except Exception as e:
            logger.error(f"Failed to create Zoom meeting: {e}")
            return None

    def update_meeting(self, meeting_id, topic=None, start_time=None, duration_mins=None):
        """Update an existing Zoom meeting."""
        token = self.get_access_token()
        if not token:
            return False

        url = f"{self.base_url}/meetings/{meeting_id}"
        
        payload = {}
        if topic:
            payload["topic"] = topic
        if start_time:
            if isinstance(start_time, datetime):
                payload["start_time"] = start_time.strftime('%Y-%m-%dT%H:%M:%SZ')
            else:
                payload["start_time"] = start_time
        if duration_mins:
            payload["duration"] = duration_mins

        if not payload:
            return True # Nothing to update

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.patch(url, json=payload, headers=headers)
            if response.status_code == 204:
                return True
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Failed to update Zoom meeting {meeting_id}: {e}")
            return False

zoom_service = ZoomService()
