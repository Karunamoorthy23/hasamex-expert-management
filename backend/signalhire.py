"""
SignalHire LinkedIn Profile Lookup - Flask App
=============================================

NEW APPROACH: No tunnel / ngrok / pinggy needed.
─────────────────────────────────────────────────
Uses webhook.site as a free public relay:

  SignalHire  →  webhook.site  →  polled every 3s by this script

No public URL on your machine needed at all.
"""

import os
import json
import time
import logging
import requests

from flask import Flask, request, jsonify
from dotenv import load_dotenv

# ── Load env ──────────────────────────────────────────────────────────────────
dotenv_path = os.path.join(os.path.dirname(__file__), "flask.env")
load_dotenv(dotenv_path=dotenv_path)

SIGNALHIRE_API_KEY = os.getenv("SIGNALHIRE_API_KEY", "")
if not SIGNALHIRE_API_KEY:
    raise RuntimeError("SIGNALHIRE_API_KEY is not set in backend/flask.env")

SIGNALHIRE_SEARCH_URL  = "https://www.signalhire.com/api/v1/candidate/search"
SIGNALHIRE_CREDITS_URL = "https://www.signalhire.com/api/v1/credits"
WEBHOOK_SITE_TOKEN_URL = "https://webhook.site/token"
WEBHOOK_SITE_BASE      = "https://webhook.site"

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


# ── Helpers ───────────────────────────────────────────────────────────────────

def sh_headers() -> dict:
    return {"apikey": SIGNALHIRE_API_KEY, "Content-Type": "application/json"}


def parse_candidate(candidate: dict) -> dict:
    phones  = [c["value"] for c in candidate.get("contacts", []) if c.get("type") == "phone"]
    emails  = [c["value"] for c in candidate.get("contacts", []) if c.get("type") == "email"]
    socials = {s["type"]: s["link"] for s in candidate.get("social", [])}
    return {
        "fullName":     candidate.get("fullName"),
        "headline":     candidate.get("headLine"),
        "summary":      candidate.get("summary"),
        "location":     [loc["name"] for loc in candidate.get("locations", [])],
        "photo":        (candidate.get("photo") or {}).get("url"),
        "phones":       phones,
        "emails":       emails,
        "linkedin":     socials.get("li"),
        "other_social": {k: v for k, v in socials.items() if k != "li"},
        "skills":       candidate.get("skills", []),
        "experience": [
            {
                "company":  exp.get("company"),
                "position": exp.get("position"),
                "current":  exp.get("current"),
                "started":  exp.get("started"),
                "ended":    exp.get("ended"),
                "industry": exp.get("industry"),
                "location": exp.get("location"),
            }
            for exp in candidate.get("experience", [])
        ],
        "education": [
            {
                "university":  edu.get("university"),
                "faculty":     edu.get("faculty"),
                "degree":      edu.get("degree"),
                "startedYear": edu.get("startedYear"),
                "endedYear":   edu.get("endedYear"),
            }
            for edu in candidate.get("education", [])
        ],
    }


# ── Core: webhook.site relay (no tunnel needed) ───────────────────────────────

def lookup_via_webhook_site(linkedin_url: str, timeout: int = 120) -> list:
    """
    1. Create a webhook.site token  →  public callback URL (free, no signup)
    2. POST to SignalHire with that callbackUrl
    3. Poll webhook.site API every 3 s until SignalHire delivers the payload
    4. Return the raw list from SignalHire
    """

    # Step 1 — get a webhook.site token
    print("[webhook.site] Creating token ...")
    try:
        tok = requests.post(
            WEBHOOK_SITE_TOKEN_URL,
            json={
                "default_status": 200,
                "default_content": "OK",
                "default_content_type": "text/plain",
            },
            timeout=10,
        )
        tok.raise_for_status()
        token = tok.json()["uuid"]
    except Exception as exc:
        raise RuntimeError(f"Could not create webhook.site token: {exc}")

    callback_url   = f"{WEBHOOK_SITE_BASE}/{token}"
    poll_url       = f"{WEBHOOK_SITE_BASE}/token/{token}/requests?sorting=newest&per_page=1"
    print(f"[webhook.site] Callback URL: {callback_url}")

    # Step 2 — submit to SignalHire
    print(f"[SignalHire]   Submitting lookup for: {linkedin_url}")
    try:
        sh = requests.post(
            SIGNALHIRE_SEARCH_URL,
            headers=sh_headers(),
            json={"items": [linkedin_url], "callbackUrl": callback_url},
            timeout=15,
        )
        sh.raise_for_status()
    except requests.HTTPError as exc:
        raise RuntimeError(f"SignalHire {exc.response.status_code}: {exc.response.text}")

    print(f"[SignalHire]   Accepted. requestId={sh.json().get('requestId')}")
    print(f"[webhook.site] Polling every 3 s (timeout={timeout}s) ...")

    # Step 3 — poll webhook.site
    deadline = time.time() + timeout
    attempt  = 0
    while time.time() < deadline:
        attempt += 1
        time.sleep(3)
        try:
            poll = requests.get(poll_url, timeout=10).json()
        except Exception:
            continue

        total = poll.get("total", 0)
        print(f"  [{attempt:02d}] Requests at webhook.site: {total}")

        if total > 0:
            raw_body = poll["data"][0].get("content", "[]")
            try:
                payload = json.loads(raw_body)
                print("\n[SignalHire] Callback received!\n")
                return payload
            except json.JSONDecodeError:
                print("[!] Could not parse body:\n", raw_body[:400])
                break

    raise TimeoutError(
        f"No callback from SignalHire within {timeout}s.\n"
        "Possible causes:\n"
        "  1. Profile not in SignalHire database\n"
        "  2. Credits exhausted — check: python app.py credits\n"
        "  3. SignalHire servers slow — try increasing timeout"
    )


