# Render Backend Deployment Guide

This guide explains how to deploy your Flask backend on Render.

## 1. Prepare for Deployment
1. Log in to [Render](https://render.com/).
2. Create a **New Web Service**.
3. Select **Connect a GitHub repository** and choose your repository.

## 2. Configure Build and Run Commands
- **Name**: `hasamex-backend`
- **Region**: Same region as your Supabase DB.
- **Language**: `Python`
- **Branch**: `main` (or your preferred branch)
- **Root Directory**: `backend` (⚠️ **CRITICAL: Set this to the `backend` folder**)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn -b 0.0.0.0:$PORT "app:create_app()"` (⚠️ **CRITICAL: Bind to the PORT variable**)

## 3. Set Environment Variables
In the **Environment** tab, click **Add Environment Variable** and add these from your `flask.env`:

- `DB_HOST`: Your Supabase DB Host.
- `DB_PORT`: `5432` (Supabase Connection Pooler)
- `DB_NAME`: `postgres`
- `DB_USER`: `postgres`
- `DB_PASSWORD`: Your Supabase DB Password.
- `DB_DRIVER`: `postgresql`
- `SECRET_KEY`: Your Flask secret key.
- `JWT_SECRE`: Your JWT secret key.
- `JWT_EXPIRES_HOURS`: `24`
- `CORS_ORIGINS`: `https://your-frontend-vercel-url.vercel.app`
- `MAIL_SERVER`: `smtp.gmail.com`
- `MAIL_PORT`: `587`
- `MAIL_USE_TLS`: `True`
- `MAIL_USERNAME`: Your Gmail address.
- `MAIL_PASSWORD`: Your Google App Password.
- `MAIL_DEFAULT_SENDER`: `Hasamex <noreply@hasamex.com>`
- `FRONTEND_BASE_URL`: `https://your-frontend-vercel-url.vercel.app`

## 4. Deploy
1. Click **Create Web Service**.
2. Wait for the build to finish.
3. Once deployed, copy your backend URL (e.g., `https://hasamex-backend.onrender.com`).
4. **Note**: The free tier of Render "sleeps" after 15 minutes of inactivity. The first request after a sleep period may take ~30 seconds.
