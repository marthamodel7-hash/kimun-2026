"""File uploads — proofs, receipts, assets. Validated, size-capped.
On Vercel (serverless), files are stored as base64 in the response
for client-side handling. For production, use Vercel Blob or S3."""
import base64
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.deps import current_user
from app.core_config import settings  # noqa: F401 (keeps env contract visible)

ALLOWED = {".png", ".jpg", ".jpeg", ".webp", ".pdf", ".csv", ".txt", ".mp4", ".mov"}
MAX_BYTES = 25 * 1024 * 1024

router = APIRouter()

# Check if we're on Vercel (no persistent filesystem)
_is_vercel = os.getenv("VERCEL", "") == "1"

# Module-level constant so api.py can do: from app.uploads import UPLOAD_DIR
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")


@router.post("/uploads")
async def upload(f: UploadFile = File(...), u=Depends(current_user)):
    ext = os.path.splitext(f.filename or "")[1].lower()
    if ext not in ALLOWED:
        raise HTTPException(400, f"File type {ext} not allowed ({sorted(ALLOWED)})")
    data = await f.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(400, "File over 25MB limit")

    if _is_vercel:
        # On Vercel: return base64 data URL (client can display/upload later)
        b64 = base64.b64encode(data).decode()
        mime = f.content_type or "application/octet-stream"
        return {
            "url": f"data:{mime};base64,{b64}",
            "filename": f.filename,
            "bytes": len(data),
            "storage": "inline",
        }
    else:
        # Local dev: save to disk
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        name = f"{uuid.uuid4().hex}{ext}"
        with open(os.path.join(UPLOAD_DIR, name), "wb") as out:
            out.write(data)
        return {"url": f"/uploads/{name}", "filename": f.filename, "bytes": len(data)}


def mount_uploads(app):
    if not _is_vercel:
        from fastapi.staticfiles import StaticFiles
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
