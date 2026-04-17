@echo off
echo Starting High-Stability Tunnel (Pinggy) for SignalHire Webhook...
echo.
echo 1. When the terminal shows your URL (e.g., https://...pinggy.link)
echo 2. Copy it and paste into backend/flask.env under BACKEND_PUBLIC_URL=
echo.
echo IMPORTANT: If prompted 'Are you sure you want to continue connecting?', type 'yes' and press Enter.
echo.
ssh -p 443 -o StrictHostKeyChecking=no -R0:127.0.0.1:8080 a.pinggy.io
pause
