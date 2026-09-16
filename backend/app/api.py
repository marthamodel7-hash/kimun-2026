"""All API routers — REST/JSON, auth enforced, validated, audited via ActivityEvent."""
import csv
import io
import logging
import os
import secrets as _sec
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import PlainTextResponse, Response
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db import get_db
from app import models
from app.models import utcnow
from app.deps import current_user, require, PERMISSIONS, tier_of, TIER_LABELS, ROLE_LABELS, LEADERSHIP, STAFF, ASSIGNERS, ORGANIZING
from app.security import hash_password, verify_password, create_token
from app.services_activity import emit, notify
from app.services_readiness import compute_readiness
from app.services_ai import AIService, MODEL_REGISTRY, ALLOWED_TASKS
from app.core_config import settings

router = APIRouter()
_log = logging.getLogger("api")


# ---------- auth ----------
class LoginIn(BaseModel):
    email: str
    password: str


class UserIn(BaseModel):
    name: str
    email: str
    password: str
    role: str = "team_member"
    department_id: int | None = None
    phone: str = ""
    reference_number: str = ""


@router.post("/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    u = db.query(models.User).filter_by(email=body.email).first()
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "Invalid credentials")
    emit(db, u.email, "login", "user", u.id, f"{u.email} logged in")
    return {"token": create_token(u.email), "user": {"id": u.id, "name": u.name, "email": u.email, "role": u.role}}


@router.get("/auth/me")
def me(u=Depends(current_user)):
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role,
            "tier": tier_of(u.role), "tier_label": TIER_LABELS.get(tier_of(u.role), ""),
            "department_id": u.department_id}


@router.get("/users", dependencies=[Depends(require("team"))])
def list_users(db: Session = Depends(get_db)):
    depts = {d.id: d.name for d in db.query(models.Department).all()}
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "tier": tier_of(u.role),
             "tier_label": TIER_LABELS.get(tier_of(u.role), ""),
             "role_label": ROLE_LABELS.get(u.role, u.role),
             "department_id": u.department_id,
             "department_name": depts.get(u.department_id, ""),
             "reference_number": u.reference_number,
             "phone": u.phone, "status": u.status, "availability": u.availability} for u in db.query(models.User).all()]


@router.post("/users", dependencies=[Depends(require("admin"))])
def create_user(body: UserIn, db: Session = Depends(get_db), u=Depends(current_user)):
    if db.query(models.User).filter_by(email=body.email).first():
        raise HTTPException(400, "Email exists")
    # Auto-generate reference number if department assigned and no reference provided
    ref = body.reference_number.strip().upper() if body.reference_number else ""
    if not ref and body.department_id:
        dept = db.get(models.Department, body.department_id)
        if dept and dept.code:
            ref = f"KIM-{dept.code.upper()}-{_sec.token_hex(2).upper()}"
    nu = models.User(name=body.name, email=body.email, password_hash=hash_password(body.password),
                     role=body.role, department_id=body.department_id, phone=body.phone,
                     reference_number=ref)
    db.add(nu); db.commit(); db.refresh(nu)
    emit(db, u.email, "created", "user", nu.id, f"Created user {nu.email}")
    return {"id": nu.id, "reference_number": ref}


@router.get("/departments", dependencies=[Depends(require("dashboard"))])
def list_depts(db: Session = Depends(get_db)):
    return [{"id": d.id, "name": d.name} for d in db.query(models.Department).all()]


# ---------- generic CRUD helper ----------
def coerce_dates(model, body: dict) -> dict:
    """Convert ISO date strings to date objects for Date columns (SQLite requires it)."""
    from sqlalchemy import inspect as sa_inspect
    from sqlalchemy import Date as SADate
    date_cols = {c.key for c in sa_inspect(model).columns if isinstance(c.type, SADate)}
    out = dict(body)
    for k in date_cols & set(out):
        v = out[k]
        if isinstance(v, str) and v.strip():
            try:
                out[k] = date.fromisoformat(v.strip())
            except ValueError:
                raise HTTPException(400, f"Invalid date for {k}: {v}")
        elif v == "":
            out[k] = None
    return out


def spawn_next_occurrence(db: Session, model, o, prev_status: str | None, actor: str) -> int | None:
    """Recurring tasks: completing a weekly/monthly task clones the next occurrence."""
    if model is not models.Task:
        return None
    if getattr(o, "status", None) != "completed" or prev_status == "completed":
        return None
    step = {"weekly": 7, "monthly": 30}.get(getattr(o, "recurrence", "") or "")
    if not step:
        return None
    nxt = models.Task(title=o.title, description=o.description, department_id=o.department_id,
                      project=o.project, owner_id=o.owner_id, priority=o.priority, status="todo",
                      start_date=o.due_date, due_date=(o.due_date + timedelta(days=step)) if o.due_date else None,
                      tags=o.tags, recurrence=o.recurrence, created_by_id=o.created_by_id)
    db.add(nxt); db.commit(); db.refresh(nxt)
    emit(db, actor, "spawned", "tasks", nxt.id, f"Recurrence ({o.recurrence}) of task #{o.id}")
    return nxt.id


def crud(prefix: str, model, fields: list[str], module: str, search: list[str] | None = None,
         cascade_child=None, validate=None, after_create=None, after_update=None, before_delete=None,
         list_scope=None, serialize=None):
    """Generic CRUD router.

    Options:
      cascade_child  — child model whose rows die with the parent (e.g. AssetVersion).
      validate       — validate(db, clean, o, actor) may raise HTTPException before any write.
      after_create   — after_create(db, o, actor) side-effects fired after commit (may commit itself).
      after_update   — after_update(db, o, prev, actor) fired after commit; prev = snapshot of fields.
      before_delete  — before_delete(db, o, actor) fired before the row is removed (may mutate).
      list_scope     — list_scope(db, u, query) returns a filtered query (role-based scoping).
      serialize      — serialize(o) returns dict; replaces the default per-row build (enrichment).
    """
    r = APIRouter()

    @r.get(f"/{prefix}")
    def lst(db: Session = Depends(get_db), u=Depends(require(module)), q: str = "", status: str = "",
            limit: int = 200, offset: int = 0):
        query = db.query(model)
        if q and search:
            from sqlalchemy import or_
            query = query.filter(or_(*[getattr(model, f).ilike(f"%{q}%") for f in search]))
        if status and hasattr(model, "status"):
            query = query.filter(getattr(model, "status") == status)
        if status and hasattr(model, "pipeline_status"):
            query = query.filter(getattr(model, "pipeline_status") == status)
        if status and hasattr(model, "pay_status"):
            query = query.filter(getattr(model, "pay_status") == status)
        if list_scope:
            query = list_scope(db, u, query)
        rows = query.offset(max(offset, 0)).limit(min(max(limit, 1), 500)).all()
        out = []
        for o in rows:
            if serialize:
                d = serialize(o)
            else:
                d = {"id": o.id}
                for f in fields:
                    v = getattr(o, f, None)
                    d[f] = str(v) if isinstance(v, date) and v else v
            out.append(d)
        return out

    @r.post(f"/{prefix}")
    def create(body: dict, db: Session = Depends(get_db), u=Depends(require(module))):
        clean = coerce_dates(model, body)
        if validate:
            validate(db, clean, None, u.email)
        o = model()
        for f in fields:
            if f in clean and f != "id":
                setattr(o, f, clean[f])
        db.add(o); db.commit(); db.refresh(o)
        if after_create:
            after_create(db, o, u.email)
        emit(db, u.email, "created", prefix, o.id, f"Created {prefix} #{o.id}")
        return {"id": o.id}

    @r.put(f"/{prefix}/{{oid}}")
    def update(oid: int, body: dict, db: Session = Depends(get_db), u=Depends(require(module))):
        o = db.get(model, oid)
        if not o:
            raise HTTPException(404, "Not found")
        prev = {f: getattr(o, f, None) for f in fields}
        clean = coerce_dates(model, body)
        if validate:
            validate(db, clean, o, u.email)
        for f in fields:
            if f in clean:
                setattr(o, f, clean[f])
        db.commit()
        if after_update:
            after_update(db, o, prev, u.email)
        emit(db, u.email, "updated", prefix, oid, f"Updated {prefix} #{oid}")
        spawned = spawn_next_occurrence(db, model, o, prev.get("status"), u.email)
        return {"ok": True, **({"spawned_id": spawned} if spawned else {})}

    @r.delete(f"/{prefix}/{{oid}}")
    def delete(oid: int, db: Session = Depends(get_db), u=Depends(require(module))):
        o = db.get(model, oid)
        if not o:
            raise HTTPException(404, "Not found")
        if before_delete:
            before_delete(db, o, u.email)
        if cascade_child is not None:
            db.query(cascade_child).filter(cascade_child.asset_id == oid).delete()
        db.delete(o); db.commit()
        emit(db, u.email, "deleted", prefix, oid, f"Deleted {prefix} #{oid}")
        return {"ok": True}

    return r


TASK_FIELDS = ["title", "description", "department_id", "project", "owner_id", "priority", "status",
               "start_date", "due_date", "tags", "recurrence", "depends_on_id"]
DELEG_FIELDS = ["name", "institution", "email", "phone", "committee_id", "country", "group_id", "reg_status",
                "pay_status", "amount_paid", "attendance", "accommodation", "transport", "notes", "ambassador_code",
                "checkin_code", "badge_url", "registration_token", "email_verified", "registration_completed_at",
                "fee_amount", "payment_reference", "payment_screenshot_url", "photo_url", "experience_level",
                "emergency_contact_name", "emergency_contact_phone", "dietary_restrictions", "tshirt_size",
                "registration_type", "committee_preferences"]
GROUP_FIELDS = ["name", "contact_name", "contact_email", "contact_phone", "head_delegate_id", "fee_agreed",
                "status", "ambassador_code", "notes"]
SPONS_FIELDS = ["organization", "contact_name", "contact_email", "contact_phone", "package", "value",
                "amount_received", "pipeline_status", "payment_status", "next_followup", "last_contact", "notes"]
DELIV_FIELDS = ["sponsor_id", "description", "category", "due_date", "owner", "status", "proof_url"]
TX_FIELDS = ["kind", "category", "description", "amount", "projected", "status", "vendor_id", "sponsor_id",
             "approved_by", "date", "receipt_url", "notes"]
COMM_FIELDS = ["name", "type", "agenda", "chair", "co_chair", "director", "room", "study_guide_url",
               "allocation_done", "schedule", "notes"]
CAMP_FIELDS = ["name", "objective", "audience", "start_date", "end_date", "budget", "platforms", "owner", "status"]
CONTENT_FIELDS = ["title", "content_type", "platform", "campaign_id", "goal", "owner", "copywriter", "designer",
                  "editor", "deadline", "publish_date", "status", "caption", "hashtags", "approval", "version",
                  "metrics_reach", "metrics_engagement"]


# ---------- ambassador referral accounting ----------
# 'registrations' on an Ambassador is COMPUTED from live rows, never hand-set:
# every delegate (walk-in) or group (school) carrying that code +1; removing the
# row or code -1. The delegate-level and group-level codes never double count:
# a delegate inside a group inherits the group's referral unit.
def _amb_code(code: str | None) -> str:
    return (code or "").strip().upper()


def _find_ambassador(db: Session, code: str):
    if not code:
        return None
    from sqlalchemy import func
    return db.query(models.Ambassador).filter(func.lower(models.Ambassador.code) == code.lower()).first()


def _bump_ambassador(db: Session, code: str, delta: int):
    a = _find_ambassador(db, code)
    if a:
        a.registrations = max(0, int(a.registrations or 0) + delta)


def _delegate_effective_code(db: Session, group_id: int | None, own_code: str) -> str:
    """A delegate's single referral unit: their own code for walk-ins,
    otherwise their group's code (the group owns the referral)."""
    if group_id is not None:
        g = db.get(models.Group, group_id)
        return _amb_code(g.ambassador_code) if g else ""
    return _amb_code(own_code)


def _validate_delegate(db: Session, clean: dict, o, actor: str):
    """Allocation rules on delegate write: one country per committee (duplicate block),
    and country must belong to the committee's matrix when one is configured."""
    cid = clean.get("committee_id", getattr(o, "committee_id", None) if o else None)
    country = (clean.get("country") or "").strip() if "country" in clean else (getattr(o, "country", "") or "").strip()
    if not cid or not country:
        return
    try:
        cid = int(cid)
    except (TypeError, ValueError):
        raise HTTPException(400, "committee_id must be an integer")
    dup = db.query(models.Delegate).filter(
        models.Delegate.committee_id == cid, models.Delegate.country == country,
        models.Delegate.id != (o.id if o else -1)).first()
    if dup:
        raise HTTPException(409, f"{country} is already assigned to this committee (delegate #{dup.id})")
    pool = [cc.country for cc in db.query(models.CommitteeCountry).filter_by(committee_id=cid).all()]
    if pool and country not in pool:
        raise HTTPException(400, f"{country} is not in this committee's country matrix")


def _after_delegate(db: Session, o, actor: str):
    _bump_ambassador(db, _delegate_effective_code(db, o.group_id, o.ambassador_code), 1)
    db.commit()


def _after_delegate_update(db: Session, o, prev: dict, actor: str):
    prev_eff = _delegate_effective_code(db, prev.get("group_id"), prev.get("ambassador_code"))
    cur_eff = _delegate_effective_code(db, o.group_id, o.ambassador_code)
    _bump_ambassador(db, prev_eff, -1)
    _bump_ambassador(db, cur_eff, 1)
    db.commit()


def _before_delegate_delete(db: Session, o, actor: str):
    _bump_ambassador(db, _delegate_effective_code(db, o.group_id, o.ambassador_code), -1)


def _after_group(db: Session, o, actor: str):
    _bump_ambassador(db, _amb_code(o.ambassador_code), 1)
    db.commit()


def _after_group_update(db: Session, o, prev: dict, actor: str):
    _bump_ambassador(db, _amb_code(prev.get("ambassador_code")), -1)
    _bump_ambassador(db, _amb_code(o.ambassador_code), 1)
    db.commit()


def _before_group_delete(db: Session, o, actor: str):
    _bump_ambassador(db, _amb_code(o.ambassador_code), -1)


# ---------- tasks: assignment gate + volunteer scope + notifications ----------
def _actor_role(db: Session, email: str) -> str:
    u = db.query(models.User).filter_by(email=email).first()
    return u.role if u else "volunteer"


