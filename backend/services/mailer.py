import os
import resend

PROVIDER = (os.getenv("EMAIL_PROVIDER", "resend") or "resend").lower()
FROM = os.getenv("MAIL_FROM") or os.getenv("MAIL_DEFAULT_SENDER") or "Hasamex <noreply@hasamex.com>"
API_KEY = os.getenv("RESEND_API_KEY", "")

def send_email(to, subject, html, reply_to=None, cc=None, bcc=None):
    if PROVIDER != "resend":
        raise RuntimeError("Unsupported email provider")
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
