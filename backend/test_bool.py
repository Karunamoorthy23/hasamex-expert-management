import requests
import os
import json
from dotenv import load_dotenv

load_dotenv('flask.env')
token = os.getenv('APIFY_API_TOKEN')
url = f'https://api.apify.com/v2/acts/M2FMdjRVeF1HPGFcc/run-sync-get-dataset-items?token={token}&timeout=180'
payload = {
    'searchQuery': '("procurement" OR "sourcing") AND (Bayer OR Orifarm) AND ("softgel" OR "nutraceutical")',
    'profileScraperMode': 'Short',
    'maxItems': 5,
    'takePages': 1
}
try:
    r = requests.post(url, json=payload, timeout=180)
    if r.ok:
        data = r.json()
        print("Success, profiles found:", len(data))
    else:
        print("Error:", r.status_code, r.text[:200])
except Exception as e:
    print("Exception", e)
