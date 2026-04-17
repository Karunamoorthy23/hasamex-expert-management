import requests
import os
import json
from dotenv import load_dotenv

load_dotenv('flask.env')
token = os.getenv('APIFY_API_TOKEN')
url = f'https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token={token}&timeout=180'
payload = {
    'queries': 'site:linkedin.com/in/ ("procurement") ("bayer")',
    'maxPagesPerQuery': 1,
    'resultsPerPage': 5
}
try:
    r = requests.post(url, json=payload, timeout=180)
    if r.ok:
        data = r.json()
        print("Success, Google found items:", len(data))
        if data and 'organicResults' in data[0]:
            print(json.dumps(data[0]['organicResults'][:2], indent=2))
        else:
            print("No organicResults found:", data)
    else:
        print("Error:", r.status_code, r.text[:200])
except Exception as e:
    print("Exception", e)
