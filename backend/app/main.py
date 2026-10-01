from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from collections import deque
import os
import time
from app.db import init_db
from app.api import router, sub
from app.uploads import router as upload_router, mount_uploads

# In-memory sliding-window limits per client IP (single-process dev/small-team scope).
# AI inference is the expensive resource; uploads/imports are abuse-prone.
LIMITS = [("/api/ai/", 20, 60), ("/api/uploads", 30, 60), ("/api/delegates/import", 30, 60)]
_hits: dict[str, deque] = {}


def _limited(ip: str, path: str) -> bool:
    now = time.monotonic()
    for prefix, maxn, window in LIMITS:
        if path.startswith(prefix):
            key = f"{ip}|{prefix}"
            q = _hits.setdefault(key, deque())
            while q and q[0] <= now - window:
                q.popleft()
            if len(q) >= maxn:
                return True
            q.append(now)
    return False


# Startup diagnostics exposed by /api/health. The production database cannot be
# inspected from a laptop, so "why can't I log in?" has to be answerable over
# HTTP instead of from server logs (which do not surface stdout).
_STARTUP: dict = {"users": None, "admin": False, "seed": "not-run"}


def _seed_if_empty() -> None:
    """Guarantee a working admin login, mirroring start-backend.bat
    ("if not exist kimun.db python -m app.seed").

    Guard on the admin account that login actually needs, not on "does the
    users table have any rows": production may already hold real rows while
    still having no account anyone can sign in with, and a coarse emptiness
    check would silently skip seeding and leave /api/auth/login at 401.

    seed() only wipes on an explicit --wipe (which a server never passes).
    Any failure is recorded rather than raised so a seeding problem can never
    stop the app serving - but it must remain visible via /api/health.
    """
    try:
        from app.db import SessionLocal
        from app import models

        db = SessionLocal()
        try:
            _STARTUP["users"] = db.query(models.User).count()
            _STARTUP["admin"] = db.query(models.User).filter_by(email="sg@kimun.demo").count() > 0
        finally:
            db.close()
        if _STARTUP["admin"]:
            _STARTUP["seed"] = "already-present"
            return
        from app.seed import seed
        seed()
        _STARTUP["seed"] = "seeded"
    except Exception as exc:
        _STARTUP["seed"] = f"error: {type(exc).__name__}: {exc}"[:300]
        print(f"[seed] {type(exc).__name__}: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    _seed_if_empty()
    yield


app = FastAPI(title="KIMUN 2026 Operations Center", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    if _limited(ip, request.url.path):
        return JSONResponse({"detail": "Rate limit exceeded, retry shortly."}, status_code=429,
                            headers={"Retry-After": "60"})
    return await call_next(request)


app.include_router(router, prefix="/api")
app.include_router(sub, prefix="/api")
app.include_router(upload_router, prefix="/api")
mount_uploads(app)


@app.get("/api/health")
def health():
    return {"ok": True, "app": "kimun-2026", "startup": _STARTUP}


# ─── Serve frontend static files (Vercel deployment) ────────────────
_FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
_FRONTEND_DIST = os.path.normpath(_FRONTEND_DIST)
_APP_HAS_FRONTEND = os.path.isdir(_FRONTEND_DIST)

if _APP_HAS_FRONTEND:
    _assets_dir = os.path.join(_FRONTEND_DIST, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve frontend SPA — try static file, fall back to index.html."""
        file_path = os.path.join(_FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index = os.path.join(_FRONTEND_DIST, "index.html")
        if os.path.isfile(index):
            return FileResponse(index)
        return JSONResponse({"detail": "Not found"}, status_code=404)