def _validate_task(db: Session, clean: dict, o, actor: str):
    """Assignment gate: only EXEC/DEPT_HEAD can (re)assign tasks."""
    role = _actor_role(db, actor)
    prev_owner = getattr(o, "owner_id", None) if o else None
    new_owner = clean.get("owner_id")
    if new_owner is not None and new_owner != prev_owner and role not in ASSIGNERS:
        raise HTTPException(403, "Only Executive Body and Dept Heads can assign tasks")


def _task_list_scope(db: Session, u, query):
    """Volunteers see only their own tasks."""
    if u.role in ORGANIZING:
        query = query.filter(models.Task.owner_id == u.id)
    return query


def _make_task_serialize(owner_map: dict):
    """Closure-based serialize for tasks — uses pre-resolved owner names."""
    def _serialize(o) -> dict:
        d = {"id": o.id}
        for f in TASK_FIELDS:
            v = getattr(o, f, None)
            d[f] = str(v) if isinstance(v, date) and v else v
        d["owner_name"] = owner_map.get(o.owner_id, "") if o.owner_id else ""
        return d
    return _serialize


def _after_task_create(db: Session, o, actor: str):
    """Notify assignee when a task is created with an owner."""
    if o.owner_id:
        assignee = db.get(models.User, o.owner_id)
        if assignee:
            due = f" (due {o.due_date})" if o.due_date else ""
            notify(db, assignee.email, f"Assigned: {o.title}{due}", "/tasks", "task")


def _after_task_update(db: Session, o, prev: dict, actor: str):
    """Notify on assignment change."""
    prev_owner = prev.get("owner_id")
    cur_owner = o.owner_id
    if cur_owner and cur_owner != prev_owner:
        assignee = db.get(models.User, cur_owner)
        if assignee:
            due = f" (due {o.due_date})" if o.due_date else ""
            notify(db, assignee.email, f"Assigned: {o.title}{due}", "/tasks", "task")
    # notify old owner they were reassigned away
    if prev_owner and prev_owner != cur_owner:
        former = db.get(models.User, prev_owner)
        if former:
            notify(db, former.email, f"Reassigned away: {o.title}", "/tasks", "task")

sub = APIRouter()
for _r in [
    crud("delegates", models.Delegate, DELEG_FIELDS, "delegates", ["name", "institution", "email", "country"],
         validate=_validate_delegate, after_create=_after_delegate, after_update=_after_delegate_update,
         before_delete=_before_delegate_delete),
    crud("groups", models.Group, GROUP_FIELDS, "delegates", ["name", "contact_name", "contact_email"],
         after_create=_after_group, after_update=_after_group_update, before_delete=_before_group_delete),
    crud("sponsors", models.Sponsor, SPONS_FIELDS, "sponsors", ["organization", "contact_name"]),
    crud("deliverables", models.SponsorDeliverable, DELIV_FIELDS, "sponsors", ["description"]),
    crud("transactions", models.Transaction, TX_FIELDS, "finance", ["description", "category"]),
    crud("committees", models.Committee, COMM_FIELDS, "committees", ["name", "agenda"]),
    crud("campaigns", models.Campaign, CAMP_FIELDS, "media", ["name", "objective"]),
    crud("content", models.ContentItem, CONTENT_FIELDS, "media", ["title", "caption"]),
    crud("ideas", models.ContentIdea, ["title", "format", "description", "platform", "votes", "status"], "media", ["title"]),
    crud("assets", models.Asset, ["name", "kind", "tags", "campaign", "sponsor", "url", "version", "approval"], "media", ["name", "tags"], cascade_child=models.AssetVersion),
    crud("videos", models.Video, ["title", "kind", "editor", "status", "script", "footage", "deadline"], "media", ["title"]),
    crud("social", models.SocialAccount, ["platform", "handle", "connection", "followers", "reach", "engagement"], "media", ["platform", "handle"]),
    crud("ambassadors", models.Ambassador, ["name", "institution", "platform", "handle", "code", "registrations", "status"], "media", ["name", "handle"]),
    crud("press", models.PressContact, ["outlet", "name", "email", "status", "notes"], "media", ["outlet", "name"]),
    crud("approvals", models.Approval, ["type", "title", "requested_by", "reviewer", "deadline", "status", "decision", "comments"], "approvals", ["title"]),
    crud("risks", models.Risk, ["title", "probability", "impact", "severity", "owner", "mitigation", "status"], "risks", ["title"]),
    crud("incidents", models.Incident, ["title", "severity", "location", "reported_by", "assigned_to", "status", "resolution"], "event_control", ["title", "location"]),
    crud("documents", models.Document, ["title", "category", "path", "version"], "documents", ["title"]),
    crud("vendors", models.Vendor, ["name", "contact", "notes"], "procurement", ["name"]),
    crud("procurement", models.ProcurementItem, ["item", "quantity", "vendor_id", "quote", "final_cost", "status", "delivery_date", "notes"], "procurement", ["item"]),
    crud("rooms", models.Room, ["name", "capacity", "assignment"], "logistics", ["name"]),
    crud("venue", models.VenueCheck, ["area", "item", "status", "owner", "notes"], "logistics", ["area", "item"]),
    crud("milestones", models.Milestone, ["name", "date", "owner", "status", "phase"], "timeline", ["name"]),
    crud("shifts", models.Shift, ["user_id", "shift_date", "start_time", "end_time", "zone", "role", "status", "notes"], "team", ["zone", "role"]),
    crud("committee_sessions", models.CommitteeSession, ["committee_id", "title", "session_date", "start_time", "end_time", "room", "chair", "status", "agenda", "minutes"], "committees", ["title"]),
]:
    sub.include_router(_r)


# ---------- tasks: dedicated endpoint with owner scoping + assignment gate ----------
@sub.get("/tasks")
def tasks_list(db: Session = Depends(get_db), u=Depends(require("tasks")),
               q: str = "", status: str = "", limit: int = 200, offset: int = 0):
    query = db.query(models.Task)
    if q:
        from sqlalchemy import or_
        query = query.filter(or_(models.Task.title.ilike(f"%{q}%"),
                                 models.Task.description.ilike(f"%{q}%"),
                                 models.Task.project.ilike(f"%{q}%")))
    if status:
        query = query.filter(models.Task.status == status)
    # volunteer scope
    query = _task_list_scope(db, u, query)
    rows = query.order_by(models.Task.id.desc()).offset(max(offset, 0)).limit(min(max(limit, 1), 500)).all()
    # batch-resolve owner names
    owner_ids = {r.owner_id for r in rows if r.owner_id}
    owner_map = {}
    if owner_ids:
        for usr in db.query(models.User).filter(models.User.id.in_(owner_ids)).all():
            owner_map[usr.id] = usr.name
    serialize = _make_task_serialize(owner_map)
    return [serialize(r) for r in rows]


@sub.post("/tasks")
def tasks_create(body: dict, db: Session = Depends(get_db), u=Depends(require("tasks"))):
    clean = coerce_dates(models.Task, body)
    _validate_task(db, clean, None, u.email)
    # volunteer create gate
    if u.role in ORGANIZING:
        raise HTTPException(403, "Organizing members cannot create tasks")
    o = models.Task()
    for f in TASK_FIELDS:
        if f in clean and f != "id":
            setattr(o, f, clean[f])
    o.created_by_id = u.id
    db.add(o); db.commit(); db.refresh(o)
    _after_task_create(db, o, u.email)
    emit(db, u.email, "created", "tasks", o.id, f"Created task #{o.id}: {o.title}")
    return {"id": o.id}


@sub.put("/tasks/{oid}")
def tasks_update(oid: int, body: dict, db: Session = Depends(get_db), u=Depends(require("tasks"))):
    o = db.get(models.Task, oid)
    if not o:
        raise HTTPException(404, "Task not found")
    # volunteer write gate: only their own tasks, no assignment change
    if u.role in ORGANIZING:
        if o.owner_id != u.id:
            raise HTTPException(403, "You can only edit your own tasks")
        # volunteers can only update status
        allowed = {"status"}
        extra = set(body.keys()) - allowed
        if extra:
            raise HTTPException(403, "Organizing members can only update task status")
    prev = {f: getattr(o, f, None) for f in TASK_FIELDS}
    clean = coerce_dates(models.Task, body)
    _validate_task(db, clean, o, u.email)
    for f in TASK_FIELDS:
        if f in clean:
            setattr(o, f, clean[f])
    db.commit()
    _after_task_update(db, o, prev, u.email)
    spawned = spawn_next_occurrence(db, models.Task, o, prev.get("status"), u.email)
    emit(db, u.email, "updated", "tasks", oid, f"Updated task #{oid}")
    return {"ok": True, **({"spawned_id": spawned} if spawned else {})}


@sub.delete("/tasks/{oid}")
def tasks_delete(oid: int, db: Session = Depends(get_db), u=Depends(require("tasks"))):
    o = db.get(models.Task, oid)
    if not o:
        raise HTTPException(404, "Task not found")
    if u.role in ORGANIZING:
        raise HTTPException(403, "Organizing members cannot delete tasks")
    db.delete(o); db.commit()
    emit(db, u.email, "deleted", "tasks", oid, f"Deleted task #{oid}")
    return {"ok": True}


@sub.get("/tasks/mine")
def tasks_mine(db: Session = Depends(get_db), u=Depends(current_user)):
    """Current user's open tasks + due/overdue for dashboard."""
    today = date.today()
    soon = today + timedelta(days=2)
    rows = db.query(models.Task).filter(
        models.Task.owner_id == u.id,
        models.Task.status.notin_(["completed", "cancelled"])).order_by(models.Task.due_date.asc()).limit(50).all()
    return [{"id": r.id, "title": r.title, "priority": r.priority, "status": r.status,
             "due_date": str(r.due_date) if r.due_date else None,
             "overdue": bool(r.due_date and r.due_date < today),
             "due_soon": bool(r.due_date and today <= r.due_date <= soon)} for r in rows]


# ---------- spreadsheet exports (Excel) ----------
@router.get("/exports/{kind}.xlsx", dependencies=[Depends(require("sponsors"))])
def export_xlsx(kind: str, db: Session = Depends(get_db), u=Depends(current_user)):
    """Downloadable Excel workbook for business stakeholders: sponsors, finance, delegates."""
    # Per-kind RBAC: finance data stays finance-scoped even though the generic
    # export route sits under 'sponsors'.
    if kind == "finance" and u.role not in PERMISSIONS["finance"]:
        raise HTTPException(403, f"Role {u.role} cannot export finance")
    if kind == "delegates" and u.role not in PERMISSIONS["delegates"]:
        raise HTTPException(403, f"Role {u.role} cannot export delegates")
    import io as _io
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill

    wb = Workbook()
    ws = wb.active
    ws.title = kind.capitalize()
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="1D4ED8")

    def _dump(rows, header, widths=None):
        ws.append(list(header))
        for c in ws[1]:
            c.font = header_font
            c.fill = header_fill
        for r in rows:
            ws.append([str(r.get(c, "")) if isinstance(r.get(c, ""), (date, datetime)) else r.get(c, "") for c in header])
        for i, w in enumerate((widths or [18] * len(header)), start=1):
            ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w

    if kind == "sponsors":
        cols = ["organization", "package", "value", "amount_received", "pipeline_status", "payment_status", "next_followup", "contact_email", "notes"]
        _dump([{**{c: getattr(s, c, "") for c in cols},
                "outstanding": float(getattr(s, "value", 0) or 0) - float(getattr(s, "amount_received", 0) or 0)}
               for s in db.query(models.Sponsor).limit(5000)],
              ["organization", "package", "value", "received", "outstanding", "pipeline", "payment", "next_followup", "contact_email", "notes"],
              widths=[28, 12, 12, 12, 12, 16, 14, 14, 28, 40])
    elif kind == "finance":
        cols = ["date", "kind", "category", "description", "amount", "projected", "status", "approved_by", "notes"]
        _dump([{c: getattr(t, c, "") for c in cols} for t in db.query(models.Transaction).limit(5000)],
              ["date", "kind", "category", "description", "amount", "projected", "status", "approved_by", "notes"],
              widths=[12, 10, 16, 40, 14, 12, 12, 20, 40])
        revenue = sum(t.amount for t in db.query(models.Transaction).filter_by(kind="revenue") if t.status != "cancelled")
        expense = sum(t.amount for t in db.query(models.Transaction).filter_by(kind="expense") if t.status != "cancelled")
        ws.append([])
        ws.append(["TOTALS", "", "", "", revenue, "", "", "", ""])
        ws.append(["NET", "", "", "", revenue - expense, "", "", "", ""])
        ws.cell(ws.max_row, 5).font = Font(bold=True)
    elif kind == "delegates":
        groups = {g.id: g.name for g in db.query(models.Group).all()}
        cols = ["name", "institution", "group", "country", "email", "committee_id", "reg_status", "pay_status", "amount_paid", "checkin_code", "accommodation", "transport"]
        _dump([{**{c: getattr(d, c, "") for c in ["name", "institution", "country", "email", "committee_id", "reg_status", "pay_status", "amount_paid", "checkin_code", "accommodation", "transport"]},
                "group": groups.get(d.group_id, "")} for d in db.query(models.Delegate).limit(5000)],
              ["name", "institution", "group", "country", "email", "committee_id", "registration", "payment", "amount_paid", "checkin_code", "accommodation", "transport"],
              widths=[24, 28, 24, 16, 28, 12, 14, 12, 12, 16, 14, 12])
    else:
        raise HTTPException(404, "Unknown export kind (sponsors|finance|delegates)")

    buf = _io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return Response(content=buf.getvalue(),
                    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f"attachment; filename=kimun-{kind}.xlsx"})


# ---------- delegate bulk import/export (CSV) ----------
DELEG_CSV_COLS = ["name", "institution", "group", "email", "phone", "country", "reg_status",
                  "pay_status", "amount_paid", "notes", "ambassador_code", "checkin_code"]


