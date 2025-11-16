@echo off
REM SmartSchedule Deployment Script for Vercel

echo ================================================
echo SmartSchedule - Vercel Deployment
echo ================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Vercel login status...
vercel whoami
if errorlevel 1 (
    echo.
    echo You need to login to Vercel first.
    echo Run: vercel login
    pause
    exit /b 1
)

echo.
echo [2/3] Deploying to Vercel...
echo.
vercel --prod

echo.
echo ================================================
echo Deployment Complete!
echo ================================================
echo.
echo IMPORTANT: Don't forget to set environment variables in Vercel Dashboard:
echo 1. Go to: https://vercel.com/dashboard
echo 2. Select your project
echo 3. Go to Settings ^> Environment Variables
echo 4. Add these variables:
echo    - GEMINI_API_KEY
echo    - MONGO_URI
echo.
echo [3/3] Opening Vercel Dashboard...
start https://vercel.com/dashboard
echo.
pause
