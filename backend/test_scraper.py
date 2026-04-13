import requests
import os
import json
from dotenv import load_dotenv

load_dotenv('flask.env')
token = os.getenv('APIFY_API_TOKEN')
cookie = os.getenv('LINKEDIN_LI_AT_COOKIE')

# The dev_fusion actor
ACTOR_ID = "dev_fusion~linkedin-profile-scraper"

url = f'https://api.apify.com/v2/acts/{ACTOR_ID}/run-sync-get-dataset-items?token={token}&timeout=180'
payload = {
    "profileUrls": ["https://www.linkedin.com/in/kevinbpotts"],
    "cookie": cookie
}

print(f"Executing dev_fusion/linkedin-profile-scraper...")
try:
    r = requests.post(url, json=payload, timeout=180)
    if r.ok:
        data = r.json()
        print("Success, found records:", len(data))
        if data:
            print("First item headline:", data[0].get('headline', 'N/A'))
            print("First item exp count:", len(data[0].get('experiences', [])))
            # Print a snippet of first experience
            if data[0].get('experiences'):
                print(json.dumps(data[0]['experiences'][0], indent=2))
    else:
        print("Error:", r.status_code, r.text[:200])
except Exception as e:
    print("Exception", e)
