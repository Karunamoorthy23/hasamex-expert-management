import requests

# Add client id and secret

for domain in ["zoho.com", "zoho.in"]:
    url = f"https://accounts.{domain}/oauth/v2/token"
    print(f"\n--- Testing Domain: {url} ---")
    data = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect_uri
    }
    try:
        response = requests.post(url, data=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
