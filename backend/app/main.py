from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from collections import deque
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
