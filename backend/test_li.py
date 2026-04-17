import requests
import os
from dotenv import load_dotenv

load_dotenv('flask.env')
cookie = os.getenv('LINKEDIN_LI_AT_COOKIE')

headers = {
    'Cookie': f'li_at={cookie};',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
}

try:
    r = requests.get('https://www.linkedin.com/in/kevinbpotts/', headers=headers, timeout=15)
    print("STATUS:", r.status_code)
    # Check if we were redirected to authwall
    if 'authwall' in r.url or 'login' in r.url:
        print("Redirected to Authwall! Cookie might be invalid or blocked.")
    else:
        # Check if python can find the code block that has profile data
        html = r.text
        if 'Experience' in html or 'experience' in html:
            print("Found Experience keyword in raw HTML")
        else:
            print("No experience keyword.")
except Exception as e:
    print(e)
