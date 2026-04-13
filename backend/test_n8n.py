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
        
        # --- NEW: Automated ContactOut Enrichment Chain ---
        experts = resp_data.get('experts', [])
        if experts:
            print("\n" + "="*50)
            print("[CONTACTOUT] TRIGGERING AUTOMATED CONTACT ENRICHMENT CHAIN")
            print("="*50)
            
            # Use the enrichment logic from test_vayne.py (now refactored for ContactOut)
            from test_vayne import enrich_expert_with_contactout, update_expert_in_db
            
            for exp in experts:
                url = exp.get('linkedin_url')
                # Fixed: Use full_name or first/last fallback to avoid 'None'
                name = exp.get('full_name') or f"{exp.get('first_name','')} {exp.get('last_name','')}".strip() or "Unknown Expert"
                
                if url:
                    print(f"\n[CONTACTOUT] Processing: {name}")
                    contact = enrich_expert_with_contactout(url)
                    if contact and contact.get('status') == 'success':
                        print(f"[CONTACTOUT] SUCCESS: Found {contact['email']} | {contact['phone']}")
                        # Persist to database
                        update_expert_in_db(url, contact['email'], contact['phone'])
                    else:
                        print(f"[CONTACTOUT] FAIL: No contact info found for {name}")

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

