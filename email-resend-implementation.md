# Email Sending Implementation Plan — Resend API (Render/Supabase Friendly)

## Overview
- Problem: Outbound SMTP is not reliable/allowed in our production environment (Render + Supabase). Current SMTP setup via Flask-Mail cannot send emails.
- Solution: Use Resend’s HTTP API for sending emails. Resend works over HTTPS, avoids SMTP blocks, and is simple to integrate.
- Scope: Replace SMTP usage with a provider-agnostic mail service that defaults to Resend in production.

## Provider Analysis
- Resend
  - Pros: HTTP API; free tier; simple SDK; good developer UX; supports domain verification (SPF/DKIM); templates; webhooks.
  - Cons: Younger ecosystem than SendGrid/Postmark; some advanced features may require customization.
- SendGrid
  - Pros: Mature; rich analytics; templates; webhooks.
  - Cons: SMTP commonly used; HTTP API also available; free tier limits; historical deliverability variance.
- Mailgun
  - Pros: Solid deliverability; flexible HTTP API.
  - Cons: Pricing can scale; region constraints sometimes impact latency.
- Postmark
  - Pros: Transactional focus; strong deliverability; templates; webhooks.
  - Cons: Higher cost for volume; rigorous domain setup.
- AWS SES
  - Pros: Low cost; high scalability.
  - Cons: Set up complexity (IAM/DNS); sometimes blocked or throttled in PaaS; SMTP by default unless using AWS SDK from AWS infra.

Decision: Resend is the best fit given Render/Supabase constraints and the need for HTTP-based delivery with simple integration.

## Architecture Changes
- Introduce a mail service abstraction that can send transactional emails via Resend.
- Keep a provider toggle via environment variable to support future alternatives.
- Replace direct Flask-Mail usage in code with the new Resend-backed service.
- Configuration remains centralized in Flask config. See current mail config in [config.py](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/config.py).

## Environment Variables
- RESEND_API_KEY: Resend API key (secret).
- MAIL_FROM: Default “From” address, e.g., no-reply@yourdomain.com.
- EMAIL_PROVIDER: Set to resend in production. Optionally support smtp for local dev.
- Optional: MAIL_REPLY_TO, APP_BASE_URL for template links.

## DNS & Deliverability
- Verify sending domain in Resend dashboard.
- Add provided DNS records (SPF/DKIM) at your domain registrar.
- Optionally add DMARC for policy and reporting.

## Dependencies
- Option A (Recommended): Use the official Resend Python SDK.
  - requirements.txt: `resend`
- Option B: Use direct HTTPS with `requests` (no external SDK).
  - requirements.txt: `requests`

## Implementation Steps
1. Create a provider-agnostic mailer
   - File: `backend/services/mailer.py`
   - Responsibilities:
     - Initialize with provider (from env).
     - Send email with subject, to, html/text body, optional cc/bcc/reply-to.
     - Raise exception or return structured result on failure/success.
2. Integrate Resend
   - Using SDK (Option A):
     - Initialize client with `RESEND_API_KEY`.
     - Call `emails.send` with from/to/subject/html.
   - Using requests (Option B):
     - POST `https://api.resend.com/emails` with JSON body and `Authorization: Bearer <RESEND_API_KEY>`.
3. Update application code
   - Replace usages of Flask-Mail with calls to `services/mailer.py`.
   - Centralize template rendering (Jinja2) for HTML bodies.
4. Configuration
   - In Flask `Config`, add `RESEND_API_KEY`, `MAIL_FROM`, `EMAIL_PROVIDER`.
   - Ensure secrets are only in environment (Render dashboard).
5. Error handling & retries
   - Log full error context (without leaking secrets).
   - Implement simple retry/backoff for transient 5xx responses.
6. Observability
   - Log mail events in app logs.
   - Optionally subscribe to Resend webhooks for delivered/bounced events.
7. Security
   - Never commit API keys.
   - Validate email inputs; avoid header injection.
8. Testing
   - Unit test mailer with provider mocked.
   - End-to-end test in staging using Resend test key.

