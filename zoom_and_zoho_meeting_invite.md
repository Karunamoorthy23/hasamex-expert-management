# Implementation Plan - Automatic Zoom Meetings & Zoho Calendar Invitations (Revised)

This plan outlines the implementation of automatic Zoom meeting generation and Zoho Calendar invitations. We will use specific data triggers from the Engagement system and maintain privacy by sending separate invitations to the expert and the client.

## User Review Required

> [!IMPORTANT]
> - **Zoho OAuth Grant Token**: As noted, the "Self Client" code only lasts 10 minutes. This code is used **only once** to generate a permanent **Refresh Token**, which we will store in the backend to manage the calendar indefinitely.
> - **Privacy**: We will create two distinct Zoho events for κάθε engagement to ensure the expert and client never see each other's contact information.

## Step 1: Data Source Mapping

To minimize data entry, the meeting details will be pulled automatically from the database:

| Detail | Source |
| :--- | :--- |
| **Project Title** | `engagement.project.title` |
| **Call Date & Time** | `engagement.call_date` |
| **Duration** | `engagement.actual_call_duration_mins` (defaulting to 60 if empty) |
| **Timezone** | `engagement.expert_timezone` (or `engagement.client_timezone`) |
| **Expert Email** | `engagement.expert.primary_email` |
| **Client Emails** | `User.email` (mapped via `engagement.poc_user_id` record) |
| **Organizer** | The user account linked to the Zoho Refresh Token |

---

## Step 2: API Key Procurement Guide (Refined)

### Zoho Calendar API (OAuth 2.0)
1. Go to the [Zoho API Console](https://api-console.zoho.com/).
2. Select **Server-based Application** and click **Create**.
3. **Authorized Redirect URIs**: Use `http://localhost:8080`.
4. Note down the **Client ID** and **Client Secret**.
5. **Generate the One-Time Grant Token**:
   - Go to the **Self Client** tab.
   - Enter Scopes: `ZohoCalendar.event.ALL`, `ZohoCalendar.calendar.READ`.
   - Set Duration: **10 minutes** (max allowed for self-client).
   - Click **Generate Code**.
6. **Exchange for Refresh Token**: 
   - **Immediately** share this code with me, or run a POST request to Zoho to get the `refresh_token`.
   - I will help you exchange the 10-minute code for a **Permanent Refresh Token**.
7. Store the `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, and `ZOHO_REFRESH_TOKEN` in `flask.env`.

### Zoom API (Server-to-Server OAuth)
1. Go to the [Zoom App Marketplace](https://marketplace.zoom.us/).
2. Create a **Server-to-Server OAuth** app.
3. Note the `Account ID`, `Client ID`, and `Client Secret`.
4. Add these to `flask.env`.

---

## Step 3: Technical Implementation logic

### Database SQL
#### [NEW] [035_add_zoom_calendar_fields.sql](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/migrations/035_add_zoom_calendar_fields.sql)
```sql
ALTER TABLE engagements ADD COLUMN zoom_meeting_id VARCHAR(100);
ALTER TABLE engagements ADD COLUMN zoom_join_url TEXT;
ALTER TABLE engagements ADD COLUMN zoom_start_url TEXT;
ALTER TABLE engagements ADD COLUMN zoom_password VARCHAR(100);
ALTER TABLE engagements ADD COLUMN zoho_event_id_expert VARCHAR(100);
ALTER TABLE engagements ADD COLUMN zoho_event_id_client VARCHAR(100);
```

### Backend Services
- **ZoomService**: Handles Zoom OAuth and creates a unique meeting link per engagement.
- **ZohoService**:
    - Uses Refresh Token to get a fresh Access Token.
    - Fetch Expert Email from `Expert` table.
    - Fetch Client Email from `User` table using `poc_user_id`.
    - Create two separate events with the compliance notes and Zoom link.

### Trigger Actions
- Add a **"Generate Meeting & Invites"** button to the `EngagementEditPage`.
- This button will call a new backend endpoint `/api/v1/engagements/<id>/schedule`.

## Verification Plan

1. **Token Exchange**: Verify the 10-minute code is successfully converted to a permanent Refresh Token.
2. **Scheduling Flow**: Trigger the schedule action and verify:
    - Zoom meeting is created.
    - Zoho Event 1 is created for Expert (only Expert visible as guest).
    - Zoho Event 2 is created for Client (only Client visible as guest).
    - Both events have the same Zoom link.
3. **Persistence**: Verify all IDs and URLs are saved in the database engagement record.


I have successfully implemented the automated Zoom meeting creation and Zoho Calendar invitation system.

Key Features Implemented:
Zoom Integration: Automated generation of unique meeting links via Server-to-Server OAuth.
Zoho Calendar Integration:
Exchanged your grant token for a permanent Refresh Token on the zoho.in domain.
Implemented Dual-Invitation Logic: The system sends separate invites to the Expert and the Client. This ensures they both get the same Zoom link but cannot see each other's email addresses, maintaining strict privacy.
Engagement Dashboard:
Added a "Schedule Call" button to the Engagement Edit page.
Added a display section in the form that shows the generated Zoom Meeting ID, Password, and Join URL for quick reference.
Automatic Data Retrieval:
Project Title is pulled from the linked project.
Timing, Duration, and Timezone are pulled from the engagement details.
Expert Email is pulled from the expert profile.
Client Email is pulled from the assigned POC User.
You can find the full details of the implementation in the 
Walkthrough
. The system is now ready for use!