@echo off
echo ================================================
echo    Scene Still - Sitemap Generator
echo ================================================
echo.

cd /d "%~dp0"

python generate-sitemap.py

echo.
echo ================================================
echo Press any key to exit...
pause >nul