## Example (Option A: Resend SDK)

```python
# backend/services/mailer.py
import os
import resend

PROVIDER = os.getenv("EMAIL_PROVIDER", "resend").lower()
FROM = os.getenv("MAIL_FROM", "Hasamex <noreply@example.com>")
API_KEY = os.getenv("RESEND_API_KEY", "")

def send_email(to, subject, html, reply_to=None, cc=None, bcc=None):
    if PROVIDER != "resend":
        raise RuntimeError("Unsupported provider in production")
    resend.api_key = API_KEY
    payload = {
        "from": FROM,
        "to": [to] if isinstance(to, str) else to,
        "subject": subject,
        "html": html,
    }
    if reply_to:
        payload["reply_to"] = reply_to
    if cc:
        payload["cc"] = cc if isinstance(cc, list) else [cc]
    if bcc:
        payload["bcc"] = bcc if isinstance(bcc, list) else [bcc]
    return resend.Emails.send(payload)
```

## Example (Option B: requests)

```python
# backend/services/mailer.py
import os
import requests

PROVIDER = os.getenv("EMAIL_PROVIDER", "resend").lower()
FROM = os.getenv("MAIL_FROM", "Hasamex <noreply@example.com>")
API_KEY = os.getenv("RESEND_API_KEY", "")

def send_email(to, subject, html, reply_to=None, cc=None, bcc=None):
    if PROVIDER != "resend":
        raise RuntimeError("Unsupported provider in production")
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    data = {
        "from": FROM,
        "to": [to] if isinstance(to, str) else to,
        "subject": subject,
        "html": html,
    }
    if reply_to:
        data["reply_to"] = reply_to
    if cc:
        data["cc"] = cc if isinstance(cc, list) else [cc]
    if bcc:
        data["bcc"] = bcc if isinstance(bcc, list) else [bcc]
    r = requests.post("https://api.resend.com/emails", json=data, headers=headers, timeout=10)
    r.raise_for_status()
    return r.json()
```

## Template Strategy
- Store simple HTML templates under `backend/templates/email/`.
- Render with Jinja2 using minimal variables (subject/body).
- Avoid large inline CSS; keep transactional emails simple.

## Deployment Plan (Render)
- Add environment variables in the service:
  - `EMAIL_PROVIDER=resend`
  - `RESEND_API_KEY=****`
  - `MAIL_FROM=Hasamex <noreply@yourdomain.com>`
- Remove SMTP vars (`MAIL_USERNAME`, `MAIL_PASSWORD`, etc.) where no longer needed.
- No port changes required; email is sent over HTTPS.

## Setup Steps (Resend Dashboard)
1. Go to https://resend.com/ and create an account.
2. In the dashboard, create a sending domain and follow the prompts.
3. Add the DNS records (SPF and DKIM) shown by Resend at your domain registrar.
4. Wait for domain verification to complete in Resend.
5. In the Resend dashboard, create an API key and copy it.
6. Set the following in Render → Environment:
   - `EMAIL_PROVIDER=resend`
   - `RESEND_API_KEY=<your key>`
   - `MAIL_FROM=Hasamex <noreply@yourdomain.com>`
7. Redeploy the backend service.
8. Trigger a test email (e.g., forgot password OTP) to verify delivery.

## Rollout & Backout
- Rollout
  - Deploy feature flagged by `EMAIL_PROVIDER=resend`.
  - Send a test email from staging/production to confirm delivery and DKIM/SPF status.
- Backout
  - Switch back to SMTP locally by setting `EMAIL_PROVIDER=smtp` (if retained for dev).
  - Disable Resend by removing the API key.

## Cost & Limits
- Resend free tier is suitable for low-volume transactional emails.
- Monitor monthly usage; upgrade if volume increases.

## Deliverables
- New `backend/services/mailer.py` (provider-agnostic).
- Updated configuration in Flask `Config`.
- Basic unit tests for mailer.
- DNS setup for domain verification (SPF/DKIM).

## References
- Mail config present in [config.py](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/config.py).
- Resend API: Emails endpoint and authorization via Bearer token.