@router.get("/delegates/export", dependencies=[Depends(require("delegates"))])
def export_delegates(db: Session = Depends(get_db)):
    groups = {g.id: g.name for g in db.query(models.Group).all()}
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=DELEG_CSV_COLS)
    w.writeheader()
    for d in db.query(models.Delegate).limit(5000):
        row = {c: getattr(d, c, "") for c in DELEG_CSV_COLS}
        row["group"] = groups.get(getattr(d, "group_id", None), "")
        w.writerow(row)
    return PlainTextResponse(buf.getvalue(), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=delegates.csv"})


@router.post("/delegates/import", dependencies=[Depends(require("delegates"))])
async def import_delegates(f: UploadFile = File(...), db: Session = Depends(get_db), u=Depends(current_user)):
    try:
        rows = list(csv.DictReader(io.StringIO((await f.read()).decode("utf-8-sig"))))
    except Exception:
        raise HTTPException(400, "Invalid CSV file")
    ok, fail = 0, 0
    from collections import Counter
    codes: Counter = Counter()
    for r in rows[:2000]:
        try:
            if not (r.get("name") or "").strip():
                fail += 1
                continue
            code = (r.get("ambassador_code", "") or "").strip()
            db.add(models.Delegate(
                name=r.get("name", "").strip(), institution=r.get("institution", ""),
                email=r.get("email", ""), phone=r.get("phone", ""), country=r.get("country", ""),
                reg_status=r.get("reg_status", "started") or "started",
                pay_status=r.get("pay_status", "unpaid") or "unpaid",
                amount_paid=float(r.get("amount_paid") or 0),
                notes=r.get("notes", ""), ambassador_code=code,
                checkin_code=(r.get("checkin_code", "") or "").strip().upper()))
            if code:
                codes[code] += 1
            ok += 1
        except Exception:
            fail += 1
    db.commit()
    for code, n in codes.items():
        _bump_ambassador(db, code, n)
    db.commit()
    emit(db, u.email, "imported", "delegates", 0, f"CSV import: {ok} ok, {fail} failed")
    return {"imported": ok, "failed": fail}


# ---------- committee country matrix + allocation ----------
@router.get("/committees/{cid}/countries", dependencies=[Depends(require("delegates"))])
def committee_countries(cid: int, db: Session = Depends(get_db)):
    if not db.get(models.Committee, cid):
        raise HTTPException(404, "Committee not found")
    return [{"id": cc.id, "country": cc.country}
            for cc in db.query(models.CommitteeCountry).filter_by(committee_id=cid)
            .order_by(models.CommitteeCountry.country).all()]


class CountryIn(BaseModel):
    country: str


@router.post("/committees/{cid}/countries", dependencies=[Depends(require("delegates"))])
def add_committee_country(cid: int, body: CountryIn, db: Session = Depends(get_db), u=Depends(current_user)):
    if not db.get(models.Committee, cid):
        raise HTTPException(404, "Committee not found")
    country = body.country.strip()
    if not country:
        raise HTTPException(400, "Country required")
    if db.query(models.CommitteeCountry).filter_by(committee_id=cid, country=country).first():
        raise HTTPException(409, f"{country} already in this committee's matrix")
    cc = models.CommitteeCountry(committee_id=cid, country=country)
    db.add(cc); db.commit(); db.refresh(cc)
    emit(db, u.email, "created", "committee_countries", cc.id, f"Matrix +{country}")
    return {"id": cc.id}


@router.delete("/committees/{cid}/countries/{ccid}", dependencies=[Depends(require("delegates"))])
def remove_committee_country(cid: int, ccid: int, db: Session = Depends(get_db), u=Depends(current_user)):
    cc = db.get(models.CommitteeCountry, ccid)
    if not cc or cc.committee_id != cid:
        raise HTTPException(404, "Matrix entry not found")
    db.delete(cc); db.commit()
    emit(db, u.email, "deleted", "committee_countries", ccid, f"Matrix -{cc.country}")
    return {"ok": True}


@router.get("/allocation", dependencies=[Depends(require("delegates"))])
def allocation_view(db: Session = Depends(get_db)):
    """Full allocation state: every committee with its country pool + assigned
    delegates, plus the unallocated queue (missing committee or country)."""
    groups = {g.id: g.name for g in db.query(models.Group).all()}
    committees = []
    for c in db.query(models.Committee).order_by(models.Committee.name).all():
        pool = [cc.country for cc in db.query(models.CommitteeCountry).filter_by(committee_id=c.id)
                .order_by(models.CommitteeCountry.country).all()]
        dels = db.query(models.Delegate).filter_by(committee_id=c.id).order_by(models.Delegate.name).all()
        committees.append({
            "id": c.id, "name": c.name, "room": c.room, "capacity": c.capacity,
            "allocation_done": bool(c.allocation_done), "pool": pool,
            "delegates": [{
                "id": d.id, "name": d.name, "institution": d.institution, "country": d.country,
                "group_id": d.group_id, "group_name": groups.get(d.group_id, ""),
                "reg_status": d.reg_status, "pay_status": d.pay_status} for d in dels],
        })
    unallocated = db.query(models.Delegate).filter(
        (models.Delegate.committee_id.is_(None)) | (models.Delegate.country == "")) \
        .order_by(models.Delegate.name).all()
    return {
        "committees": committees,
        "unallocated": [{
            "id": d.id, "name": d.name, "institution": d.institution, "country": d.country,
            "committee_id": d.committee_id, "group_id": d.group_id,
            "group_name": groups.get(d.group_id, ""), "reg_status": d.reg_status} for d in unallocated],
    }


class AllocateIn(BaseModel):
    committee_id: int | None = None
    country: str = ""


@router.put("/delegates/{did}/allocate", dependencies=[Depends(require("delegates"))])
def allocate(did: int, body: AllocateIn, db: Session = Depends(get_db), u=Depends(current_user)):
    d = db.get(models.Delegate, did)
    if not d:
        raise HTTPException(404, "Delegate not found")
    cid = body.committee_id
    country = (body.country or "").strip()
    if cid is not None and not db.get(models.Committee, cid):
        raise HTTPException(404, "Committee not found")
    if cid and country:
        dup = db.query(models.Delegate).filter(
            models.Delegate.committee_id == cid, models.Delegate.country == country,
            models.Delegate.id != did).first()
        if dup:
            raise HTTPException(409, f"{country} is already assigned to this committee (delegate #{dup.id})")
        pool = [cc.country for cc in db.query(models.CommitteeCountry).filter_by(committee_id=cid).all()]
        if pool and country not in pool:
            raise HTTPException(400, f"{country} is not in this committee's country matrix")
    d.committee_id = cid
    d.country = country
    db.commit()
    emit(db, u.email, "allocated", "delegates", did, f"{d.name} → {country or 'unassigned'} @ committee {cid or '—'}")
    return {"ok": True, "committee_id": cid, "country": country}


# ---------- global search (§44) ----------
SEARCH_INDEX = [
    ("tasks", models.Task, "tasks", ["title", "description", "project"], "/tasks", ["title"]),
    ("delegates", models.Delegate, "delegates", ["name", "institution", "email", "country"], "/delegates", ["name", "institution"]),
    ("groups", models.Group, "delegates", ["name", "contact_email", "contact_name"], "/groups", ["name", "contact_name"]),
    ("sponsors", models.Sponsor, "sponsors", ["organization", "contact_name"], "/sponsors", ["organization"]),
    ("campaigns", models.Campaign, "media", ["name", "objective"], "/media", ["name"]),
    ("content", models.ContentItem, "media", ["title", "caption"], "/media", ["title"]),
    ("documents", models.Document, "documents", ["title", "category"], "/documents", ["title"]),
    ("team", models.User, "team", ["name", "email"], "/team", ["name", "email"]),
    ("committees", models.Committee, "committees", ["name", "agenda"], "/committees", ["name"]),
    ("vendors", models.Vendor, "procurement", ["name"], "/procurement", ["name"]),
]


@router.get("/search", dependencies=[Depends(require("dashboard"))])
def search(q: str = "", db: Session = Depends(get_db), u=Depends(current_user)):
    from sqlalchemy import or_
    out: dict[str, list] = {}
    if not q.strip():
        return out
    for key, model, module, cols, link, show in SEARCH_INDEX:
        if u.role not in PERMISSIONS.get(module, set()):
            continue
        rows = db.query(model).filter(or_(*[getattr(model, c).ilike(f"%{q}%") for c in cols])).limit(8).all()
        out[key] = [{"id": r.id, "text": " · ".join(str(getattr(r, c, "")) for c in show)[:120], "link": link} for r in rows]
    return {k: v for k, v in out.items() if v}


# ---------- post-event report (§40) — every figure from live rows ----------
@router.get("/reports/event-summary", dependencies=[Depends(require("dashboard"))])
def event_summary(db: Session = Depends(get_db)):
    from collections import Counter
    delegates = db.query(models.Delegate).all()
    sponsors = db.query(models.Sponsor).all()
    delivs = db.query(models.SponsorDeliverable).all()
    tx = db.query(models.Transaction).all()
    tasks = db.query(models.Task).all()
    content = db.query(models.ContentItem).all()
    camps = db.query(models.Campaign).all()
    checks = db.query(models.VenueCheck).all()
    proc = db.query(models.ProcurementItem).all()
    risks = db.query(models.Risk).all()
    incs = db.query(models.Incident).all()
    users = db.query(models.User).all()
    rev_paid = sum(t.amount for t in tx if t.kind == "revenue" and t.status == "paid")
    rev_proj = sum(t.projected or t.amount for t in tx if t.kind == "revenue")
    exp_paid = sum(t.amount for t in tx if t.kind == "expense" and t.status == "paid")
    exp_proj = sum(t.projected or t.amount for t in tx if t.kind == "expense")
    top_content = sorted(content, key=lambda c: c.metrics_reach or 0, reverse=True)[:5]
    return {
        "delegates": {"total": len(delegates),
                      "by_registration": dict(Counter(d.reg_status for d in delegates)),
                      "paid": sum(1 for d in delegates if d.pay_status == "paid"),
                      "conversion_pct": round(sum(1 for d in delegates if d.pay_status == "paid") * 100 / len(delegates)) if delegates else 0,
                      "attendance": sum(1 for d in delegates if d.attendance),
                      "attendance_pct": round(sum(1 for d in delegates if d.attendance) * 100 / len(delegates)) if delegates else 0,
                      "accommodation": sum(1 for d in delegates if d.accommodation),
                      "transport": sum(1 for d in delegates if d.transport)},
        "sponsors": {"count": len(sponsors), "by_stage": dict(Counter(s.pipeline_status for s in sponsors)),
                     "committed": sum(s.value for s in sponsors), "received": sum(s.amount_received for s in sponsors),
                     "outstanding": sum(s.value - s.amount_received for s in sponsors),
                     "deliverables_done": sum(1 for d in delivs if d.status == "done"), "deliverables_total": len(delivs)},
        "finance": {"revenue_projected": rev_proj, "revenue_actual": rev_paid, "expenses_projected": exp_proj,
                    "expenses_actual": exp_paid, "profit_projected": rev_proj - exp_proj, "profit_actual": rev_paid - exp_paid,
                    "outstanding_receivable": sum(t.amount for t in tx if t.kind == "revenue" and t.status != "paid"),
                    "outstanding_payable": sum(t.amount for t in tx if t.kind == "expense" and t.status != "paid")},
        "tasks": {"total": len(tasks), "by_status": dict(Counter(t.status for t in tasks)),
                  "completed_pct": round(sum(1 for t in tasks if t.status == "completed") * 100 / len(tasks)) if tasks else 0},
        "media": {"content_total": len(content), "by_status": dict(Counter(c.status for c in content)),
                  "by_platform": dict(Counter(c.platform for c in content)), "campaigns": len(camps),
                  "total_reach": sum(c.metrics_reach or 0 for c in content),
                  "total_engagement": sum(c.metrics_engagement or 0 for c in content),
                  "top_content": [{"title": c.title, "platform": c.platform, "reach": c.metrics_reach,
                                   "engagement": c.metrics_engagement} for c in top_content]},
        "logistics": {"venue_done": sum(1 for v in checks if v.status == "done"), "venue_total": len(checks),
                      "procurement_delivered": sum(1 for p in proc if p.status == "delivered"),
                      "procurement_total": len(proc), "open_risks": sum(1 for r in risks if r.status == "open"),
                      "incidents": len(incs), "open_incidents": sum(1 for i in incs if i.status == "open")},
        "team": {"members": len(users)},
        "readiness": compute_readiness(db),
    }


# ---------- QR badge check-in ----------
def _ensure_checkin_code(d: models.Delegate) -> str:
    import secrets
    if not d.checkin_code:
        d.checkin_code = f"K26-{d.id:04d}-{secrets.token_hex(3).upper()}"
    return d.checkin_code


@router.post("/delegates/{did}/badge", dependencies=[Depends(require("delegates"))])
def make_badge(did: int, db: Session = Depends(get_db), u=Depends(current_user)):
    import segno
    from app.uploads import UPLOAD_DIR
    d = db.get(models.Delegate, did)
    if not d:
        raise HTTPException(404, "Delegate not found")
    code = _ensure_checkin_code(d)
    fname = f"badge-{d.id}.png"
    segno.make(code).save(os.path.join(UPLOAD_DIR, fname), scale=6, border=2)
    d.badge_url = f"/uploads/{fname}"
    db.commit()
    emit(db, u.email, "badged", "delegates", did, f"Badge for {d.name}")
    return {"code": code, "badge_url": d.badge_url}


class ApprovePaymentIn(BaseModel):
    amount_paid: int = 0  # 0 = use fee_amount from settings


@router.post("/delegates/{did}/approve-payment", dependencies=[Depends(require("delegates"))])
def approve_payment(did: int, body: ApprovePaymentIn, db: Session = Depends(get_db), u=Depends(current_user)):
    """Admin approves delegate payment: sets pay_status=paid, amount_paid, auto-generates QR badge."""
    d = db.get(models.Delegate, did)
    if not d:
        raise HTTPException(404, "Delegate not found")
    d.pay_status = "paid"
    d.amount_paid = body.amount_paid if body.amount_paid > 0 else (d.fee_amount or 0)
    # auto-generate QR badge if not already present
    if not d.badge_url:
        try:
            import segno as _segno
            from app.uploads import UPLOAD_DIR as _UD
            _fname = f"badge-{d.id}.png"
            _code = _ensure_checkin_code(d)
            _segno.make(_code).save(os.path.join(_UD, _fname), scale=6, border=2)
            d.badge_url = f"/uploads/{_fname}"
        except Exception as exc:
            _log.warning("Badge generation failed for delegate %s: %s", d.id, exc)
    db.commit()
    # notify delegate via email
    try:
        from app.services_email import send_payment_confirmation
        send_payment_confirmation(d)
    except Exception as exc:
        _log.warning("Payment confirmation email failed for %s: %s", d.email, exc)
    emit(db, u.email, "payment_approved", "delegates", did,
         f"Payment approved for {d.name} — ${d.amount_paid}")
    return {"ok": True, "pay_status": d.pay_status, "amount_paid": d.amount_paid, "badge_url": d.badge_url}


class CheckinIn(BaseModel):
    code: str


@router.post("/checkin", dependencies=[Depends(require("event_control"))])
def checkin(body: CheckinIn, db: Session = Depends(get_db), u=Depends(current_user)):
    code = body.code.strip().upper()
    d = db.query(models.Delegate).filter(models.Delegate.checkin_code == code).first()
    if not d:
        raise HTTPException(404, "Unknown badge code")
    already = bool(d.attendance)
    d.attendance = True
    db.commit()
    emit(db, u.email, "checkin", "delegates", d.id, f"{'Re-scan' if already else 'Checked in'} {d.name}")
    return {"id": d.id, "name": d.name, "institution": d.institution,
            "committee_id": d.committee_id, "already": already}


@router.get("/checkin/today", dependencies=[Depends(require("event_control"))])
def checkin_stats(db: Session = Depends(get_db)):
    total = db.query(models.Delegate).count()
    inside = db.query(models.Delegate).filter(models.Delegate.attendance.is_(True)).count()
    recent = db.query(models.ActivityEvent).filter(models.ActivityEvent.action == "checkin").order_by(
        models.ActivityEvent.id.desc()).limit(20)
    return {"total": total, "inside": inside,
            "recent": [{"message": e.message, "at": str(e.created_at)} for e in recent]}


# ---------- asset version history (old versions never destroyed) ----------
@router.get("/assets/{aid}/versions", dependencies=[Depends(require("media"))])
def asset_versions(aid: int, db: Session = Depends(get_db)):
    rows = db.query(models.AssetVersion).filter_by(asset_id=aid).order_by(models.AssetVersion.version).all()
    return [{"version": v.version, "url": v.url, "note": v.note, "by": v.created_by, "at": str(v.created_at)} for v in rows]


@router.post("/assets/{aid}/versions", dependencies=[Depends(require("media"))])
def add_asset_version(aid: int, body: dict, db: Session = Depends(get_db), u=Depends(current_user)):
    a = db.get(models.Asset, aid)
    if not a:
        raise HTTPException(404, "Asset not found")
    if not (body.get("url") or "").strip():
        raise HTTPException(400, "Version file URL required")
    if not db.query(models.AssetVersion).filter_by(asset_id=aid).first() and a.url:
        db.add(models.AssetVersion(asset_id=aid, version=1, url=a.url, note="original", created_by=u.email))
        a.version = max(a.version, 1)
    a.version += 1
    db.add(models.AssetVersion(asset_id=aid, version=a.version, url=body["url"].strip(),
                               note=body.get("note", ""), created_by=u.email))
    a.url = body["url"].strip()
    a.approval = "awaiting_review"  # new versions always re-enter review, never auto-approved
    db.commit()
    emit(db, u.email, "versioned", "assets", aid, f"v{a.version}: {body.get('note', '')}"[:200])
    return {"version": a.version}


@router.post("/tasks/{tid}/comments", dependencies=[Depends(require("tasks"))])
def add_comment(tid: int, body: dict, db: Session = Depends(get_db), u=Depends(current_user)):
    c = models.TaskComment(task_id=tid, user_id=u.id, body=body.get("body", ""))
    db.add(c); db.commit()
    emit(db, u.email, "commented", "tasks", tid, body.get("body", "")[:200])
    return {"ok": True}


@router.get("/tasks/{tid}/comments", dependencies=[Depends(require("tasks"))])
def get_comments(tid: int, db: Session = Depends(get_db)):
    return [{"id": c.id, "body": c.body, "user_id": c.user_id, "created_at": str(c.created_at)}
            for c in db.query(models.TaskComment).filter_by(task_id=tid).all()]


@router.post("/ideas/{iid}/vote", dependencies=[Depends(require("media"))])
def vote_idea(iid: int, db: Session = Depends(get_db), u=Depends(current_user)):
    o = db.get(models.ContentIdea, iid)
    if not o:
        raise HTTPException(404, "Not found")
    voters = [e.strip() for e in (o.voted_by or "").split(",") if e.strip()]
    if u.email in voters:
        return {"votes": o.votes, "already_voted": True}
    o.votes += 1
    voters.append(u.email)
    o.voted_by = ",".join(voters)
    db.commit()
    emit(db, u.email, "voted", "ideas", iid, o.title)
    return {"votes": o.votes}


@router.post("/ideas/{iid}/convert", dependencies=[Depends(require("media"))])
def convert_idea(iid: int, db: Session = Depends(get_db), u=Depends(current_user)):
    o = db.get(models.ContentIdea, iid)
    if not o:
        raise HTTPException(404, "Not found")
    c = models.ContentItem(title=o.title, content_type=o.format, platform=o.platform, goal=o.description, status="brief")
    db.add(c); o.status = "converted"; db.commit(); db.refresh(c)
    emit(db, u.email, "converted", "ideas", iid, f"Idea -> content #{c.id}")
    return {"content_id": c.id}


# ---------- dashboard / activity / notifications ----------
@router.get("/dashboard/summary", dependencies=[Depends(require("dashboard"))])
def summary(db: Session = Depends(get_db)):
    r = compute_readiness(db)
    tasks = db.query(models.Task).all()
    overdue = [t.title for t in tasks if t.status not in ("completed", "cancelled") and t.due_date and str(t.due_date) < str(date.today())][:10]
    crit = []
    for s in db.query(models.Sponsor).filter(models.Sponsor.payment_status != "paid").limit(5):
        crit.append({"level": "high", "text": f"Sponsor follow-up: {s.organization}", "link": "/sponsors"})
    for t in overdue:
        crit.append({"level": "critical", "text": f"Overdue task: {t}", "link": "/tasks"})
    for c in db.query(models.ContentItem).filter(models.ContentItem.approval == "awaiting_review").limit(5):
        crit.append({"level": "medium", "text": f"Content awaiting approval: {c.title}", "link": "/media/approvals"})
    return {"readiness": r, "critical": crit[:15],
            "conference": {"name": settings.CONFERENCE_NAME, "venue": settings.CONFERENCE_VENUE, "date": settings.CONFERENCE_DATE}}


@router.get("/activity", dependencies=[Depends(require("dashboard"))])
def activity(db: Session = Depends(get_db)):
    return [{"id": e.id, "actor": e.actor, "action": e.action, "entity": f"{e.entity_type}#{e.entity_id}",
             "message": e.message, "at": str(e.created_at)}
            for e in db.query(models.ActivityEvent).order_by(models.ActivityEvent.id.desc()).limit(100)]


@router.get("/notifications", dependencies=[Depends(require("dashboard"))])
def notifs(db: Session = Depends(get_db), u=Depends(current_user)):
    # stored notification rows
    rows = db.query(models.Notification).filter(
        (models.Notification.user_email == u.email) | (models.Notification.user_email == "")).order_by(
        models.Notification.id.desc()).limit(100)
    items = [{"id": n.id, "message": n.message, "link": n.link, "type": n.type, "read": n.read} for n in rows]
    # computed due/overdue for this user
    today = date.today()
    soon = today + timedelta(days=2)
    open_tasks = db.query(models.Task).filter(
        models.Task.owner_id == u.id,
        models.Task.status.notin_(["completed", "cancelled"])).all()
    due_now = []
    for t in open_tasks:
        if t.due_date and t.due_date <= soon:
            tag = "overdue" if t.due_date < today else "due_soon"
            due_now.append({"task_id": t.id, "title": t.title, "due_date": str(t.due_date), "tag": tag})
    due_now.sort(key=lambda x: x["due_date"])
    unread = sum(1 for n in items if not n["read"])
    return {"items": items, "due_now": due_now, "unread": unread}


@router.get("/notifications/unread", dependencies=[Depends(require("dashboard"))])
def notif_unread_count(db: Session = Depends(get_db), u=Depends(current_user)):
    count = db.query(models.Notification).filter(
        models.Notification.user_email == u.email,
        models.Notification.read == False).count()
    return {"unread": count}


@router.post("/notifications/{nid}/read", dependencies=[Depends(require("dashboard"))])
def read_notif(nid: int, db: Session = Depends(get_db), u=Depends(current_user)):
    n = db.get(models.Notification, nid)
    if n and (n.user_email == u.email or n.user_email == ""):
        n.read = True; db.commit()
    return {"ok": True}


# ---------- AI (NVIDIA only) ----------
class AIIn(BaseModel):
    task: str = Field(description="One of caption, campaign_plan, content_ideas, hashtags, ...")
    brief: str
    context: dict = {}


@router.get("/ai/status", dependencies=[Depends(require("ai"))])
def ai_status():
    p = settings.AI_PROVIDER
    if p == "gemini":
        model, base, key = settings.GEMINI_MODEL, settings.GEMINI_BASE_URL, settings.GEMINI_API_KEY
    else:
        model, base, key = settings.DEFAULT_AI_MODEL, settings.NVIDIA_BASE_URL, settings.NVIDIA_API_KEY
    return {"provider": p, "base_url": base, "model": model,
            "registry": MODEL_REGISTRY.get(p, {}),
            "configured": bool(key), "tasks": sorted(ALLOWED_TASKS),
            "note": "Provider/model is env-configurable in backend/.env; verify compatibility if changed. Drafts only — never auto-publish."}


@router.post("/ai/generate", dependencies=[Depends(require("ai"))])
async def ai_generate(body: AIIn, db: Session = Depends(get_db), u=Depends(current_user)):
    svc = AIService()
    try:
        out = await svc.generate(body.task, body.brief, body.context)
    except Exception as e:
        emit(db, u.email, "ai_error", "ai", 0, f"{body.task}: {e}")
        raise HTTPException(502, f"AI unavailable ({settings.AI_PROVIDER}): {e}")
    emit(db, u.email, "ai_generate", "ai", 0, f"{body.task} via {out['model']}")
    return out


# =====================================================================
# PUBLIC REGISTRATION PORTAL (no auth required)
# =====================================================================
import secrets as _secrets

FEE_INDIVIDUAL = settings.REGISTRATION_FEE_INDIVIDUAL
FEE_DELEGATION = settings.REGISTRATION_FEE_DELEGATION


def _gen_registration_token(delegate_id: int) -> str:
    return f"K26-{delegate_id:04d}-{_secrets.token_hex(4).upper()}"


@router.get("/public/committees")
def public_committees(db: Session = Depends(get_db)):
    """List committees for the registration preference dropdown (public)."""
    return [{"id": c.id, "name": c.name, "type": c.type, "capacity": c.capacity}
            for c in db.query(models.Committee).order_by(models.Committee.name).all()]


class RegistrationIn(BaseModel):
    name: str
    email: str
    phone: str = ""
    institution: str = ""
    experience_level: str = "first_timer"
    emergency_contact_name: str = ""
    emergency_contact_phone: str = ""
    dietary_restrictions: str = ""
    tshirt_size: str = ""
    registration_type: str = "individual"
    committee_preferences: str = ""
    # delegation fields
    delegation_members: list[dict] = []
    head_delegate_index: int = 0


@router.post("/public/register")
def public_register(body: RegistrationIn, db: Session = Depends(get_db)):
    """Register one delegate or a delegation of 6. Creates delegates + group, sends email."""
    from app.services_email import send_registration_email
    if body.registration_type == "delegation":
        members = body.delegation_members or []
        if len(members) < 2 or len(members) > 6:
            raise HTTPException(400, "Delegation must have 2-6 members")
        fee = FEE_DELEGATION
        # create group
        grp = models.Group(
            name=f"{body.name} Delegation",
            contact_name=body.name, contact_email=body.email, contact_phone=body.phone,
            fee_agreed=fee, status="registered")
        db.add(grp); db.commit(); db.refresh(grp)
        delegate_ids = []
        for i, m in enumerate(members):
            d = models.Delegate(
                name=m.get("name", "").strip(),
                email=m.get("email", "").strip(),
                phone=m.get("phone", "").strip(),
                institution=m.get("institution", body.institution).strip(),
                experience_level=m.get("experience_level", body.experience_level),
                emergency_contact_name=m.get("emergency_contact_name", body.emergency_contact_name),
                emergency_contact_phone=m.get("emergency_contact_phone", body.emergency_contact_phone),
                dietary_restrictions=m.get("dietary_restrictions", body.dietary_restrictions),
                tshirt_size=m.get("tshirt_size", body.tshirt_size),
                registration_type="delegation",
                committee_preferences=body.committee_preferences,
                group_id=grp.id,
                reg_status="started", pay_status="unpaid", fee_amount=fee,
                registration_completed_at=utcnow())
            db.add(d); db.commit(); db.refresh(d)
            d.registration_token = _gen_registration_token(d.id)
            delegate_ids.append(d.id)
            # assign checkin code + auto-generate QR badge
            d.checkin_code = f"K26-{d.id:04d}-{_secrets.token_hex(3).upper()}"
            db.commit()
            try:
                import segno as _segno
                from app.uploads import UPLOAD_DIR as _UD
                _fname = f"badge-{d.id}.png"
                _segno.make(d.checkin_code).save(os.path.join(_UD, _fname), scale=6, border=2)
                d.badge_url = f"/uploads/{_fname}"
                db.commit()
            except Exception as exc:
                _log.warning("QR badge generation failed for delegate %s: %s", d.id, exc)
        # set head delegate
        head_idx = min(body.head_delegate_index, len(delegate_ids) - 1)
        grp.head_delegate_id = delegate_ids[head_idx]
        db.commit()
        # send email to head delegate
        head = db.get(models.Delegate, delegate_ids[head_idx])
        if head and head.email:
            send_registration_email(head, fee)
        return {"ok": True, "type": "delegation", "reference": head.checkin_code if head else "",
                "delegate_count": len(delegate_ids), "group_id": grp.id}
    else:
        fee = FEE_INDIVIDUAL
        d = models.Delegate(
            name=body.name.strip(), email=body.email.strip(), phone=body.phone,
            institution=body.institution, experience_level=body.experience_level,
            emergency_contact_name=body.emergency_contact_name,
            emergency_contact_phone=body.emergency_contact_phone,
            dietary_restrictions=body.dietary_restrictions, tshirt_size=body.tshirt_size,
            registration_type="individual", committee_preferences=body.committee_preferences,
            reg_status="started", pay_status="unpaid", fee_amount=fee,
            registration_completed_at=utcnow())
        db.add(d); db.commit(); db.refresh(d)
        d.registration_token = _gen_registration_token(d.id)
        d.checkin_code = f"K26-{d.id:04d}-{_secrets.token_hex(3).upper()}"
        db.commit()
        # auto-generate QR badge
        try:
            import segno as _segno
            from app.uploads import UPLOAD_DIR as _UD
            _fname = f"badge-{d.id}.png"
            _segno.make(d.checkin_code).save(os.path.join(_UD, _fname), scale=6, border=2)
            d.badge_url = f"/uploads/{_fname}"
            db.commit()
        except Exception:
            pass
        if d.email:
            send_registration_email(d, fee)
        return {"ok": True, "type": "individual", "reference": d.checkin_code, "delegate_id": d.id}


class PaymentIn(BaseModel):
    reference: str
    payment_reference: str = ""
    screenshot_url: str = ""


@router.post("/public/payment")
def public_payment(body: PaymentIn, db: Session = Depends(get_db)):
    """Upload payment screenshot for a registered delegate (identified by reference number)."""
    d = db.query(models.Delegate).filter(models.Delegate.checkin_code == body.reference.strip().upper()).first()
    if not d:
        raise HTTPException(404, "Invalid reference number")
    d.payment_reference = body.payment_reference
    if body.screenshot_url:
        d.payment_screenshot_url = body.screenshot_url
    d.reg_status = "completed"
    db.commit()
    return {"ok": True, "message": "Payment proof received. Awaiting confirmation."}


class PublicLoginIn(BaseModel):
    reference: str


@router.post("/public/login")
def public_login(body: PublicLoginIn, db: Session = Depends(get_db)):
    """Login with delegate reference number → returns JWT token for portal access."""
    ref = body.reference.strip().upper()
    d = db.query(models.Delegate).filter(models.Delegate.checkin_code == ref).first()
    if not d:
        raise HTTPException(401, "Invalid reference number")
    from app.security import create_token
    token = create_token(f"delegate:{ref}")
    return {"token": token, "delegate": {"id": d.id, "name": d.name, "reference": d.checkin_code,
            "pay_status": d.pay_status, "reg_status": d.reg_status}}


# =====================================================================
# DELEGATE PORTAL (requires delegate JWT)
# =====================================================================
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.security import decode_token as _decode

_portal_bearer = HTTPBearer(auto_error=False)


def _current_delegate(cred: HTTPAuthorizationCredentials | None = Depends(_portal_bearer),
                      db: Session = Depends(get_db)):
    """Extract delegate from a portal JWT (sub = delegate:REF)."""
    if not cred:
        raise HTTPException(401, "Portal login required")
    sub = _decode(cred.credentials)
    if not sub or not sub.startswith("delegate:"):
        raise HTTPException(401, "Invalid portal token")
    ref = sub[len("delegate:"):]
    d = db.query(models.Delegate).filter(models.Delegate.checkin_code == ref).first()
    if not d:
        raise HTTPException(401, "Delegate not found")
    return d


@router.get("/portal/profile")
def portal_profile(d=Depends(_current_delegate)):
    """Delegate portal: own profile + QR badge."""
    return {
        "id": d.id, "name": d.name, "email": d.email, "phone": d.phone,
        "institution": d.institution, "reference": d.checkin_code,
        "registration_type": d.registration_type,
        "reg_status": d.reg_status, "pay_status": d.pay_status,
        "fee_amount": d.fee_amount, "amount_paid": d.amount_paid,
        "committee_id": d.committee_id, "country": d.country,
        "badge_url": d.badge_url, "photo_url": d.photo_url,
        "experience_level": d.experience_level,
        "emergency_contact_name": d.emergency_contact_name,
        "dietary_restrictions": d.dietary_restrictions, "tshirt_size": d.tshirt_size,
        "created_at": str(d.created_at) if d.created_at else "",
    }


@router.get("/portal/committees")
def portal_committees(d=Depends(_current_delegate), db: Session = Depends(get_db)):
    """Delegate portal: committee info + own allotment."""
    assigned = None
    if d.committee_id:
        c = db.get(models.Committee, d.committee_id)
        if c:
            assigned = {"id": c.id, "name": c.name, "type": c.type, "room": c.room,
                        "chair": c.chair, "country": d.country,
                        "study_guide_url": c.study_guide_url}
    all_coms = [{"id": c.id, "name": c.name, "type": c.type} for c in
                db.query(models.Committee).order_by(models.Committee.name).all()]
    return {"assigned": assigned, "committees": all_coms}


@router.get("/portal/study-guides")
def portal_study_guides(d=Depends(_current_delegate), db: Session = Depends(get_db)):
    """Delegate portal: study guides for own committee + general guides."""
    query = db.query(models.StudyGuide)
    if d.committee_id:
        from sqlalchemy import or_
        query = query.filter(or_(models.StudyGuide.committee_id == d.committee_id,
                                 models.StudyGuide.committee_id.is_(None)))
    else:
        query = query.filter(models.StudyGuide.committee_id.is_(None))
    return [{"id": sg.id, "title": sg.title, "description": sg.description,
             "file_url": sg.file_url, "kind": sg.kind,
             "committee_id": sg.committee_id} for sg in query.all()]


@router.get("/portal/notes")
def portal_notes_list(d=Depends(_current_delegate), db: Session = Depends(get_db)):
    rows = db.query(models.DelegateNote).filter_by(delegate_id=d.id).order_by(models.DelegateNote.id.desc()).all()
    return [{"id": n.id, "body": n.body, "created_at": str(n.created_at)} for n in rows]


class NoteIn(BaseModel):
    body: str


@router.post("/portal/notes")
def portal_notes_create(body: NoteIn, d=Depends(_current_delegate), db: Session = Depends(get_db)):
    if not body.body.strip():
        raise HTTPException(400, "Note body required")
    n = models.DelegateNote(delegate_id=d.id, body=body.body.strip())
    db.add(n); db.commit(); db.refresh(n)
    return {"id": n.id, "body": n.body, "created_at": str(n.created_at)}


@router.put("/portal/notes/{nid}")
def portal_notes_update(nid: int, body: NoteIn, d=Depends(_current_delegate), db: Session = Depends(get_db)):
    n = db.get(models.DelegateNote, nid)
    if not n or n.delegate_id != d.id:
        raise HTTPException(404, "Note not found")
    n.body = body.body.strip()
    db.commit()
    return {"id": n.id, "body": n.body, "created_at": str(n.created_at)}


@router.delete("/portal/notes/{nid}")
def portal_notes_delete(nid: int, d=Depends(_current_delegate), db: Session = Depends(get_db)):
    n = db.get(models.DelegateNote, nid)
    if not n or n.delegate_id != d.id:
        raise HTTPException(404, "Note not found")
    db.delete(n); db.commit()
    return {"ok": True}


# --- public file upload (for payment screenshots, no auth required) ---
@router.post("/public/upload")
async def public_upload(f: UploadFile = File(...)):
    """Public file upload for payment screenshots. Validated, size-capped."""
    ext = os.path.splitext(f.filename or "")[1].lower()
    allowed_payment = {".png", ".jpg", ".jpeg", ".webp"}
    if ext not in allowed_payment:
        raise HTTPException(400, f"Only image files allowed ({sorted(allowed_payment)})")
    data = await f.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(400, "File over 10MB limit")
    from app.uploads import UPLOAD_DIR, _is_vercel
    name = f"payment-{_sec.token_hex(8)}{ext}"
    if _is_vercel:
        # On Vercel serverless: store as base64 data URL
        import base64
        b64 = base64.b64encode(data).decode()
        mime = f.content_type or "image/png"
        return {"url": f"data:{mime};base64,{b64}", "filename": f.filename, "bytes": len(data), "storage": "inline"}
    else:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(os.path.join(UPLOAD_DIR, name), "wb") as out:
            out.write(data)
        return {"url": f"/uploads/{name}", "filename": f.filename, "bytes": len(data)}


# =====================================================================
# VOLUNTEER RECRUITMENT — APPLICATIONS + OPERATIONAL PANEL + DEPT PORTAL
# =====================================================================

# --- public application form ---
class ApplyIn(BaseModel):
    name: str
    phone: str = ""
    email: str
    city: str = ""
    photo_url: str = ""
    experience: str = ""
    department_preference: str = ""


@router.post("/public/apply")
def public_apply(body: ApplyIn, db: Session = Depends(get_db)):
    """Submit a volunteer application. Creates Application record + sends notification."""
    from app.services_activity import notify as _notify
    if db.query(models.Application).filter_by(email=body.email.strip()).first():
        raise HTTPException(409, "You have already applied with this email")
    a = models.Application(
        name=body.name.strip(), phone=body.phone, email=body.email.strip(),
        city=body.city, photo_url=body.photo_url, experience=body.experience,
        department_preference=body.department_preference, status="applied")
    db.add(a); db.commit(); db.refresh(a)
    # send confirmation email to applicant
    from app.services_email import send_application_confirmation
    send_application_confirmation(a)
    # notify all admin users
    for u in db.query(models.User).filter(models.User.role.in_(
            ["super_admin", "secretary_general", "deputy_sg", "director_general"])).all():
        _notify(db, u.email, f"New application: {a.name} → {a.department_preference}", "/ops/applications", "info")
    emit(db, "system", "applied", "applications", a.id, f"New application: {a.name}")
    return {"ok": True, "application_id": a.id, "message": "Application submitted successfully"}


@router.post("/public/apply/upload")
async def apply_photo_upload(f: UploadFile = File(...)):
    """Upload applicant photo."""
    ext = os.path.splitext(f.filename or "")[1].lower()
    allowed = {".png", ".jpg", ".jpeg", ".webp"}
    if ext not in allowed:
        raise HTTPException(400, f"Only image files allowed ({sorted(allowed)})")
    data = await f.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "File over 5MB limit")
    from app.uploads import UPLOAD_DIR, _is_vercel
    name = f"applicant-{_secrets.token_hex(8)}{ext}"
    if _is_vercel:
        import base64
        b64 = base64.b64encode(data).decode()
        mime = f.content_type or "image/png"
        return {"url": f"data:{mime};base64,{b64}", "filename": f.filename, "bytes": len(data), "storage": "inline"}
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(os.path.join(UPLOAD_DIR, name), "wb") as out:
        out.write(data)
    return {"url": f"/uploads/{name}", "filename": f.filename, "bytes": len(data)}


