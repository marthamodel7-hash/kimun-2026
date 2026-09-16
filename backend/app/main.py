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


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
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
    return {"ok": True, "app": "kimun-2026"}


@app.get("/api/debug/frontend-path")
def debug_frontend():
    """Debug: check if frontend/dist is accessible from the serverless function."""
    import os
    _FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
    _FRONTEND_DIST = os.path.normpath(_FRONTEND_DIST)
    exists = os.path.isdir(_FRONTEND_DIST)
    files = os.listdir(_FRONTEND_DIST) if exists else []
    return {"path": _FRONTEND_DIST, "exists": exists, "files": files[:20],
            "dirname": os.path.dirname(__file__), "cwd": os.getcwd()}


@app.get("/api/debug/tree")
def debug_tree():
    """Debug: show directory tree around the function."""
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.normpath(os.path.join(here, ".."))
    result = {"here": here, "project_root": project_root, "cwd": os.getcwd()}
    # Check common locations
    for name, path in [
        ("root", project_root),
        ("root/frontend", os.path.join(project_root, "frontend")),
        ("root/frontend/dist", os.path.join(project_root, "frontend", "dist")),
        ("root/api", os.path.join(project_root, "api")),
    ]:
        result[name] = os.path.isdir(path)
    # List project root
    try:
        result["root_files"] = os.listdir(project_root)[:30]
    except:
        result["root_files"] = "error"
    return result


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
