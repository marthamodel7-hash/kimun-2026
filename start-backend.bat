@echo off
REM KIMUN 2026 — backend (FastAPI :8011; :8001 is taken by post-engine)
cd /d "%~dp0backend"
if not exist .env copy .env.example .env
if not exist kimun.db python -m app.seed
python -m uvicorn app.main:app --reload --port 8011
