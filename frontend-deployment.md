# Vercel Frontend Deployment Guide

This guide explains how to deploy your React frontend on Vercel.

## 1. Prepare for Deployment
1. Log in to [Vercel](https://vercel.com/).
2. Create a **New Project**.
3. Select **Connect a GitHub repository** and choose your repository.

## 2. Configure Build and Run Commands
- **Framework Preset**: `Vite` (or `Other` if not detected)
- **Root Directory**: `frontend` (⚠️ **CRITICAL: Click "Edit" and set this to `frontend` folder**)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 3. Set Environment Variables
In the **Environment Variables** section, add:

- `VITE_API_URL`: `https://hasamex-backend.onrender.com/api/v1`
  - (Replace `hasamex-backend.onrender.com` with your actual Render backend URL)

## 4. Deploy
1. Click **Deploy**.
2. Wait for the build and deployment to finish.
3. Once deployed, Vercel will give you a production URL (e.g., `https://hasamex-frontend.vercel.app`).
4. **Important**: Go back to your Render backend environment variables and update `CORS_ORIGINS` and `FRONTEND_BASE_URL` with this Vercel URL.

## 5. Deployment Checklist
1. **Supabase**: Schema and tables migrated correctly.
2. **Render**: Backend connected to Supabase and configured with your Vercel URL in CORS.
3. **Vercel**: Frontend configured with your Render backend URL.
4. **Email**: SMTP settings correctly configured in Render for OTP functionality.