# --- admin operational panel ---
@router.get("/applications", dependencies=[Depends(require("team"))])
def list_applications(db: Session = Depends(get_db), status: str = "", q: str = ""):
    query = db.query(models.Application)
    if status:
        query = query.filter(models.Application.status == status)
    if q:
        from sqlalchemy import or_
        query = query.filter(or_(
            models.Application.name.ilike(f"%{q}%"),
            models.Application.email.ilike(f"%{q}%"),
            models.Application.city.ilike(f"%{q}%")))
    rows = query.order_by(models.Application.id.desc()).limit(500).all()
    depts = {d.id: d.name for d in db.query(models.Department).all()}
    return [{"id": a.id, "name": a.name, "phone": a.phone, "email": a.email,
             "city": a.city, "photo_url": a.photo_url, "experience": a.experience,
             "department_preference": a.department_preference, "status": a.status,
             "interview_date": str(a.interview_date) if a.interview_date else None,
             "interview_notes": a.interview_notes, "reference_number": a.reference_number,
             "department_id": a.department_id, "department_name": depts.get(a.department_id, ""),
             "admin_notes": a.admin_notes, "created_at": str(a.created_at)} for a in rows]


@router.get("/applications/{aid}", dependencies=[Depends(require("team"))])
def get_application(aid: int, db: Session = Depends(get_db)):
    a = db.get(models.Application, aid)
    if not a:
        raise HTTPException(404, "Application not found")
    depts = {d.id: d.name for d in db.query(models.Department).all()}
    return {"id": a.id, "name": a.name, "phone": a.phone, "email": a.email,
            "city": a.city, "photo_url": a.photo_url, "experience": a.experience,
            "department_preference": a.department_preference, "status": a.status,
            "interview_date": str(a.interview_date) if a.interview_date else None,
            "interview_notes": a.interview_notes, "reference_number": a.reference_number,
            "department_id": a.department_id, "department_name": depts.get(a.department_id, ""),
            "admin_notes": a.admin_notes, "created_at": str(a.created_at)}


