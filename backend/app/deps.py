"""RBAC: central permission map. Volunteers are tightly scoped."""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db import get_db
from app.security import decode_token
from app import models

bearer = HTTPBearer(auto_error=False)

LEADERSHIP = {"super_admin", "secretary_general", "deputy_sg", "director_general"}
STAFF = LEADERSHIP | {"dept_head", "team_member"}
ASSIGNERS = LEADERSHIP | {"dept_head"}  # can (re)assign tasks + deadlines
ORGANIZING = {"volunteer"}

# role → tier (UI grouping + display)
TIER_MAP = {
    "super_admin": "executive", "secretary_general": "executive",
    "deputy_sg": "executive", "director_general": "executive",
    "dept_head": "general", "team_member": "general",
    "volunteer": "organizing",
}
TIER_LABELS = {"executive": "Executive Body", "general": "General Body", "organizing": "Organizing Members"}
ROLE_LABELS = {
    "super_admin": "Super Admin", "secretary_general": "Secretary General",
    "deputy_sg": "Deputy SG", "director_general": "Director General",
    "dept_head": "Dept Head", "team_member": "Team Member", "volunteer": "Volunteer",
}


def tier_of(role: str) -> str:
    return TIER_MAP.get(role, "general")

# module -> roles allowed (volunteer handled specially: tasks-read only)
PERMISSIONS: dict[str, set[str]] = {
    "dashboard": STAFF | {"volunteer"},
    "tasks": STAFF | {"volunteer"},
    "team": STAFF,
    "timeline": STAFF,
    "delegates": STAFF,
    "committees": STAFF,
    "sponsors": STAFF,
    "finance": LEADERSHIP | {"dept_head"},
    "logistics": STAFF,
    "procurement": STAFF,
    "media": STAFF,
    "documents": STAFF,
    "approvals": LEADERSHIP | {"dept_head"},
    "risks": STAFF,
    "event_control": STAFF | {"volunteer"},
    "admin": LEADERSHIP,
    "settings": LEADERSHIP,
    "ai": STAFF,
}


def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)):
    if not creds:
        raise HTTPException(401, "Not authenticated")
    email = decode_token(creds.credentials)
    if not email:
        raise HTTPException(401, "Invalid token")
    u = db.query(models.User).filter_by(email=email).first()
    if not u or u.status != "active":
        raise HTTPException(401, "Unknown or inactive user")
    return u


def require(module: str):
    def check(u=Depends(current_user)):
        allowed = PERMISSIONS.get(module, set())
        if u.role not in allowed:
            raise HTTPException(403, f"Role {u.role} cannot access {module}")
        return u
    return check
