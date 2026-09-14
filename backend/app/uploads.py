"""Local file uploads — proofs, receipts, assets. Validated, size-capped, served at /uploads."""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from app.deps import current_user
from app.core_config import settings  # noqa: F401 (keeps env contract visible)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED = {".png", ".jpg", ".jpeg", ".webp", ".pdf", ".csv", ".txt", ".mp4", ".mov"}
MAX_BYTES = 25 * 1024 * 1024

router = APIRouter()


@router.post("/uploads")
async def upload(f: UploadFile = File(...), u=Depends(current_user)):
    ext = os.path.splitext(f.filename or "")[1].lower()
    if ext not in ALLOWED:
        raise HTTPException(400, f"File type {ext} not allowed ({sorted(ALLOWED)})")
    data = await f.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(400, "File over 25MB limit")
    name = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(UPLOAD_DIR, name), "wb") as out:
        out.write(data)
    return {"url": f"/uploads/{name}", "filename": f.filename, "bytes": len(data)}


def mount_uploads(app):
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
