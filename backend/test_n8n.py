import urllib.request
import json

data = {
    "project_id": 1,
    "project_title": "AI Automation Search",
    "target_companies": "Google",
    "target_functions_titles": "Software Engineer"
}

print("\n" + "="*50)
print("RUNNING END-TO-END AUTOMATION TEST")
print("Expected duration: 60-120 seconds")
print("="*50 + "\n")

# we'll test sending data straight as JSON, and also nested under 'body'
req = urllib.request.Request(
    'http://localhost:8080/api/v1/n8n/search-experts?token=hasamex-n8n-service-2026-secret',
    data=json.dumps(data).encode('utf-8'),
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer hasamex-n8n-service-2026-secret'
    }
)

try:
    # Set high timeout on the test client
    with urllib.request.urlopen(req, timeout=305) as resp:
        print("\n[COMPLETE] Server Response:")
        print(json.dumps(json.loads(resp.read().decode()), indent=2))
except urllib.error.HTTPError as e:
    print(f"\n[ERROR] Test Failed: {e}")
    error_body = e.read().decode('utf-8')
    try:
        # Try to pretty print the JSON (which now contains the traceback)
        print(json.dumps(json.loads(error_body), indent=2))
    except:
        print(error_body)
except Exception as e:
    print("\n[ERROR] Test Failed:", e)

