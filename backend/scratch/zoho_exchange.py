import requests

# Use the latest credentials from flask.env
client_id = "1000.COSP44TYZCEHR0P0OTVYB9AWVIZ1OI"
client_secret = "44480e2cf36880c86039b1a9672876e366a311cdca"
# Grant Token (Generate a NEW one if this fails with 'invalid_code')
code = "1000.f78389a0dcb228023d6fe46e84034eb6.1d5d435a64b94af0cf108dec42a74c79"
redirect_uri = "http://localhost:8080"

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
