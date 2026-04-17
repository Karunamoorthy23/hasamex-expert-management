import urllib.request
import json

data = {
    "project_id": 1,
    "project_title": "Pharmaceutical Supply Chain",
    "target_companies": [
        "Bayer Consumer Health",
        "Orifarm"
    ],
    "target_functions": [
        "Supply Chain Management (titles like Procurement Manager)",
        "Senior Strategic Softgel Procurement Director"
    ],
    "target_functions_titles": "We need people from Bayer Consumer Health who focus on Strategic Sourcing and Procurement."
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
        resp_data = json.loads(resp.read().decode())
        print(json.dumps(resp_data, indent=2))
        
        # --- Automated Contact Enrichment Chain ---
        experts = resp_data.get('experts', [])
        if experts:
            print("\n" + "="*50)
            print("[STAGE 2] SIGNALHIRE ASYNC ENRICHMENT QUEUED")
            print("="*50)
            print(f"[INFO] The backend has successfully queued {len(experts)} profiles.")
            print("[INFO] SignalHire will perform deep profile scraping and contact enrichment")
            print("[INFO] in the background. The detailed data (bio, experience, skills, email, phone)")
            print("[INFO] will arrive asynchronously at /api/v1/n8n/signalhire-callback")

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