class ApplicationUpdate(BaseModel):
    status: str = ""
    interview_date: str = ""
    interview_notes: str = ""
    admin_notes: str = ""
    department_id: int | None = None


@router.put("/applications/{aid}", dependencies=[Depends(require("team"))])
def update_application(aid: int, body: ApplicationUpdate, db: Session = Depends(get_db), u=Depends(current_user)):
    from app.services_email import send_interview_email, send_selection_email, send_rejection_email
    a = db.get(models.Application, aid)
    if not a:
        raise HTTPException(404, "Application not found")
    prev_status = a.status
    if body.status:
        a.status = body.status
    if body.interview_date:
        try:
            a.interview_date = datetime.fromisoformat(body.interview_date)
        except ValueError:
            raise HTTPException(400, "Invalid interview date format")
    if body.interview_notes:
        a.interview_notes = body.interview_notes
    if body.admin_notes:
        a.admin_notes = body.admin_notes
    if body.department_id is not None:
        a.department_id = body.department_id

    # --- auto-actions on status change ---
    if body.status == "interview_scheduled" and prev_status != "interview_scheduled":
        send_interview_email(a, a.interview_date)
    elif body.status == "approved" and prev_status != "approved":
        # generate reference number + create User + send selection email
        ref = f"KIMV-{a.id:04d}-{_secrets.token_hex(4).upper()}"
        a.reference_number = ref
        dept = db.get(models.Department, a.department_id) if a.department_id else None
        dept_name = dept.name if dept else a.department_preference
        # create User record for portal access
        nu = models.User(
            name=a.name, email=a.email, password_hash=hash_password(ref),
            role="volunteer", department_id=a.department_id, phone=a.phone)
        nu.reference_number = ref
        db.add(nu)
        send_selection_email(a, ref, dept_name)
    elif body.status == "rejected" and prev_status != "rejected":
        send_rejection_email(a)

    db.commit()
    emit(db, u.email, "updated", "applications", aid, f"Application #{aid} → {a.status}")
    return {"ok": True, "status": a.status, "reference_number": a.reference_number}


# --- volunteer department portal login ---
class DeptLoginIn(BaseModel):
    reference: str