def print_results(raw_payload: list):
    for item in raw_payload:
        status = item.get("status")
        print("\n" + "=" * 60)
        print(f"  Item   : {item.get('item')}")
        print(f"  Status : {status}")

        if status == "success" and item.get("candidate"):
            p = parse_candidate(item["candidate"])
            print(f"\n  Name    : {p['fullName']}")
            print(f"  Title   : {p['headline']}")
            print(f"  Location: {', '.join(p['location'])}")
            print(f"\n  Emails  : {p['emails'] or 'none found'}")
            print(f"  Phones  : {p['phones'] or 'none found'}")
            print(f"  LinkedIn: {p['linkedin']}")
            if p["other_social"]:
                print(f"  Social  : {p['other_social']}")
            if p["skills"]:
                print(f"\n  Skills  : {', '.join(p['skills'][:10])}")
            if p["experience"]:
                print(f"\n  Experience:")
                for exp in p["experience"][:3]:
                    tag = " [current]" if exp["current"] else ""
                    print(f"    • {exp['position']} @ {exp['company']}{tag}")
            if p["education"]:
                print(f"\n  Education:")
                for edu in p["education"][:2]:
                    deg = ", ".join(edu.get("degree") or [])
                    print(f"    • {edu['university']} — {deg}")
            print(f"\n  Full profile JSON:")
            print(json.dumps({"status": status, "profile": p}, indent=2))
        elif status == "failed":
            print("  [!] Not found in SignalHire database.")
        elif status == "credits_are_over":
            print("  [!] Credits exhausted.")
        elif status == "timeout_exceeded":
            print("  [!] SignalHire processing timed out.")
        print("=" * 60)


# ── Flask API routes ──────────────────────────────────────────────────────────

@app.route("/credits", methods=["GET"])
def check_credits():
    try:
        r = requests.get(SIGNALHIRE_CREDITS_URL, headers=sh_headers(), timeout=10)
        r.raise_for_status()
        return jsonify(r.json()), 200
    except requests.RequestException as exc:
        return jsonify({"error": str(exc)}), 502


@app.route("/lookup", methods=["POST"])
def api_lookup():
    """
    POST /lookup
    Body: { "linkedin_url": "https://www.linkedin.com/in/..." }
    Waits up to 120 s and returns the full profile.
    No tunnel required.
    """
    body = request.get_json(force=True, silent=True) or {}
    url  = body.get("linkedin_url") or (body.get("items") or [None])[0]
    if not url:
        return jsonify({"error": "Provide 'linkedin_url' in the request body"}), 400

    try:
        raw = lookup_via_webhook_site(url)
    except (RuntimeError, TimeoutError) as exc:
        return jsonify({"error": str(exc)}), 502

    results = []
    for item in raw:
        entry = {"item": item.get("item"), "status": item.get("status")}
        if item.get("status") == "success" and item.get("candidate"):
            entry["profile"] = parse_candidate(item["candidate"])
        else:
            entry["error"] = item.get("status", "unknown")
        results.append(entry)

    return jsonify({"status": "complete", "results": results}), 200


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    # Run as: python app.py credits   → check credits
    # Run as: python app.py           → run the LinkedIn lookup below
    if len(sys.argv) > 1 and sys.argv[1] == "credits":
        try:
            r = requests.get(SIGNALHIRE_CREDITS_URL, headers=sh_headers(), timeout=10)
            print(json.dumps(r.json(), indent=2))
        except Exception as exc:
            print(f"Error: {exc}")
        raise SystemExit(0)

    # ── LinkedIn lookup ───────────────────────────────────────────────────────
    LINKEDIN_URL = "https://www.linkedin.com/in/deepa-murugan0712/"

    print("=" * 60)
    print("  SignalHire Lookup  (no tunnel required)")
    print("=" * 60)

    try:
        raw = lookup_via_webhook_site(LINKEDIN_URL, timeout=120)
        print_results(raw)
    except (RuntimeError, TimeoutError) as exc:
        print(f"\n[ERROR] {exc}")

   # Uncomment below to also start the Flask API after the lookup:
    port = int(os.getenv("FLASK_PORT", 5000))
    print(f"\nStarting Flask API on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)