# Email Process Setup Guide (Hasamex)

To enable OTP email delivery for the Expert Searching App, follow these step-by-step instructions to configure your SMTP settings.

## 1. Setting Up a Gmail App Password (Recommended)

If you are using a Gmail account, you cannot use your regular password for security reasons. You must create an "App Password."

### Step-by-Step:
1.  **Enable 2-Step Verification**:
    - Go to your [Google Account](https://myaccount.google.com/).
    - Select **Security** from the left menu.
    - Under "How you sign in to Google," ensure **2-Step Verification** is turned **ON**.
2.  **Generate App Password**:
    - In the search bar at the top of your Google Account page, type **"App passwords"**.
    - Select **App passwords** from the results.
    - Enter a name for the app (e.g., "Hasamex App").
    - Click **Create**.
3.  **Copy the Password**:
    - A 16-character code (e.g., `abcd efgh ijkl mnop`) will appear in a yellow box.
    - **Copy this code immediately.** You will not be able to see it again.

---

## 2. Update Configuration in `flask.env`

Open the `backend/flask.env` file and update the following variables with your information:

```env
# MAIL CONFIGURATION
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com  # Your full Gmail address
MAIL_PASSWORD=abcdefghijklmnop      # The 16-character App Password (no spaces)
MAIL_DEFAULT_SENDER=Hasamex <noreply@hasamex.com>
```

---

## 3. Verify the Setup

1.  **Restart the Backend Server**:
    - Ensure the backend server is restarted so it can load the new environment variables.
2.  **Test the Forgot Password Flow**:
    - Go to the **Forgot Password** page in the frontend.
    - Enter a registered email address.
    - Click **Send OTP**.
3.  **Check Your Inbox**:
    - You should receive a professionally branded email from "Hasamex" containing your 6-digit OTP.

---

## Troubleshooting

- **Error: "Authentication Failed"**: Double-check your `MAIL_USERNAME` and ensure the `MAIL_PASSWORD` is correct (no spaces).
- **Error: "Connection Refused"**: Ensure `MAIL_PORT` is set to `587` and `MAIL_USE_TLS` is `True`.
- **OTP Not Received**: Check your **Spam** or **Junk** folder.
- **Development Fallback**: In `FLASK_ENV=development`, if the email fails, the OTP will still be logged in the API response/terminal for debugging.
