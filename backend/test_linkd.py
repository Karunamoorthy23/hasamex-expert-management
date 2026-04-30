import os
import sys

# Add backend to path so we can import services
sys.path.append(r'c:\Users\User\Desktop\demo\Expert-Searching-App\backend')

from services.linkd_service import fetch_full_profile, print_detailed_profile
from dotenv import load_dotenv

# Load env
env_path = r'c:\Users\User\Desktop\demo\Expert-Searching-App\backend\flask.env'
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ[key] = value

test_url = "https://www.linkedin.com/in/nitin-balakrishnan-69794635/"
print(f"Testing Linkd Service with URL: {test_url}")

profile = fetch_full_profile(test_url)
if profile:
    print("Successfully fetched profile!")
    print_detailed_profile(profile)
else:
    print("Failed to fetch profile. Check terminal logs above.")

