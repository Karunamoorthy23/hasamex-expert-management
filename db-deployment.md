# Supabase Database Deployment Guide

This guide explains how to set up your PostgreSQL database on Supabase and migrate your schema.

## 1. Create a Supabase Project
1. Log in to [Supabase](https://supabase.com/).
2. Click **New Project** and select your organization.
3. Set a **Project Name** (e.g., `Hasamex-DB`).
4. Set a strong **Database Password**. **Save this password!**
5. Choose a region close to your users.
6. Click **Create new project**.

## 2. Get Connection String
1. Go to **Project Settings** (gear icon) -> **Database**.
2. Look for the **Connection string** section.
3. Select the **URI** tab.
4. Copy the URI. It will look like this:
   `postgresql://postgres:[YOUR-PASSWORD]@db.[REF].supabase.co:5432/postgres`
5. Replace `[YOUR-PASSWORD]` with the password you created in Step 1.

## 3. Run Migrations
You need to run the SQL migrations from your local project to Supabase.
1. In Supabase, go to **SQL Editor** in the left sidebar.
2. Click **New query**.
3. For each file in `backend/migrations/*.sql` (in numerical order 001 to 013):
   - Copy the content of the file.
   - Paste it into the Supabase SQL Editor.
   - Click **Run**.
4. **Important**: Run them one by one to ensure dependencies are handled correctly.

## 4. Environment Variables for Backend
You will need this connection string for your Render deployment:
- `DB_HOST`: `db.[REF].supabase.co`
- `DB_PORT`: `5432`
- `DB_NAME`: `postgres`
- `DB_USER`: `postgres`
- `DB_PASSWORD`: `[YOUR-PASSWORD]`
- `DB_DRIVER`: `postgresql`