@router.post("/public/apply/login")
def dept_portal_login(body: DeptLoginIn, db: Session = Depends(get_db)):
    """Login with reference number → returns JWT for department portal."""
    ref = body.reference.strip().upper()
    u = db.query(models.User).filter(models.User.reference_number == ref).first()
    if not u:
        raise HTTPException(401, "Invalid reference number")
    from app.security import create_token
    token = create_token(f"volunteer:{ref}")
    return {"token": token, "user": {"id": u.id, "name": u.name, "reference": u.reference_number,
            "department_id": u.department_id, "role": u.role}}


# --- volunteer department portal (authenticated) ---
def _current_volunteer(cred: HTTPAuthorizationCredentials | None = Depends(_portal_bearer),
                       db: Session = Depends(get_db)):
    """Extract volunteer from portal JWT (sub = volunteer:REF)."""
    if not cred:
        raise HTTPException(401, "Portal login required")
    sub = _decode(cred.credentials)
    if not sub or not sub.startswith("volunteer:"):
        raise HTTPException(401, "Invalid portal token")
    ref = sub[len("volunteer:"):]
    u = db.query(models.User).filter(models.User.reference_number == ref).first()
    if not u:
        raise HTTPException(401, "User not found")
    return u


@router.get("/apply/portal/profile")
def vol_profile(u=Depends(_current_volunteer), db: Session = Depends(get_db)):
    dept_obj = db.get(models.Department, u.department_id) if u.department_id else None
    return {"id": u.id, "name": u.name, "email": u.email, "phone": u.phone,
            "reference": u.reference_number, "department_id": u.department_id,
            "department_name": dept_obj.name if dept_obj else "", "role": u.role,
            "status": u.status}


@router.get("/apply/portal/tasks")
def vol_tasks(u=Depends(_current_volunteer), db: Session = Depends(get_db)):
    """Volunteer's department tasks."""
    if not u.department_id:
        return []
    rows = db.query(models.Task).filter(
        models.Task.department_id == u.department_id,
        models.Task.status.notin_(["completed", "cancelled"])
    ).order_by(models.Task.due_date.asc()).limit(100).all()
    owner_ids = {r.owner_id for r in rows if r.owner_id}
    owner_map = {}
    if owner_ids:
        for usr in db.query(models.User).filter(models.User.id.in_(owner_ids)).all():
            owner_map[usr.id] = usr.name
    return [{"id": r.id, "title": r.title, "priority": r.priority, "status": r.status,
             "due_date": str(r.due_date) if r.due_date else None,
             "owner_name": owner_map.get(r.owner_id, "") if r.owner_id else "",
             "description": r.description} for r in rows]


@router.get("/apply/portal/guides")
def vol_guides(u=Depends(_current_volunteer), db: Session = Depends(get_db)):
    """Study guides relevant to volunteer's department (general guides)."""
    rows = db.query(models.StudyGuide).filter(models.StudyGuide.committee_id.is_(None)).all()
    return [{"id": sg.id, "title": sg.title, "description": sg.description,
             "file_url": sg.file_url, "kind": sg.kind} for sg in rows]


# =====================================================================
# TEAM MEMBER PORTAL — reference-number-based department access
# =====================================================================

# --- team member auth dependency ---
def _current_team_member(cred: HTTPAuthorizationCredentials | None = Depends(_portal_bearer),
                         db: Session = Depends(get_db)):
    """Extract team member from portal JWT (sub = team:REF)."""
    if not cred:
        raise HTTPException(401, "Team login required")
    sub = _decode(cred.credentials)
    if not sub or not sub.startswith("team:"):
        raise HTTPException(401, "Invalid team token")
    ref = sub[len("team:"):]
    u = db.query(models.User).filter(models.User.reference_number == ref).first()
    if not u or u.status != "active":
        raise HTTPException(401, "Account inactive or not found")
    if not u.department_id:
        raise HTTPException(403, "No department assigned")
    return u


def require_team_dept(dept_code: str):
    """Dependency that enforces the authenticated user belongs to a specific department."""
    def check(u=Depends(_current_team_member), db: Session = Depends(get_db)):
        dept = db.get(models.Department, u.department_id)
        if not dept or dept.code.upper() != dept_code.upper():
            raise HTTPException(403, f"Access denied: {dept_code} department only")
        return u
    return check


# Team portal role constants
_TEAM_CAN_EDIT = {"secretary_general", "deputy_sg", "director_general", "super_admin", "dept_head", "team_member"}
_TEAM_CAN_MANAGE = {"secretary_general", "deputy_sg", "director_general", "super_admin", "dept_head"}


def require_team_can_edit(u=Depends(_current_team_member)):
    """Dependency: user must have edit access (not volunteer-only)."""
    if u.role not in _TEAM_CAN_EDIT:
        raise HTTPException(403, "Volunteers have view-only access. Contact your department head.")
    return u


def require_team_can_manage(u=Depends(_current_team_member)):
    """Dependency: user must have manage access (dept_head+)."""
    if u.role not in _TEAM_CAN_MANAGE:
        raise HTTPException(403, "Only department heads can perform this action.")
    return u


def require_team_dept_edit(dept_code: str):
    """Dependency: user belongs to department AND has edit access (not volunteer)."""
    def check(u=Depends(_current_team_member), db: Session = Depends(get_db)):
        dept = db.get(models.Department, u.department_id)
        if not dept or dept.code.upper() != dept_code.upper():
            raise HTTPException(403, f"Access denied: {dept_code} department only")
        if u.role not in _TEAM_CAN_EDIT:
            raise HTTPException(403, "Volunteers have view-only access. Contact your department head.")
        return u
    return check


# --- team member login ---
class TeamLoginIn(BaseModel):
    reference: str


@router.post("/public/team/login")
def team_portal_login(body: TeamLoginIn, db: Session = Depends(get_db)):
    """Login with reference number → returns JWT for team member portal."""
    ref = body.reference.strip().upper()
    if not ref.startswith("KIM-") or len(ref) < 10:
        raise HTTPException(401, "Invalid reference format. Expected KIM-XXX-XXXX")
    u = db.query(models.User).filter(models.User.reference_number == ref).first()
    if not u:
        raise HTTPException(401, "Invalid reference number")
    if u.status != "active":
        raise HTTPException(401, "Reference deactivated. Contact administration.")
    if not u.department_id:
        raise HTTPException(401, "No department assigned. Contact administration.")
    dept = db.get(models.Department, u.department_id)
    if not dept:
        raise HTTPException(401, "Department not found")
    token = create_token(f"team:{ref}")
    return {
        "token": token,
        "user": {
            "id": u.id, "name": u.name, "reference": u.reference_number,
            "department_id": u.department_id, "department_code": dept.code,
            "department_name": dept.name, "role": u.role
        }
    }


# --- team member profile ---
@router.get("/team/profile")
def team_profile(u=Depends(_current_team_member), db: Session = Depends(get_db)):
    dept = db.get(models.Department, u.department_id) if u.department_id else None
    return {
        "id": u.id, "name": u.name, "email": u.email, "phone": u.phone,
        "reference": u.reference_number, "department_id": u.department_id,
        "department_code": dept.code if dept else "",
        "department_name": dept.name if dept else "",
        "department_description": dept.description if dept else "",
        "role": u.role, "status": u.status
    }


# --- team member tasks (filtered by department) ---
@router.get("/team/tasks")
def team_tasks(u=Depends(_current_team_member), db: Session = Depends(get_db)):
    """Team member's department tasks."""
    rows = db.query(models.Task).filter(
        models.Task.department_id == u.department_id,
        models.Task.status.notin_(["completed", "cancelled"])
    ).order_by(models.Task.due_date.asc()).limit(100).all()
    owner_ids = {r.owner_id for r in rows if r.owner_id}
    owner_map = {}
    if owner_ids:
        for usr in db.query(models.User).filter(models.User.id.in_(owner_ids)).all():
            owner_map[usr.id] = usr.name
    return [{"id": r.id, "title": r.title, "priority": r.priority, "status": r.status,
             "due_date": str(r.due_date) if r.due_date else None,
             "owner_name": owner_map.get(r.owner_id, "") if r.owner_id else "",
             "description": r.description} for r in rows]


# --- team member study guides ---
@router.get("/team/guides")
def team_guides(u=Depends(_current_team_member), db: Session = Depends(get_db)):
    """Study guides relevant to team member's department."""
    rows = db.query(models.StudyGuide).filter(models.StudyGuide.committee_id.is_(None)).all()
    return [{"id": sg.id, "title": sg.title, "description": sg.description,
             "file_url": sg.file_url, "kind": sg.kind} for sg in rows]


# --- team member dashboard stats ---
@router.get("/team/dashboard")
def team_dashboard(u=Depends(_current_team_member), db: Session = Depends(get_db)):
    """Department dashboard statistics."""
    dept_id = u.department_id
    total_tasks = db.query(models.Task).filter(models.Task.department_id == dept_id).count()
    open_tasks = db.query(models.Task).filter(
        models.Task.department_id == dept_id,
        models.Task.status.notin_(["completed", "cancelled"])
    ).count()
    completed_tasks = db.query(models.Task).filter(
        models.Task.department_id == dept_id,
        models.Task.status == "completed"
    ).count()
    team_members = db.query(models.User).filter(
        models.User.department_id == dept_id,
        models.User.status == "active"
    ).count()
    dept = db.get(models.Department, dept_id)
    return {
        "department_code": dept.code if dept else "",
        "department_name": dept.name if dept else "",
        "department_description": dept.description if dept else "",
        "total_tasks": total_tasks,
        "open_tasks": open_tasks,
        "completed_tasks": completed_tasks,
        "team_members": team_members,
    }


# ─── SECURITY OPERATIONS (SEC) ──────────────────────────────────────

@router.get("/team/sec/incidents")
def sec_incidents(u=Depends(require_team_dept("SEC")), db: Session = Depends(get_db)):
    rows = db.query(models.Incident).order_by(models.Incident.id.desc()).limit(100).all()
    return [{"id": r.id, "title": r.title, "severity": r.severity, "location": r.location,
             "reported_by": r.reported_by, "assigned_to": r.assigned_to,
             "status": r.status, "resolution": r.resolution} for r in rows]


class IncidentIn(BaseModel):
    title: str
    severity: str = "low"
    location: str = ""
    description: str = ""


@router.post("/team/sec/incidents")
def sec_create_incident(body: IncidentIn, u=Depends(require_team_dept_edit("SEC")), db: Session = Depends(get_db)):
    inc = models.Incident(title=body.title, severity=body.severity,
                          location=body.location, description=body.description,
                          reported_by=u.name, status="open")
    db.add(inc); db.commit(); db.refresh(inc)
    emit(db, u.email, "created", "incident", inc.id, f"Incident: {inc.title}")
    return {"id": inc.id, "status": inc.status}


@router.get("/team/sec/schedule")
def sec_schedule(u=Depends(require_team_dept("SEC")), db: Session = Depends(get_db)):
    rows = db.query(models.Shift).filter(
        models.Shift.zone.ilike("%security%")
    ).order_by(models.Shift.shift_date.asc()).limit(50).all()
    return [{"id": r.id, "date": str(r.shift_date), "start": r.start_time, "end": r.end_time,
             "zone": r.zone, "role": r.role, "status": r.status, "notes": r.notes} for r in rows]


# ─── PUBLIC RELATIONS (PR) ──────────────────────────────────────────

@router.get("/team/pr/announcements")
def pr_announcements(u=Depends(require_team_dept("PR")), db: Session = Depends(get_db)):
    rows = db.query(models.ContentItem).filter(
        models.ContentItem.content_type.ilike("%announcement%")
    ).order_by(models.ContentItem.id.desc()).limit(50).all()
    return [{"id": r.id, "title": r.title, "status": r.status, "platform": r.platform,
             "caption": r.caption, "publish_date": str(r.publish_date) if r.publish_date else None} for r in rows]


class AnnouncementIn(BaseModel):
    title: str
    caption: str = ""
    platform: str = "All"


@router.post("/team/pr/announcements")
def pr_create_announcement(body: AnnouncementIn, u=Depends(require_team_dept_edit("PR")), db: Session = Depends(get_db)):
    ci = models.ContentItem(title=body.title, content_type="Announcement",
                            platform=body.platform, caption=body.caption,
                            status="draft", owner=u.name)
    db.add(ci); db.commit(); db.refresh(ci)
    emit(db, u.email, "created", "content", ci.id, f"Announcement: {ci.title}")
    return {"id": ci.id}


@router.get("/team/pr/contacts")
def pr_contacts(u=Depends(require_team_dept("PR")), db: Session = Depends(get_db)):
    rows = db.query(models.PressContact).order_by(models.PressContact.id.desc()).limit(100).all()
    return [{"id": r.id, "outlet": r.outlet, "name": r.name, "email": r.email,
             "status": r.status, "notes": r.notes} for r in rows]


# ─── MEDIA & DOCUMENTATION (MED) ────────────────────────────────────

@router.get("/team/med/uploads")
def med_uploads(u=Depends(require_team_dept("MED")), db: Session = Depends(get_db)):
    rows = db.query(models.Asset).filter(
        models.Asset.kind.ilike("%photo%") | models.Asset.kind.ilike("%video%") | models.Asset.kind.ilike("%media%")
    ).order_by(models.Asset.id.desc()).limit(100).all()
    return [{"id": r.id, "name": r.name, "kind": r.kind, "tags": r.tags,
             "url": r.url, "approval": r.approval} for r in rows]


@router.get("/team/med/schedule")
def med_schedule(u=Depends(require_team_dept("MED")), db: Session = Depends(get_db)):
    rows = db.query(models.Shift).filter(
        models.Shift.role.ilike("%photo%") | models.Shift.role.ilike("%video%") | models.Shift.zone.ilike("%media%")
    ).order_by(models.Shift.shift_date.asc()).limit(50).all()
    return [{"id": r.id, "date": str(r.shift_date), "start": r.start_time, "end": r.end_time,
              "zone": r.zone, "role": r.role, "status": r.status} for r in rows]


# ─── MARKETING (MKT) ────────────────────────────────────────────────

@router.get("/team/mkt/campaigns")
def mkt_campaigns(u=Depends(require_team_dept("MKT")), db: Session = Depends(get_db)):
    rows = db.query(models.Campaign).order_by(models.Campaign.id.desc()).limit(50).all()
    return [{"id": r.id, "name": r.name, "objective": r.objective, "status": r.status,
             "platforms": r.platforms, "owner": r.owner,
             "start_date": str(r.start_date) if r.start_date else None,
             "end_date": str(r.end_date) if r.end_date else None} for r in rows]


