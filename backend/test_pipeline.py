"""
test_pipeline.py  ─  End-to-End Waterfall Pipeline Test
=========================================================
Tests all 3 stages of the enrichment pipeline:
  Stage 1 → Google X-Ray Search (google-search-scraper)
  Stage 2 → LinkedIn Deep Enrichment (anchor/linkedin-profile-enrichment)
  Stage 3 → SignalHire contact enrichment (async)

Requirements:
  - Backend must be running: python app.py
  - Correct keys set in flask.env

Run with:
  python test_pipeline.py
"""
import urllib.request
import json
import sys

# ─── Configure your test payload here ──────────────────────────────
PAYLOAD = {
    "project_id": 1,
    "project_title": "Pharmaceutical Supply Chain",
    "target_companies": [
        "Bayer Consumer Health",
        "Orifarm"
    ],
    "target_functions": [
        "Procurement Manager",
        "Strategic Sourcing",
        "Supply Chain"
    ],
    "target_functions_titles": "We need procurement and sourcing experts from Bayer and Orifarm.",
}

BACKEND_URL = "http://localhost:8080"
TOKEN       = "hasamex-n8n-service-2026-secret"
TIMEOUT_SEC = 360   # 6 minutes — Stage 2 deep enrichment can take ~2 min

# ─── Run the test ───────────────────────────────────────────────────
def run_test():
    print("\n" + "=" * 60)
    print("  3-STAGE WATERFALL PIPELINE — LOCAL END-TO-END TEST")
    print("=" * 60)
    print(f"\n  Backend: {BACKEND_URL}")
    print(f"  Project: {PAYLOAD['project_title']}")
    print(f"  Companies: {PAYLOAD['target_companies']}")
    print(f"  Functions: {PAYLOAD['target_functions']}")
    print(f"  Timeout: {TIMEOUT_SEC}s\n")
    print("  Stages:")
    print("    [1] Google X-Ray  -> collects N1 profile URLs")
    print("    [2] Anchor Enrich -> deep data (experience, skills)")
    print("    [3] SignalHire    -> emails + phones (async callback)")
    print("\n" + "-" * 60 + "\n")

    req = urllib.request.Request(
        f"{BACKEND_URL}/api/v1/n8n/search-experts?token={TOKEN}",
        data=json.dumps(PAYLOAD).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {TOKEN}'
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as resp:
            result = json.loads(resp.read().decode('utf-8', errors='replace'))

            print("\n[SUCCESS] PIPELINE COMPLETE")
            print("=" * 60)
            print(f"  Stage 1 (Google) N1 profiles : {result.get('stage1_n1', '?')}")
            print(f"  Stage 2 (Curious Coder) N2 enriched : {result.get('stage2_n2', '?')}")
            print(f"  Experts stored in DB         : {result.get('experts_found', 0)}")
            print(f"  SignalHire dispatched        : {result.get('signalhire_dispatched', False)}")

            errors = result.get('errors')
            if errors:
                print(f"\n[WARN]  Errors: {errors}")

            experts = result.get('experts', [])
            if experts:
                print(f"\n[LIST] TOP EXPERTS FOUND ({len(experts)}):")
                print("-" * 60)
                for i, exp in enumerate(experts, 1):
                    name  = exp.get('full_name') or f"{exp.get('first_name','')} {exp.get('last_name','')}".strip()
                    title = exp.get('title_headline') or 'No Title'
                    yrs   = exp.get('years_of_experience') or 0
                    score = exp.get('relevance_score') or 0
                    src   = exp.get('enrichment_source') or 'unknown'
                    url   = exp.get('linkedin_url') or ''
                    print(f"\n  {i}. {name}")
                    print(f"     Title    : {title[:70]}")
                    print(f"     Yrs Exp  : {yrs}")
                    print(f"     Relevance: {score}  |  Source: {src}")
                    print(f"     LinkedIn : {url}")
            else:
                print("\n[WARN]  No experts found in response.")

            print("\n" + "=" * 60)
            print("  [INFO] Stage 3 (SignalHire) runs async in background.")
            print("     Emails/phones will arrive at /api/v1/n8n/signalhire-callback")
            print("     (Only works if BACKEND_PUBLIC_URL is reachable by SignalHire)")
            print("=" * 60 + "\n")

            return result

    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        print(f"\n[ERROR] HTTP {e.code} Error:")
        try:
            print(json.dumps(json.loads(body), indent=2))
        except Exception:
            print(body[:1000])
        sys.exit(1)

    except urllib.error.URLError as e:
        print(f"\n[ERROR] Connection error - is the backend running on {BACKEND_URL}?")
        print(f"   Start it with:  python app.py")
        print(f"   Reason: {e.reason}")
        sys.exit(1)

    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    run_test()
