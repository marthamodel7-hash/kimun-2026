# KIMUN 2026 Operations Center
FastAPI (Python 3.13) + SQLAlchemy 2.0 + Alembic + React 19 + Vite + TypeScript.
Dark glass luxury minimal UI. All seed rows are tagged `[DEMO]` (fictional).

## Ports (chosen to avoid squatters on this machine)
- Backend: **:8011** (`start-backend.bat`) — :8001 is taken by post-engine's API
- Frontend dev: **:5173** (`start-frontend.bat`) — :5173 may be taken by post-engine's web UI; use another port if so
- e2E uses backend :8011 + frontend :5199 (see `frontend/playwright.config.ts`)

## Run
```bat
start-backend.bat    REM API + docs at http://127.0.0.1:8011/docs
start-frontend.bat   REM UI at http://127.0.0.1:5173
```
Login `sg@kimun.demo / kimun123`. Wipe demo data: `cd backend && python -m app.seed --wipe`.

## Checks
```bat
cd backend && python -m pytest tests -q        REM 47 pass
cd frontend && npx tsc --noEmit                REM clean
cd frontend && npm run build                   REM green (tsc is noEmit typecheck only)
cd frontend && npm run e2e                     REM 5 Playwright flows (system Chrome, no download)
```

## Env
Copy `backend/.env.example` to `backend/.env`. AI keys live server-side only.
Provider is `AI_PROVIDER=gemini` (Google Gemini, `GEMINI_API_KEY`) or `nvidia` (NVIDIA Integrate, `NVIDIA_API_KEY`).
`KIMUN_ALLOW_POSTGRES=1` opts into the machine's `DATABASE_URL` (default: local SQLite).
`PLAYWRIGHT_BROWSERS_PATH` is overridden per-project (`.browsers/`); e2e uses system Chrome channel.

## Layout
- `backend/` FastAPI API. Run: `uvicorn app.main:app --reload --port 8011`
- `frontend/` Vite React UI (proxies /api -> :8011)
- Seed is explicitly fictional demo data.

## Team hierarchy + task assignment
Three tiers — **Executive Body** (leadership), **General Body** (dept heads + team members),
**Organizing Members** (volunteers). Roles already gate login permissions; the Team page groups
members under the 3 tier headings with quick "Assign task" buttons.

Who can assign: Executive Body + Dept Head only.
Who gets notified: the assignee (stored notification row, bell badge) + computed due/overdue
summary on the Notifications page and Dashboard.

Volunteers (Organizing Members) see only their own tasks, can update status only, and cannot
create/delete tasks. Their task list, Dashboard "My deadlines", and Notifications are scoped
to their own data.

Demo logins (all password `kimun123`):
- `sg@kimun.demo` — Executive Body (can assign, full access)
- `exec@kimun.demo` — Executive Body (Deputy SG, can assign)
- `general@kimun.demo` — General Body (Team Member, can see but not assign)
- `org@kimun.demo` — Organizing Member (Volunteer, sees only own tasks)

## Delegation module (Academics)
- `/groups` — school delegations (contacts, head delegate, fee agreed, status, ambassador code).
- `/allocation` — dedicated allocator: every committee's country matrix + capacity meter, and an
  unallocated queue whose country dropdowns only offer unused matrix countries.
- One country = one delegate per committee (duplicate block on create/update/allocate); countries
  outside a configured matrix are rejected. Matrices live under Committees → committee countries.
- Ambassador referrals are auto-tracked from live rows (never hand-set): groups +1, walk-in
  delegates +1; a grouped delegate counts under its group's code, never its own.

## Public Registration + Delegate Portal
- `/register` — multi-step public registration form (no login required). Individual delegate or
  delegation of 2-6 with head delegate selection, committee preferences, personal info.
- `/register/success` — post-registration: shows reference number, payment details (bank/JazzCash/
  Easypaisa), upload payment screenshot, submit proof.
- `/portal/login` — login with reference number (no password). Returns JWT for portal access.
- `/portal` — delegate portal with sidebar: Profile (QR badge, status), Committees (allotment),
  Study Guides (downloadable per-committee docs), Notes (personal CRUD).

Public API (no auth): `GET /api/public/committees`, `POST /api/public/register`,
`POST /api/public/login`, `POST /api/public/payment`, `POST /api/public/upload`.
Portal API (delegate JWT): `GET /api/portal/profile`, `GET /api/portal/committees`,
`GET /api/portal/study-guides`, `GET/POST/PUT/DELETE /api/portal/notes`.

Email: SMTP configurable via `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` in `.env`.
Falls back to console logging when not configured. Fees: Rs. 8,000 individual / Rs. 45,000
delegation of 6 (placeholder, configurable via `REGISTRATION_FEE_*`).

## Volunteer Recruitment Pipeline
- `/apply` — public application form (phone, email, city, photo, experience, department preference).
- `/apply/success` — confirmation page after submission.
- `/ops/applications` — admin operational panel: list/filter applications, schedule interviews,
  approve/reject. On approve → auto-generates reference number + creates User + sends selection
  email. On schedule → sends interview confirmation email.
- `/apply/portal/login` — volunteer login with reference number (no password).
- `/apply/portal` — department portal: profile, department tasks, guides.

Public API: `POST /api/public/apply`, `POST /api/public/apply/upload`, `POST /api/public/apply/login`.
Admin API: `GET /api/applications`, `GET /api/applications/{id}`, `PUT /api/applications/{id}`.
Portal API: `GET /api/apply/portal/profile`, `GET /api/apply/portal/tasks`, `GET /api/apply/portal/guides`.

3 emails: interview confirmation, selection (with reference number), rejection.
