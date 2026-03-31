# Brevo Email Integration — Setup Guide (Hasamex)

This guide walks you through the complete process of setting up **Brevo** (formerly Sendinblue) as the email provider for the Hasamex Expert Database application.

---

## Why Brevo?

| Feature | Brevo | Resend (Previous) |
|---------|-------|-------------------|
| Free tier | **300 emails/day** (no monthly limit) | 100 emails/day |
| Transactional email API | ✅ REST API | ✅ REST API |
| SMTP relay | ✅ Included | ❌ No |
| Email templates | ✅ Drag & drop builder | ⚠️ Basic |
| Contact management | ✅ Built-in CRM | ❌ No |
| Analytics & tracking | ✅ Opens, clicks, bounces | ✅ Basic |
| Domain verification | ✅ SPF, DKIM, DMARC | ✅ SPF, DKIM |
| Pricing | Free → $9/month (20K emails) | Free → $20/month |

---

## Step-by-Step Setup

### Step 1: Create a Brevo Account

1. Go to **[https://www.brevo.com](https://www.brevo.com)**
2. Click **"Sign Up Free"**
3. Fill in your details:
   - Email address
   - Password
   - Company name: `Hasamex`
4. Verify your email address by clicking the link in the confirmation email
5. Complete the onboarding questionnaire

---

### Step 2: Generate an API Key

1. Log in to the Brevo dashboard
2. Click your **profile icon** (top-right corner)
3. Go to **SMTP & API** (or navigate to: `https://app.brevo.com/settings/keys/api`)
4. Click **"Generate a new API key"**
5. Give it a name: `Hasamex Production`
6. Click **Generate**
7. **Copy the API key immediately** — it starts with `xkeysib-...`

> ⚠️ **Important:** You will only see the full key once. Copy and save it securely.

---

### Step 3: Verify Your Sender Email / Domain

Brevo requires sender verification before you can send emails.

#### Option A: Verify a Single Sender Email (Quick Start)

1. Go to **Senders, Domains & Dedicated IPs** (Settings → Senders & IP)
   - Or navigate to: `https://app.brevo.com/senders/list`
2. Click **"Add a Sender"**
3. Enter:
   - **From Name:** `Hasamex`
   - **From Email:** Your email address (e.g., `admin@yourdomain.com`)
4. Click **Save**
5. Check your inbox and click the **verification link**

#### Option B: Verify Your Domain (Recommended for Production)

1. Go to **Senders, Domains & Dedicated IPs** → **Domains** tab
2. Click **"Add a Domain"**
3. Enter your domain: `yourdomain.com`
4. Brevo will show you **DNS records** to add:

| Record Type | Name | Value |
|------------|------|-------|
| **TXT** (SPF) | `@` | `v=spf1 include:sendinblue.com ~all` |
| **TXT** (DKIM) | `mail._domainkey` | `(provided by Brevo)` |
| **TXT** (Optional DMARC) | `_dmarc` | `v=DMARC1; p=none;` |

5. Add these DNS records at your domain registrar (GoDaddy, Cloudflare, Namecheap, etc.)
6. Return to Brevo and click **"Verify"**
7. Wait for verification (usually 15 min – 24 hours)

---

### Step 4: Update Environment Variables

Open the file `backend/flask.env` and update the Brevo configuration:

```env
# Brevo Configuration (Primary Email Provider)
EMAIL_PROVIDER=brevo
BREVO_API_KEY=xkeysib-your-actual-api-key-here
MAIL_SENDER_NAME=Hasamex
MAIL_SENDER_EMAIL=admin@yourdomain.com
```

#### Environment Variable Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `EMAIL_PROVIDER` | ✅ | Email provider to use | `brevo` |
| `BREVO_API_KEY` | ✅ | Your Brevo API key | `xkeysib-abc123...` |
| `MAIL_SENDER_NAME` | ✅ | Sender display name | `Hasamex` |
| `MAIL_SENDER_EMAIL` | ✅ | Verified sender email | `admin@yourdomain.com` |

> ⚠️ **The `MAIL_SENDER_EMAIL` must be a verified sender in your Brevo dashboard.** Using an unverified email will cause API errors.

---

### Step 5: Install Dependencies

If you haven't already, install the `requests` library:

```bash
cd backend
pip install requests
```

Or install all dependencies:

```bash
pip install -r requirements.txt
```

---

### Step 6: Restart the Backend Server

```bash
# If running locally
cd backend
python app.py

# Or if using gunicorn
gunicorn app:app --bind 0.0.0.0:8080
```

---

### Step 7: Test the Integration

#### Option A: Test via Forgot Password Flow

1. Open the frontend: `http://localhost:5173`
2. Go to the **Forgot Password** page
3. Enter a registered Hasamex user email
4. Click **Send OTP**
5. Check the inbox for the OTP email
6. Verify the email arrives with the "Hasamex" sender name

#### Option B: Test via Python Script

Create a quick test script:

```python
# backend/test_brevo_email.py
import os
os.environ['EMAIL_PROVIDER'] = 'brevo'
os.environ['BREVO_API_KEY'] = 'xkeysib-your-key-here'
os.environ['MAIL_SENDER_NAME'] = 'Hasamex'
os.environ['MAIL_SENDER_EMAIL'] = 'admin@yourdomain.com'

from services.mailer import send_email

result = send_email(
    to="your-test-email@gmail.com",
    subject="Hasamex — Brevo Test Email",
    html="<h1>Hello!</h1><p>This is a test email from the Hasamex app via Brevo.</p>"
)
print(f"✅ Email sent! Response: {result}")
```

Run it:

```bash
cd backend
python test_brevo_email.py
```

---

## Deployment (Render / Production)

### Add Environment Variables in Render Dashboard

1. Go to your Render service dashboard
2. Navigate to **Environment** tab
3. Add (or update) the following variables:

| Key | Value |
|-----|-------|
| `EMAIL_PROVIDER` | `brevo` |
| `BREVO_API_KEY` | `xkeysib-your-production-key` |
| `MAIL_SENDER_NAME` | `Hasamex` |
| `MAIL_SENDER_EMAIL` | `admin@yourdomain.com` |

4. Remove the old Resend variables (or leave them — they won't be used):
   - `RESEND_API_KEY` (optional: remove)

5. Click **Save Changes** → Render will auto-redeploy

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| **401 Unauthorized** | Invalid API key | Double-check `BREVO_API_KEY` in `.env` — must start with `xkeysib-` |
| **403 Forbidden** | Sender not verified | Verify your sender email/domain in Brevo dashboard |
| **400 Bad Request — "sender not found"** | `MAIL_SENDER_EMAIL` doesn't match verified sender | Update `MAIL_SENDER_EMAIL` to match exactly what's verified in Brevo |
| **Email lands in Spam** | Domain not authenticated | Add SPF + DKIM DNS records (see Step 3, Option B) |
| **Email not received at all** | Brevo daily limit reached (free tier: 300/day) | Wait 24 hours or upgrade plan |
| **Connection timeout** | Network issue or firewall blocking | Ensure outbound HTTPS (port 443) to `api.brevo.com` is allowed |
| **`RuntimeError: Unsupported email provider`** | `EMAIL_PROVIDER` set to wrong value | Set `EMAIL_PROVIDER=brevo` in `.env` |

### Check Brevo Logs

1. Log in to Brevo dashboard
2. Go to **Transactional** → **Logs**
3. You can see all sent/failed emails with detailed status

---

## Switching Back to Resend (Rollback)

If you need to switch back to Resend:

1. Update `backend/flask.env`:
   ```env
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_your_resend_key_here
   MAIL_FROM=Hasamex <noreply@hasamex.com>
   ```

2. Restart the backend server

No code changes needed — the mailer supports both providers via the `EMAIL_PROVIDER` toggle.

---

## Architecture — How It Works

```
                      ┌──────────────────────┐
                      │   Flask Backend      │
                      │   routes/auth.py     │
                      │                      │
                      │   send_email(        │
                      │     to, subject, html│
                      │   )                  │
                      └──────────┬───────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │  services/mailer.py  │
                      │                      │
                      │  if PROVIDER == brevo │
                      │    → _send_via_brevo  │
                      │  elif resend         │
                      │    → _send_via_resend │
                      └──────────┬───────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
         ┌──────────────────┐     ┌──────────────────┐
         │   Brevo API       │     │   Resend API      │
         │   (PRIMARY)       │     │   (LEGACY)         │
         │                   │     │                    │
         │   POST            │     │   resend.Emails    │
         │   api.brevo.com   │     │   .send()          │
         │   /v3/smtp/email  │     │                    │
         └──────────────────┘     └──────────────────┘
```

---

## Files Changed

| File | Change |
|------|--------|
| `backend/services/mailer.py` | Rewritten — Brevo via HTTP API (primary), Resend as legacy fallback |
| `backend/config.py` | Added `BREVO_API_KEY`, `MAIL_SENDER_NAME`, `MAIL_SENDER_EMAIL`; default provider changed to `brevo` |
| `backend/flask.env` | Updated to Brevo config; old Resend config commented out |
| `backend/requirements.txt` | Added `requests` package |
| `backend/routes/auth.py` | **No changes** — `send_email()` function signature is unchanged |

---

## Brevo Free Tier Limits

| Feature | Free Tier | Starter Plan ($9/mo) |
|---------|-----------|---------------------|
| Emails per day | **300** | **20,000/month** (no daily limit) |
| Contacts | Unlimited | Unlimited |
| Transactional API | ✅ | ✅ |
| Email templates | ✅ | ✅ |
| Analytics | Basic | Advanced |
| No Brevo branding | ❌ | ✅ |

For Hasamex's current volume (OTP emails + occasional expert outreach), the free tier should be sufficient.
