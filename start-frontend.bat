@echo off
REM KIMUN 2026 — frontend (Vite :5173, proxies /api to :8001)
cd /d "%~dp0frontend"
if not exist node_modules npm install
npm run dev