@router.get("/team/mkt/content")
def mkt_content(u=Depends(require_team_dept("MKT")), db: Session = Depends(get_db)):
    rows = db.query(models.ContentItem).order_by(models.ContentItem.id.desc()).limit(100).all()
    return [{"id": r.id, "title": r.title, "content_type": r.content_type,
             "platform": r.platform, "status": r.status, "approval": r.approval,
             "publish_date": str(r.publish_date) if r.publish_date else None} for r in rows]


class ContentIn(BaseModel):
    title: str
    content_type: str = "Post"
    platform: str = "Instagram"
    caption: str = ""


@router.post("/team/mkt/content")
def mkt_create_content(body: ContentIn, u=Depends(require_team_dept_edit("MKT")), db: Session = Depends(get_db)):
    ci = models.ContentItem(title=body.title, content_type=body.content_type,
                            platform=body.platform, caption=body.caption,
                            status="draft", owner=u.name)
    db.add(ci); db.commit(); db.refresh(ci)
    emit(db, u.email, "created", "content", ci.id, f"Content: {ci.title}")
    return {"id": ci.id}


@router.get("/team/mkt/ideas")
def mkt_ideas(u=Depends(require_team_dept("MKT")), db: Session = Depends(get_db)):
    rows = db.query(models.ContentIdea).order_by(models.ContentIdea.id.desc()).limit(50).all()
    return [{"id": r.id, "title": r.title, "format": r.format, "description": r.description,
             "platform": r.platform, "votes": r.votes, "status": r.status} for r in rows]


# ─── ORGANIZING COMMITTEE (ORG) ─────────────────────────────────────

@router.get("/team/org/volunteers")
def org_volunteers(u=Depends(require_team_dept("ORG")), db: Session = Depends(get_db)):
    rows = db.query(models.User).filter(models.User.role == "volunteer").all()
    return [{"id": r.id, "name": r.name, "email": r.email, "phone": r.phone,
             "status": r.status, "availability": r.availability,
             "reference": r.reference_number} for r in rows]


@router.get("/team/org/schedule")
def org_schedule(u=Depends(require_team_dept("ORG")), db: Session = Depends(get_db)):
    rows = db.query(models.Shift).order_by(models.Shift.shift_date.asc()).limit(100).all()
    return [{"id": r.id, "user_id": r.user_id, "date": str(r.shift_date),
             "start": r.start_time, "end": r.end_time, "zone": r.zone,
             "role": r.role, "status": r.status, "notes": r.notes} for r in rows]


@router.get("/team/org/logistics")
def org_logistics(u=Depends(require_team_dept("ORG")), db: Session = Depends(get_db)):
    rows = db.query(models.VenueCheck).order_by(models.VenueCheck.id.desc()).limit(100).all()
    return [{"id": r.id, "area": r.area, "item": r.item, "status": r.status,
             "owner": r.owner, "notes": r.notes} for r in rows]


# ─── ACADEMICS (ACA) ────────────────────────────────────────────────

@router.get("/team/aca/committees")
def aca_committees(u=Depends(require_team_dept("ACA")), db: Session = Depends(get_db)):
    rows = db.query(models.Committee).order_by(models.Committee.id).all()
    return [{"id": r.id, "name": r.name, "type": r.type, "agenda": r.agenda,
             "chair": r.chair, "co_chair": r.co_chair, "director": r.director,
             "room": r.room, "capacity": r.capacity} for r in rows]


@router.get("/team/aca/guides")
def aca_guides(u=Depends(require_team_dept("ACA")), db: Session = Depends(get_db)):
    rows = db.query(models.StudyGuide).order_by(models.StudyGuide.id.desc()).limit(100).all()
    return [{"id": sg.id, "title": sg.title, "description": sg.description,
             "file_url": sg.file_url, "kind": sg.kind,
             "committee_id": sg.committee_id} for sg in rows]


@router.get("/team/aca/sessions")
def aca_sessions(u=Depends(require_team_dept("ACA")), db: Session = Depends(get_db)):
    rows = db.query(models.CommitteeSession).order_by(
        models.CommitteeSession.session_date.asc()).limit(100).all()
    return [{"id": r.id, "committee_id": r.committee_id, "title": r.title,
             "session_date": str(r.session_date), "start_time": r.start_time,
             "end_time": r.end_time, "room": r.room, "chair": r.chair,
             "status": r.status} for r in rows]


# ─── OUTREACH (OUT) ─────────────────────────────────────────────────

@router.get("/team/out/contacts")
def out_contacts(u=Depends(require_team_dept("OUT")), db: Session = Depends(get_db)):
    rows = db.query(models.PressContact).order_by(models.PressContact.id.desc()).limit(100).all()
    return [{"id": r.id, "outlet": r.outlet, "name": r.name, "email": r.email,
             "status": r.status, "notes": r.notes} for r in rows]


class ContactIn(BaseModel):
    outlet: str
    name: str
    email: str = ""
    notes: str = ""


@router.post("/team/out/contacts")
def out_create_contact(body: ContactIn, u=Depends(require_team_dept_edit("OUT")), db: Session = Depends(get_db)):
    pc = models.PressContact(outlet=body.outlet, name=body.name,
                             email=body.email, notes=body.notes, status="active")
    db.add(pc); db.commit(); db.refresh(pc)
    emit(db, u.email, "created", "contact", pc.id, f"Contact: {pc.name}")
    return {"id": pc.id}


@router.get("/team/out/ambassadors")
def out_ambassadors(u=Depends(require_team_dept("OUT")), db: Session = Depends(get_db)):
    rows = db.query(models.Ambassador).order_by(models.Ambassador.id.desc()).limit(100).all()
    return [{"id": r.id, "name": r.name, "institution": r.institution,
             "platform": r.platform, "handle": r.handle, "code": r.code,
             "registrations": r.registrations, "status": r.status} for r in rows]


# ─── TECHNICAL ASSISTANCE (TECH) ────────────────────────────────────


@router.get("/team/tech/equipment")
def tech_equipment(u=Depends(require_team_dept("TECH")), db: Session = Depends(get_db)):
    rows = db.query(models.ProcurementItem).order_by(models.ProcurementItem.id.desc()).limit(100).all()
    return [{"id": r.id, "item": r.item, "quantity": r.quantity, "status": r.status,
             "final_cost": r.final_cost, "delivery_date": str(r.delivery_date) if r.delivery_date else None} for r in rows]


@router.get("/team/tech/status")
def tech_status(u=Depends(require_team_dept("TECH")), db: Session = Depends(get_db)):
    rows = db.query(models.VenueCheck).all()
    return [{"id": r.id, "area": r.area, "item": r.item, "status": r.status,
             "owner": r.owner, "notes": r.notes} for r in rows]


# ─── BRAND AMBASSADORS (BA) ─────────────────────────────────────────

@router.get("/team/ba/ambassadors")
def ba_ambassadors(u=Depends(require_team_dept("BA")), db: Session = Depends(get_db)):
    rows = db.query(models.Ambassador).order_by(models.Ambassador.id.desc()).limit(100).all()
    return [{"id": r.id, "name": r.name, "institution": r.institution,
             "platform": r.platform, "handle": r.handle, "code": r.code,
             "registrations": r.registrations, "status": r.status} for r in rows]


@router.get("/team/ba/content")
def ba_content(u=Depends(require_team_dept("BA")), db: Session = Depends(get_db)):
    rows = db.query(models.ContentItem).order_by(models.ContentItem.id.desc()).limit(100).all()
    return [{"id": r.id, "title": r.title, "content_type": r.content_type,
             "platform": r.platform, "status": r.status,
             "metrics_reach": r.metrics_reach, "metrics_engagement": r.metrics_engagement} for r in rows]


class AmbassadorIn(BaseModel):
    name: str
    institution: str = ""
    platform: str = ""
    handle: str = ""
    code: str = ""


@router.post("/team/ba/ambassadors")
def ba_create_ambassador(body: AmbassadorIn, u=Depends(require_team_dept_edit("BA")), db: Session = Depends(get_db)):
    a = models.Ambassador(name=body.name, institution=body.institution,
                          platform=body.platform, handle=body.handle,
                          code=body.code, status="active")
    db.add(a); db.commit(); db.refresh(a)
    emit(db, u.email, "created", "ambassador", a.id, f"Ambassador: {a.name}")
    return {"id": a.id}


@router.get("/team/ba/metrics")
def ba_metrics(u=Depends(require_team_dept("BA")), db: Session = Depends(get_db)):
    rows = db.query(models.Ambassador).all()
    total_reg = sum(r.registrations for r in rows)
    active = sum(1 for r in rows if r.status == "active")
    return {"total_ambassadors": len(rows), "active_ambassadors": active,
            "total_registrations": total_reg}


# ═══════════════════════════════════════════════════════════════════
# REBUILT DEPARTMENT ENDPOINTS — Production-grade CRUD
# ═══════════════════════════════════════════════════════════════════

# ─── SEC: Incidents (full CRUD) ────────────────────────────────────
class IncidentUpdateIn(BaseModel):
    status: str | None = None
    resolution: str | None = None
    assigned_to: str | None = None
    severity: str | None = None

