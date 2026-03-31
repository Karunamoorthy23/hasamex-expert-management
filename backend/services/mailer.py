"""
Email service — Provider-agnostic mailer using Brevo (primary) or Resend (legacy).
Uses direct HTTP API calls for simplicity (no external SDK required).
All config is read at call time to avoid stale env var issues.
"""

import os
import logging
import requests

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def _send_via_brevo(to, subject, html, reply_to=None, cc=None, bcc=None):
    """Send email using Brevo Transactional Email API."""
    api_key = os.getenv("BREVO_API_KEY", "")
    sender_name = os.getenv("MAIL_SENDER_NAME", "Hasamex")
    sender_email = os.getenv("MAIL_SENDER_EMAIL", "karunamoorthy179@gmail.com")

    if not api_key:
        raise RuntimeError("BREVO_API_KEY is not configured")

    # Log the key prefix for debugging (first 10 chars only)
    logger.info(f"[Brevo] Using API key: {api_key[:10]}...")

    # Build recipient list
    if isinstance(to, str):
        to_list = [{"email": to}]
    else:
        to_list = [{"email": addr} for addr in to]

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": to_list,
        "subject": subject,
        "htmlContent": html,
    }

    if reply_to:
        payload["replyTo"] = {"email": reply_to} if isinstance(reply_to, str) else {"email": reply_to[0]}

    if cc:
        cc_list = cc if isinstance(cc, list) else [cc]
        payload["cc"] = [{"email": addr} for addr in cc_list]

    if bcc:
        bcc_list = bcc if isinstance(bcc, list) else [bcc]
        payload["bcc"] = [{"email": addr} for addr in bcc_list]

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }

    response = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=15)

    if response.status_code >= 400:
        logger.error(f"[Brevo] Email send failed: {response.status_code} — {response.text}")
        response.raise_for_status()

    logger.info(f"[Brevo] Email sent to {to} — messageId: {response.json().get('messageId', 'N/A')}")
    return response.json()


def _send_via_resend(to, subject, html, reply_to=None, cc=None, bcc=None):
    """Legacy: Send email using Resend API (kept for backward compatibility)."""
    import resend

    resend_key = os.getenv("RESEND_API_KEY", "")
    mail_from = os.getenv("MAIL_FROM") or os.getenv("MAIL_DEFAULT_SENDER") or "Hasamex <noreply@hasamex.com>"

    if not resend_key:
        raise RuntimeError("RESEND_API_KEY is not configured")

    resend.api_key = resend_key
    payload = {
        "from": mail_from,
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


def send_email(to, subject, html, reply_to=None, cc=None, bcc=None):
    """
    Send an email using the configured provider.

    Supports:
      - 'brevo'  (default, recommended) — Brevo Transactional Email API
      - 'resend' (legacy fallback)      — Resend Email API

    Set EMAIL_PROVIDER env var to switch providers.
    """
    provider = (os.getenv("EMAIL_PROVIDER", "brevo") or "brevo").lower()

    if provider == "brevo":
        return _send_via_brevo(to, subject, html, reply_to, cc, bcc)
    elif provider == "resend":
        return _send_via_resend(to, subject, html, reply_to, cc, bcc)
    else:
        raise RuntimeError(f"Unsupported email provider: '{provider}'. Use 'brevo' or 'resend'.")