@router.put("/team/sec/incidents/{inc_id}")
def sec_update_incident(inc_id: int, body: IncidentUpdateIn,
                        u=Depends(require_team_dept("SEC")), db: Session = Depends(get_db)):
    inc = db.get(models.Incident, inc_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(inc, k, v)
    db.commit()
    emit(db, u.email, "updated", "incident", inc.id, f"Updated incident: {inc.title}")
    return {"ok": True}

@router.delete("/team/sec/incidents/{inc_id}")
def sec_delete_incident(inc_id: int, u=Depends(require_team_can_manage),
                        db: Session = Depends(get_db)):
    inc = db.get(models.Incident, inc_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    db.delete(inc); db.commit()
    return {"ok": True}


# ─── SEC: Security Zones ──────────────────────────────────────────
class SecurityZoneIn(BaseModel):
    name: str
    area: str = ""
    access_level: str = "general"
    notes: str = ""

class SecurityZoneUpdateIn(BaseModel):
    name: str | None = None
    area: str | None = None
    access_level: str | None = None
    status: str | None = None
    assigned_team: str | None = None
    notes: str | None = None

@router.get("/team/sec/zones")
def sec_zones(u=Depends(require_team_dept("SEC")), db: Session = Depends(get_db)):
    rows = db.query(models.SecurityZone).order_by(models.SecurityZone.id.desc()).limit(100).all()
    return [{"id": r.id, "name": r.name, "area": r.area, "access_level": r.access_level,
             "status": r.status, "assigned_team": r.assigned_team, "notes": r.notes} for r in rows]

@router.post("/team/sec/zones")
def sec_create_zone(body: SecurityZoneIn, u=Depends(require_team_dept_edit("SEC")), db: Session = Depends(get_db)):
    z = models.SecurityZone(name=body.name, area=body.area, access_level=body.access_level,
                            notes=body.notes, status="active", assigned_team=u.name)
    db.add(z); db.commit(); db.refresh(z)
    emit(db, u.email, "created", "security_zone", z.id, f"Zone: {z.name}")
    return {"id": z.id}

@router.put("/team/sec/zones/{zid}")
def sec_update_zone(zid: int, body: SecurityZoneUpdateIn,
                    u=Depends(require_team_dept("SEC")), db: Session = Depends(get_db)):
    z = db.get(models.SecurityZone, zid)
    if not z:
        raise HTTPException(404, "Zone not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(z, k, v)
    db.commit()
    return {"ok": True}

@router.delete("/team/sec/zones/{zid}")
def sec_delete_zone(zid: int, u=Depends(require_team_can_manage), db: Session = Depends(get_db)):
    z = db.get(models.SecurityZone, zid)
    if not z:
        raise HTTPException(404, "Zone not found")
    db.delete(z); db.commit()
    return {"ok": True}


# ─── SEC: Emergency Contacts ──────────────────────────────────────
class EmergencyContactIn(BaseModel):
    name: str
    role: str = ""
    phone: str
    category: str = "internal"
    notes: str = ""

@router.get("/team/sec/contacts")
def sec_emergency_contacts(u=Depends(require_team_dept("SEC")), db: Session = Depends(get_db)):
    rows = db.query(models.EmergencyContact).order_by(models.EmergencyContact.id.desc()).limit(100).all()
    return [{"id": r.id, "name": r.name, "role": r.role, "phone": r.phone,
             "category": r.category, "notes": r.notes} for r in rows]

@router.post("/team/sec/contacts")
def sec_create_contact(body: EmergencyContactIn, u=Depends(require_team_dept_edit("SEC")), db: Session = Depends(get_db)):
    c = models.EmergencyContact(name=body.name, role=body.role, phone=body.phone,
                                category=body.category, notes=body.notes)
    db.add(c); db.commit(); db.refresh(c)
    emit(db, u.email, "created", "emergency_contact", c.id, f"Contact: {c.name}")
    return {"id": c.id}

@router.delete("/team/sec/contacts/{cid}")
def sec_delete_contact(cid: int, u=Depends(require_team_can_manage), db: Session = Depends(get_db)):
    c = db.get(models.EmergencyContact, cid)
    if not c:
        raise HTTPException(404, "Contact not found")
    db.delete(c); db.commit()
    return {"ok": True}


# ─── TECH: Tickets (full CRUD with categories) ────────────────────
class TicketIn(BaseModel):
    title: str
    description: str = ""
    category: str = "general"
    priority: str = "medium"
    room: str = ""

class TicketUpdateIn(BaseModel):
    status: str | None = None
    assigned_to: str | None = None
    resolution: str | None = None
    priority: str | None = None

@router.get("/team/tech/tickets")
def tech_tickets(u=Depends(require_team_dept("TECH")), db: Session = Depends(get_db)):
    rows = db.query(models.Ticket).order_by(models.Ticket.id.desc()).limit(100).all()
    return [{"id": r.id, "title": r.title, "description": r.description, "category": r.category,
             "priority": r.priority, "status": r.status, "room": r.room,
             "reported_by": r.reported_by, "assigned_to": r.assigned_to,
             "resolution": r.resolution, "created_at": str(r.created_at) if r.created_at else None} for r in rows]

@router.post("/team/tech/tickets")
def tech_create_ticket(body: TicketIn, u=Depends(require_team_dept_edit("TECH")), db: Session = Depends(get_db)):
    t = models.Ticket(title=body.title, description=body.description, category=body.category,
                      priority=body.priority, room=body.room, reported_by=u.name, status="open")
    db.add(t); db.commit(); db.refresh(t)
    emit(db, u.email, "created", "ticket", t.id, f"Ticket: {t.title}")
    return {"id": t.id}

@router.put("/team/tech/tickets/{tid}")
def tech_update_ticket(tid: int, body: TicketUpdateIn,
                       u=Depends(require_team_dept("TECH")), db: Session = Depends(get_db)):
    t = db.get(models.Ticket, tid)
    if not t:
        raise HTTPException(404, "Ticket not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(t, k, v)
    db.commit()
    emit(db, u.email, "updated", "ticket", t.id, f"Updated ticket: {t.title}")
    return {"ok": True}

@router.delete("/team/tech/tickets/{tid}")
def tech_delete_ticket(tid: int, u=Depends(require_team_can_manage), db: Session = Depends(get_db)):
    t = db.get(models.Ticket, tid)
    if not t:
        raise HTTPException(404, "Ticket not found")
    db.delete(t); db.commit()
    return {"ok": True}


# ─── TECH: Room Status ────────────────────────────────────────────
@router.get("/team/tech/rooms")
def tech_rooms(u=Depends(require_team_dept("TECH")), db: Session = Depends(get_db)):
    rows = db.query(models.Room).order_by(models.Room.name).limit(100).all()
    return [{"id": r.id, "name": r.name, "capacity": r.capacity,
             "assignment": r.assignment} for r in rows]

class RoomUpdateIn(BaseModel):
    assignment: str | None = None

@router.put("/team/tech/rooms/{rid}")
def tech_update_room(rid: int, body: RoomUpdateIn,
                     u=Depends(require_team_dept("TECH")), db: Session = Depends(get_db)):
    r = db.get(models.Room, rid)
    if not r:
        raise HTTPException(404, "Room not found")
    if body.assignment is not None:
        r.assignment = body.assignment
    db.commit()
    return {"ok": True}


# ─── MED: Media Items (full CRUD) ─────────────────────────────────
class MediaItemIn(BaseModel):
    name: str
    kind: str = "photo"
    url: str = ""
    thumbnail_url: str = ""
    event: str = ""
    tags: str = ""

class MediaItemUpdateIn(BaseModel):
    status: str | None = None
    approval: str | None = None

@router.get("/team/med/media")
def med_media(u=Depends(require_team_dept("MED")), db: Session = Depends(get_db)):
    rows = db.query(models.MediaItem).order_by(models.MediaItem.id.desc()).limit(100).all()
    return [{"id": r.id, "name": r.name, "kind": r.kind, "url": r.url,
             "thumbnail_url": r.thumbnail_url, "photographer": r.photographer,
             "event": r.event, "tags": r.tags, "status": r.status,
             "approval": r.approval, "created_at": str(r.created_at) if r.created_at else None} for r in rows]

@router.post("/team/med/media")
def med_create_media(body: MediaItemIn, u=Depends(require_team_dept_edit("MED")), db: Session = Depends(get_db)):
    m = models.MediaItem(name=body.name, kind=body.kind, url=body.url,
                         thumbnail_url=body.thumbnail_url, photographer=u.name,
                         event=body.event, tags=body.tags, status="uploaded")
    db.add(m); db.commit(); db.refresh(m)
    emit(db, u.email, "created", "media", m.id, f"Media: {m.name}")
    return {"id": m.id}

@router.put("/team/med/media/{mid}")
def med_update_media(mid: int, body: MediaItemUpdateIn,
                     u=Depends(require_team_dept("MED")), db: Session = Depends(get_db)):
    m = db.get(models.MediaItem, mid)
    if not m:
        raise HTTPException(404, "Media item not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(m, k, v)
    db.commit()
    return {"ok": True}

@router.delete("/team/med/media/{mid}")
def med_delete_media(mid: int, u=Depends(require_team_can_manage), db: Session = Depends(get_db)):
    m = db.get(models.MediaItem, mid)
    if not m:
        raise HTTPException(404, "Media item not found")
    db.delete(m); db.commit()
    return {"ok": True}

@router.get("/team/med/archive")
def med_archive(u=Depends(require_team_dept("MED")), db: Session = Depends(get_db)):
    rows = db.query(models.MediaItem).filter(
        models.MediaItem.status == "archived"
    ).order_by(models.MediaItem.id.desc()).limit(100).all()
    return [{"id": r.id, "name": r.name, "kind": r.kind, "url": r.url,
             "thumbnail_url": r.thumbnail_url, "photographer": r.photographer,
             "event": r.event, "status": r.status, "approval": r.approval} for r in rows]


# ─── MED: Videos ──────────────────────────────────────────────────
class VideoIn(BaseModel):
    title: str
    kind: str = "Reel"
    script: str = ""
    deadline: str = ""

@router.get("/team/med/videos")
def med_videos(u=Depends(require_team_dept("MED")), db: Session = Depends(get_db)):
    rows = db.query(models.Video).order_by(models.Video.id.desc()).limit(50).all()
    return [{"id": r.id, "title": r.title, "kind": r.kind, "editor": r.editor,
             "status": r.status, "script": r.script, "footage": r.footage,
             "deadline": str(r.deadline) if r.deadline else None} for r in rows]

@router.post("/team/med/videos")
def med_create_video(body: VideoIn, u=Depends(require_team_dept_edit("MED")), db: Session = Depends(get_db)):
    v = models.Video(title=body.title, kind=body.kind, script=body.script,
                     editor=u.name, status="filming")
    if body.deadline:
        from datetime import date as _date
        try:
            v.deadline = _date.fromisoformat(body.deadline)
        except ValueError:
            pass
    db.add(v); db.commit(); db.refresh(v)
    emit(db, u.email, "created", "video", v.id, f"Video: {v.title}")
    return {"id": v.id}


# ─── ORG: Supply Items (logistics CRUD) ───────────────────────────
class SupplyItemIn(BaseModel):
    item: str
    category: str = "general"
    quantity: int = 1
    vendor: str = ""
    cost: float = 0
    notes: str = ""

class SupplyItemUpdateIn(BaseModel):
    status: str | None = None
    quantity: int | None = None
    cost: float | None = None

@router.get("/team/org/supplies")
def org_supplies(u=Depends(require_team_dept("ORG")), db: Session = Depends(get_db)):
    rows = db.query(models.SupplyItem).order_by(models.SupplyItem.id.desc()).limit(100).all()
    return [{"id": r.id, "item": r.item, "category": r.category, "quantity": r.quantity,
             "vendor": r.vendor, "cost": r.cost, "status": r.status,
             "notes": r.notes, "created_at": str(r.created_at) if r.created_at else None} for r in rows]

@router.post("/team/org/supplies")
def org_create_supply(body: SupplyItemIn, u=Depends(require_team_dept_edit("ORG")), db: Session = Depends(get_db)):
    s = models.SupplyItem(item=body.item, category=body.category, quantity=body.quantity,
                          vendor=body.vendor, cost=body.cost, notes=body.notes, status="requested")
    db.add(s); db.commit(); db.refresh(s)
    emit(db, u.email, "created", "supply", s.id, f"Supply: {s.item}")
    return {"id": s.id}

@router.put("/team/org/supplies/{sid}")
def org_update_supply(sid: int, body: SupplyItemUpdateIn,
                      u=Depends(require_team_dept("ORG")), db: Session = Depends(get_db)):
    s = db.get(models.SupplyItem, sid)
    if not s:
        raise HTTPException(404, "Supply item not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    db.commit()
    return {"ok": True}

@router.delete("/team/org/supplies/{sid}")
def org_delete_supply(sid: int, u=Depends(require_team_can_manage), db: Session = Depends(get_db)):
    s = db.get(models.SupplyItem, sid)
    if not s:
        raise HTTPException(404, "Supply item not found")
    db.delete(s); db.commit()
    return {"ok": True}


# ─── OUT: School Contacts (replacing PressContact) ────────────────
class SchoolContactIn(BaseModel):
    school_name: str
    city: str = ""
    contact_person: str = ""
    email: str = ""
    phone: str = ""
    students_estimate: int = 0
    notes: str = ""

class SchoolContactUpdateIn(BaseModel):
    status: str | None = None
    notes: str | None = None

@router.get("/team/out/schools")
def out_schools(u=Depends(require_team_dept("OUT")), db: Session = Depends(get_db)):
    rows = db.query(models.SchoolContact).order_by(models.SchoolContact.id.desc()).limit(100).all()
    return [{"id": r.id, "school_name": r.school_name, "city": r.city,
             "contact_person": r.contact_person, "email": r.email, "phone": r.phone,
             "students_estimate": r.students_estimate, "status": r.status,
             "notes": r.notes, "created_at": str(r.created_at) if r.created_at else None} for r in rows]

@router.post("/team/out/schools")
def out_create_school(body: SchoolContactIn, u=Depends(require_team_dept_edit("OUT")), db: Session = Depends(get_db)):
    s = models.SchoolContact(school_name=body.school_name, city=body.city,
                             contact_person=body.contact_person, email=body.email,
                             phone=body.phone, students_estimate=body.students_estimate,
                             notes=body.notes, status="prospect")
    db.add(s); db.commit(); db.refresh(s)
    emit(db, u.email, "created", "school_contact", s.id, f"School: {s.school_name}")
    return {"id": s.id}

@router.put("/team/out/schools/{sid}")
def out_update_school(sid: int, body: SchoolContactUpdateIn,
                      u=Depends(require_team_dept("OUT")), db: Session = Depends(get_db)):
    s = db.get(models.SchoolContact, sid)
    if not s:
        raise HTTPException(404, "School contact not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    db.commit()
    return {"ok": True}

@router.delete("/team/out/schools/{sid}")
def out_delete_school(sid: int, u=Depends(require_team_can_manage), db: Session = Depends(get_db)):
    s = db.get(models.SchoolContact, sid)
    if not s:
        raise HTTPException(404, "School contact not found")
    db.delete(s); db.commit()
    return {"ok": True}


# ─── PR: Press Releases ───────────────────────────────────────────
class PressReleaseIn(BaseModel):
    title: str
    body: str = ""
    target_outlets: str = ""
    release_date: str = ""

class PressReleaseUpdateIn(BaseModel):
    status: str | None = None
    body: str | None = None
    sent_by: str | None = None

@router.get("/team/pr/releases")
def pr_releases(u=Depends(require_team_dept("PR")), db: Session = Depends(get_db)):
    rows = db.query(models.PressRelease).order_by(models.PressRelease.id.desc()).limit(50).all()
    return [{"id": r.id, "title": r.title, "body": r.body, "target_outlets": r.target_outlets,
             "release_date": str(r.release_date) if r.release_date else None,
             "status": r.status, "sent_by": r.sent_by,
             "created_at": str(r.created_at) if r.created_at else None} for r in rows]

@router.post("/team/pr/releases")
def pr_create_release(body: PressReleaseIn, u=Depends(require_team_dept_edit("PR")), db: Session = Depends(get_db)):
    pr = models.PressRelease(title=body.title, body=body.body, target_outlets=body.target_outlets,
                             status="draft", sent_by=u.name)
    if body.release_date:
        from datetime import date as _date
        try:
            pr.release_date = _date.fromisoformat(body.release_date)
        except ValueError:
            pass
    db.add(pr); db.commit(); db.refresh(pr)
    emit(db, u.email, "created", "press_release", pr.id, f"Release: {pr.title}")
    return {"id": pr.id}

@router.put("/team/pr/releases/{rid}")
def pr_update_release(rid: int, body: PressReleaseUpdateIn,
                      u=Depends(require_team_dept("PR")), db: Session = Depends(get_db)):
    pr = db.get(models.PressRelease, rid)
    if not pr:
        raise HTTPException(404, "Press release not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(pr, k, v)
    db.commit()
    return {"ok": True}

@router.delete("/team/pr/releases/{rid}")
def pr_delete_release(rid: int, u=Depends(require_team_can_manage), db: Session = Depends(get_db)):
    pr = db.get(models.PressRelease, rid)
    if not pr:
        raise HTTPException(404, "Press release not found")
    db.delete(pr); db.commit()
    return {"ok": True}


# =====================================================================
# DEMO DATA MANAGEMENT — wipe demo rows, keep real data
# =====================================================================

@router.post("/admin/wipe-demo", dependencies=[Depends(require("settings"))])
def wipe_demo_data(u=Depends(current_user), db: Session = Depends(get_db)):
    """Delete all [DEMO] prefixed rows + seed user sg@kimun.demo. Real data untouched."""
    deleted = 0
    # wipe demo-tagged records across key tables
    for model_cls in [models.Delegate, models.Group, models.Committee, models.Sponsor,
                      models.Task, models.Application, models.User, models.Department,
                      models.Transaction, models.Vendor, models.Campaign, models.Asset,
                      models.ContentIdea, models.ContentItem, models.Video,
                      models.SocialAccount, models.Ambassador, models.SchoolContact,
                      models.PressRelease, models.PressContact, models.SupplyItem,
                      models.Room, models.VenueCheck, models.ProcurementItem,
                      models.Ticket, models.MediaItem, models.EmergencyContact,
                      models.SecurityZone, models.Incident, models.Document,
                      models.Approval, models.Risk, models.ActivityEvent,
                      models.Notification, models.Shift, models.CommitteeSession,
                      models.AssetVersion, models.DelegateNote, models.StudyGuide,
                      models.CommitteeCountry, models.SponsorDeliverable,
                      models.TaskComment]:
        try:
            rows = db.query(model_cls).all()
            for r in rows:
                name = getattr(r, "name", "") or getattr(r, "title", "") or getattr(r, "email", "") or ""
                if "[DEMO]" in str(name) or str(name).startswith("[DEMO]"):
                    db.delete(r)
                    deleted += 1
        except Exception:
            pass  # table may not exist
    # also wipe the seed demo user
    demo_user = db.query(models.User).filter_by(email="sg@kimun.demo").first()
    if demo_user:
        db.delete(demo_user)
        deleted += 1
    db.commit()
    emit(db, u.email, "wiped_demo", "system", 0, f"Wiped {deleted} demo records")
    return {"ok": True, "deleted": deleted}


@router.post("/admin/wipe-all", dependencies=[Depends(require("settings"))])
def wipe_all_data(u=Depends(current_user), db: Session = Depends(get_db)):
    """Nuclear option: delete EVERYTHING. Only super_admin allowed."""
    from app.seed import wipe
    wipe(db)
    emit(db, u.email, "wiped_all", "system", 0, "Full database wipe")
    return {"ok": True, "message": "All data wiped"}
