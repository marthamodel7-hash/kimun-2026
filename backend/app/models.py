"""Central SQLAlchemy models — normalized, no JSON-blob entities."""
from __future__ import annotations
from datetime import datetime, date, timezone
from sqlalchemy import (String, Text, Integer, Float, Boolean, DateTime, Date,
                        ForeignKey, Enum as SAEnum, UniqueConstraint)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
import enum


class Base(DeclarativeBase):
    pass


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class RoleName(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    SECRETARY_GENERAL = "secretary_general"
    DEPUTY_SG = "deputy_sg"
    DIRECTOR_GENERAL = "director_general"
    DEPT_HEAD = "dept_head"
    TEAM_MEMBER = "team_member"
    VOLUNTEER = "volunteer"


class Department(Base):
    __tablename__ = "departments"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    code: Mapped[str] = mapped_column(String(10), unique=True, default="")
    description: Mapped[str] = mapped_column(Text, default="")


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(40), default=RoleName.TEAM_MEMBER.value)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    phone: Mapped[str] = mapped_column(String(40), default="")
    status: Mapped[str] = mapped_column(String(30), default="active")
    availability: Mapped[str] = mapped_column(String(30), default="available")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    department: Mapped[Department | None] = relationship()
    # --- volunteer recruitment portal ---
    reference_number: Mapped[str] = mapped_column(String(60), default="", unique=True, index=True)


class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    project: Mapped[str] = mapped_column(String(120), default="")
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(30), default="todo")
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    tags: Mapped[str] = mapped_column(String(300), default="")
    recurrence: Mapped[str] = mapped_column(String(20), default="")  # "" | "weekly" | "monthly"
    depends_on_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class TaskComment(Base):
    __tablename__ = "task_comments"
    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Committee(Base):
    __tablename__ = "committees"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    type: Mapped[str] = mapped_column(String(60), default="General")
    agenda: Mapped[str] = mapped_column(Text, default="")
    chair: Mapped[str] = mapped_column(String(120), default="")
    co_chair: Mapped[str] = mapped_column(String(120), default="")
    director: Mapped[str] = mapped_column(String(120), default="")
    room: Mapped[str] = mapped_column(String(80), default="")
    study_guide_url: Mapped[str] = mapped_column(String(500), default="")
    allocation_done: Mapped[bool] = mapped_column(Boolean, default=False)
    capacity: Mapped[int] = mapped_column(Integer, default=40)
    schedule: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")


class CommitteeCountry(Base):
    """The per-committee country matrix — one country = one delegate per committee.
    A country may appear in many committees, but only once per committee."""
    __tablename__ = "committee_countries"
    __table_args__ = (UniqueConstraint("committee_id", "country", name="uq_committee_country"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    committee_id: Mapped[int] = mapped_column(ForeignKey("committees.id"))
    country: Mapped[str] = mapped_column(String(80))


class CommitteeSession(Base):
    """One committee sitting — schedule + minutes. Minutes are a draft until finalized."""
    __tablename__ = "committee_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    committee_id: Mapped[int] = mapped_column(ForeignKey("committees.id"))
    title: Mapped[str] = mapped_column(String(200), default="Session")
    session_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_time: Mapped[str] = mapped_column(String(10), default="")
    end_time: Mapped[str] = mapped_column(String(10), default="")
    room: Mapped[str] = mapped_column(String(80), default="")
    chair: Mapped[str] = mapped_column(String(120), default="")
    status: Mapped[str] = mapped_column(String(30), default="scheduled")  # scheduled | live | minutes_draft | finalized
    agenda: Mapped[str] = mapped_column(Text, default="")
    minutes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Shift(Base):
    """Volunteer/staff shift in the roster — time-block per person."""
    __tablename__ = "shifts"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    shift_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_time: Mapped[str] = mapped_column(String(10), default="")
    end_time: Mapped[str] = mapped_column(String(10), default="")
    zone: Mapped[str] = mapped_column(String(80), default="")  # e.g. Registration, Security, Crisis, Media
    role: Mapped[str] = mapped_column(String(80), default="")
    status: Mapped[str] = mapped_column(String(30), default="assigned")  # assigned | confirmed | swapped | cancelled
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Group(Base):
    """A school/delegation. Walk-in delegates simply have group_id = None."""
    __tablename__ = "groups"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    contact_name: Mapped[str] = mapped_column(String(120), default="")
    contact_email: Mapped[str] = mapped_column(String(200), default="")
    contact_phone: Mapped[str] = mapped_column(String(40), default="")
    head_delegate_id: Mapped[int | None] = mapped_column(ForeignKey("delegates.id"), nullable=True)
    fee_agreed: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(30), default="registered")  # prospect | registered | confirmed | cancelled
    ambassador_code: Mapped[str] = mapped_column(String(60), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Delegate(Base):
    __tablename__ = "delegates"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    institution: Mapped[str] = mapped_column(String(160), default="")
    email: Mapped[str] = mapped_column(String(200), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
    committee_id: Mapped[int | None] = mapped_column(ForeignKey("committees.id"), nullable=True)
    country: Mapped[str] = mapped_column(String(80), default="")
    group_id: Mapped[int | None] = mapped_column(ForeignKey("groups.id"), nullable=True)
    reg_status: Mapped[str] = mapped_column(String(30), default="started")
    pay_status: Mapped[str] = mapped_column(String(30), default="unpaid")
    amount_paid: Mapped[float] = mapped_column(Float, default=0)
    attendance: Mapped[bool] = mapped_column(Boolean, default=False)
    accommodation: Mapped[bool] = mapped_column(Boolean, default=False)
    transport: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(Text, default="")
    ambassador_code: Mapped[str] = mapped_column(String(60), default="")
    checkin_code: Mapped[str] = mapped_column(String(40), default="")
    badge_url: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    # --- public registration portal fields ---
    registration_token: Mapped[str] = mapped_column(String(100), default="", unique=True, index=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    registration_completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fee_amount: Mapped[float] = mapped_column(Float, default=0)
    payment_reference: Mapped[str] = mapped_column(String(200), default="")
    payment_screenshot_url: Mapped[str] = mapped_column(String(500), default="")
    photo_url: Mapped[str] = mapped_column(String(500), default="")
    experience_level: Mapped[str] = mapped_column(String(30), default="first_timer")
    emergency_contact_name: Mapped[str] = mapped_column(String(120), default="")
    emergency_contact_phone: Mapped[str] = mapped_column(String(40), default="")
    dietary_restrictions: Mapped[str] = mapped_column(String(200), default="")
    tshirt_size: Mapped[str] = mapped_column(String(10), default="")
    registration_type: Mapped[str] = mapped_column(String(20), default="individual")
    committee_preferences: Mapped[str] = mapped_column(String(500), default="")


class Sponsor(Base):
    __tablename__ = "sponsors"
    id: Mapped[int] = mapped_column(primary_key=True)
    organization: Mapped[str] = mapped_column(String(160))
    contact_name: Mapped[str] = mapped_column(String(120), default="")
    contact_email: Mapped[str] = mapped_column(String(200), default="")
    contact_phone: Mapped[str] = mapped_column(String(40), default="")
    package: Mapped[str] = mapped_column(String(80), default="Bronze")
    value: Mapped[float] = mapped_column(Float, default=0)
    amount_received: Mapped[float] = mapped_column(Float, default=0)
    pipeline_status: Mapped[str] = mapped_column(String(40), default="lead")
    payment_status: Mapped[str] = mapped_column(String(30), default="unpaid")
    next_followup: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_contact: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")


class SponsorDeliverable(Base):
    __tablename__ = "sponsor_deliverables"
    id: Mapped[int] = mapped_column(primary_key=True)
    sponsor_id: Mapped[int] = mapped_column(ForeignKey("sponsors.id"))
    description: Mapped[str] = mapped_column(String(300))
    category: Mapped[str] = mapped_column(String(80), default="Media")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    owner: Mapped[str] = mapped_column(String(120), default="")
    status: Mapped[str] = mapped_column(String(30), default="pending")
    proof_url: Mapped[str] = mapped_column(String(500), default="")


class Vendor(Base):
    __tablename__ = "vendors"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    contact: Mapped[str] = mapped_column(String(200), default="")
    notes: Mapped[str] = mapped_column(Text, default="")


class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(20))  # revenue | expense
    category: Mapped[str] = mapped_column(String(80), default="General")
    description: Mapped[str] = mapped_column(String(300), default="")
    amount: Mapped[float] = mapped_column(Float, default=0)
    projected: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(20), default="unpaid")
    vendor_id: Mapped[int | None] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    sponsor_id: Mapped[int | None] = mapped_column(ForeignKey("sponsors.id"), nullable=True)
    approved_by: Mapped[str] = mapped_column(String(120), default="")
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    receipt_url: Mapped[str] = mapped_column(String(500), default="")
    notes: Mapped[str] = mapped_column(Text, default="")


class ProcurementItem(Base):
    __tablename__ = "procurement"
    id: Mapped[int] = mapped_column(primary_key=True)
    item: Mapped[str] = mapped_column(String(200))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    vendor_id: Mapped[int | None] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    quote: Mapped[float] = mapped_column(Float, default=0)
    final_cost: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(30), default="requested")
    delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")


class VenueCheck(Base):
    __tablename__ = "venue_checks"
    id: Mapped[int] = mapped_column(primary_key=True)
    area: Mapped[str] = mapped_column(String(120))
    item: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    owner: Mapped[str] = mapped_column(String(120), default="")
    notes: Mapped[str] = mapped_column(Text, default="")


class Room(Base):
    __tablename__ = "rooms"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    capacity: Mapped[int] = mapped_column(Integer, default=0)
    assignment: Mapped[str] = mapped_column(String(160), default="")


class Milestone(Base):
    __tablename__ = "milestones"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    owner: Mapped[str] = mapped_column(String(120), default="")
    status: Mapped[str] = mapped_column(String(30), default="planned")
    phase: Mapped[str] = mapped_column(String(40), default="pre-event")


class Campaign(Base):
    __tablename__ = "campaigns"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    objective: Mapped[str] = mapped_column(Text, default="")
    audience: Mapped[str] = mapped_column(String(200), default="")
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    budget: Mapped[float] = mapped_column(Float, default=0)
    platforms: Mapped[str] = mapped_column(String(300), default="Instagram")
    owner: Mapped[str] = mapped_column(String(120), default="")
    status: Mapped[str] = mapped_column(String(30), default="draft")


class ContentItem(Base):
    __tablename__ = "content_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content_type: Mapped[str] = mapped_column(String(60), default="Post")
    platform: Mapped[str] = mapped_column(String(60), default="Instagram")
    campaign_id: Mapped[int | None] = mapped_column(ForeignKey("campaigns.id"), nullable=True)
    goal: Mapped[str] = mapped_column(String(200), default="")
    owner: Mapped[str] = mapped_column(String(120), default="")
    copywriter: Mapped[str] = mapped_column(String(120), default="")
    designer: Mapped[str] = mapped_column(String(120), default="")
    editor: Mapped[str] = mapped_column(String(120), default="")
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    publish_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="idea")
    caption: Mapped[str] = mapped_column(Text, default="")
    hashtags: Mapped[str] = mapped_column(String(500), default="")
    approval: Mapped[str] = mapped_column(String(30), default="awaiting_review")
    version: Mapped[int] = mapped_column(Integer, default=1)
    metrics_reach: Mapped[int] = mapped_column(Integer, default=0)
    metrics_engagement: Mapped[int] = mapped_column(Integer, default=0)


class ContentIdea(Base):
    __tablename__ = "content_ideas"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    format: Mapped[str] = mapped_column(String(60), default="Post")
    description: Mapped[str] = mapped_column(Text, default="")
    platform: Mapped[str] = mapped_column(String(60), default="Instagram")
    votes: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="submitted")


class Asset(Base):
    __tablename__ = "assets"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(40), default="graphic")
    tags: Mapped[str] = mapped_column(String(300), default="")
    campaign: Mapped[str] = mapped_column(String(160), default="")
    sponsor: Mapped[str] = mapped_column(String(160), default="")
    url: Mapped[str] = mapped_column(String(500), default="")
    version: Mapped[int] = mapped_column(Integer, default=1)
    approval: Mapped[str] = mapped_column(String(30), default="awaiting_review")


class AssetVersion(Base):
    """Immutable per-version record — old versions are never destroyed."""
    __tablename__ = "asset_versions"
    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"))
    version: Mapped[int] = mapped_column(Integer)
    url: Mapped[str] = mapped_column(String(500), default="")
    note: Mapped[str] = mapped_column(String(300), default="")
    created_by: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Video(Base):
    __tablename__ = "videos"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(40), default="Reel")
    editor: Mapped[str] = mapped_column(String(120), default="")
    status: Mapped[str] = mapped_column(String(30), default="filming")
    script: Mapped[str] = mapped_column(Text, default="")
    footage: Mapped[str] = mapped_column(Text, default="")
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)


class SocialAccount(Base):
    __tablename__ = "social_accounts"
    id: Mapped[int] = mapped_column(primary_key=True)
    platform: Mapped[str] = mapped_column(String(60))
    handle: Mapped[str] = mapped_column(String(120), default="")
    connection: Mapped[str] = mapped_column(String(30), default="not_connected")
    followers: Mapped[int] = mapped_column(Integer, default=0)
    reach: Mapped[int] = mapped_column(Integer, default=0)
    engagement: Mapped[int] = mapped_column(Integer, default=0)


class Ambassador(Base):
    __tablename__ = "ambassadors"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    institution: Mapped[str] = mapped_column(String(160), default="")
    platform: Mapped[str] = mapped_column(String(60), default="Instagram")
    handle: Mapped[str] = mapped_column(String(120), default="")
    code: Mapped[str] = mapped_column(String(60), default="")
    registrations: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="active")


class PressContact(Base):
    __tablename__ = "press_contacts"
    id: Mapped[int] = mapped_column(primary_key=True)
    outlet: Mapped[str] = mapped_column(String(160), default="")
    name: Mapped[str] = mapped_column(String(120), default="")
    email: Mapped[str] = mapped_column(String(200), default="")
    status: Mapped[str] = mapped_column(String(40), default="not_contacted")
    notes: Mapped[str] = mapped_column(Text, default="")


class Approval(Base):
    __tablename__ = "approvals"
    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(60))
    title: Mapped[str] = mapped_column(String(200))
    requested_by: Mapped[str] = mapped_column(String(120), default="")
    reviewer: Mapped[str] = mapped_column(String(120), default="")
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending")
    decision: Mapped[str] = mapped_column(String(30), default="")
    comments: Mapped[str] = mapped_column(Text, default="")


class Risk(Base):
    __tablename__ = "risks"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    probability: Mapped[str] = mapped_column(String(10), default="med")
    impact: Mapped[str] = mapped_column(String(10), default="med")
    severity: Mapped[str] = mapped_column(String(10), default="med")
    owner: Mapped[str] = mapped_column(String(120), default="")
    mitigation: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), default="open")


class Incident(Base):
    __tablename__ = "incidents"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(10), default="low")
    location: Mapped[str] = mapped_column(String(120), default="")
    reported_by: Mapped[str] = mapped_column(String(120), default="")
    assigned_to: Mapped[str] = mapped_column(String(120), default="")
    status: Mapped[str] = mapped_column(String(30), default="open")
    resolution: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(80), default="General")
    path: Mapped[str] = mapped_column(String(500), default="")
    version: Mapped[int] = mapped_column(Integer, default=1)


class ActivityEvent(Base):
    """Central event stream for notifications, audit, feeds, analytics."""
    __tablename__ = "activity_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    actor: Mapped[str] = mapped_column(String(120), default="system")
    action: Mapped[str] = mapped_column(String(80))
    entity_type: Mapped[str] = mapped_column(String(60), default="")
    entity_id: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_email: Mapped[str] = mapped_column(String(200), default="")
    message: Mapped[str] = mapped_column(Text)
    link: Mapped[str] = mapped_column(String(300), default="")
    type: Mapped[str] = mapped_column(String(40), default="info")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class DelegateNote(Base):
    """Delegate portal notes — delegates can save personal notes on their profile."""
    __tablename__ = "delegate_notes"
    id: Mapped[int] = mapped_column(primary_key=True)
    delegate_id: Mapped[int] = mapped_column(ForeignKey("delegates.id"))
    body: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class StudyGuide(Base):
    """Downloadable study guides / background guides / agendas for the delegate portal."""
    __tablename__ = "study_guides"
    id: Mapped[int] = mapped_column(primary_key=True)
    committee_id: Mapped[int | None] = mapped_column(ForeignKey("committees.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    file_url: Mapped[str] = mapped_column(String(500), default="")
    kind: Mapped[str] = mapped_column(String(30), default="study_guide")  # study_guide | background_guide | agenda
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Application(Base):
    """Volunteer/team member applications — public form → admin review → interview → approve/reject."""
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(40), default="")
    email: Mapped[str] = mapped_column(String(200), default="", index=True)
    city: Mapped[str] = mapped_column(String(120), default="")
    photo_url: Mapped[str] = mapped_column(String(500), default="")
    experience: Mapped[str] = mapped_column(Text, default="")
    department_preference: Mapped[str] = mapped_column(String(120), default="")
    status: Mapped[str] = mapped_column(String(30), default="applied")  # applied | interview_scheduled | interviewed | approved | rejected
    interview_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    interview_notes: Mapped[str] = mapped_column(Text, default="")
    reference_number: Mapped[str] = mapped_column(String(60), default="")  # filled on approval
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)  # assigned on approval
    admin_notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# ═══════════════════════════════════════════════════════════════════
# NEW MODELS — Department-specific production models
# ═══════════════════════════════════════════════════════════════════

class SecurityZone(Base):
    """Physical security zone — access level, assigned team, status."""
    __tablename__ = "security_zones"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    area: Mapped[str] = mapped_column(String(120), default="")
    access_level: Mapped[str] = mapped_column(String(30), default="general")
    status: Mapped[str] = mapped_column(String(30), default="active")
    assigned_team: Mapped[str] = mapped_column(String(120), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class EmergencyContact(Base):
    """Emergency contacts for security operations."""
    __tablename__ = "emergency_contacts"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(80), default="")
    phone: Mapped[str] = mapped_column(String(40))
    category: Mapped[str] = mapped_column(String(40), default="internal")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Ticket(Base):
    """IT support ticket — category, room, SLA tracking."""
    __tablename__ = "tickets"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(40), default="general")
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(30), default="open")
    room: Mapped[str] = mapped_column(String(80), default="")
    reported_by: Mapped[str] = mapped_column(String(120), default="")
    assigned_to: Mapped[str] = mapped_column(String(120), default="")
    resolution: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class MediaItem(Base):
    """Media asset — photo/video with preview, photographer, event tracking."""
    __tablename__ = "media_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(40), default="photo")
    url: Mapped[str] = mapped_column(String(500), default="")
    thumbnail_url: Mapped[str] = mapped_column(String(500), default="")
    photographer: Mapped[str] = mapped_column(String(120), default="")
    event: Mapped[str] = mapped_column(String(120), default="")
    tags: Mapped[str] = mapped_column(String(300), default="")
    status: Mapped[str] = mapped_column(String(30), default="uploaded")
    approval: Mapped[str] = mapped_column(String(30), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class SchoolContact(Base):
    """School/outreach contact — recruitment pipeline for delegates."""
    __tablename__ = "school_contacts"
    id: Mapped[int] = mapped_column(primary_key=True)
    school_name: Mapped[str] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(100), default="")
    contact_person: Mapped[str] = mapped_column(String(120), default="")
    email: Mapped[str] = mapped_column(String(200), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
    students_estimate: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="prospect")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class PressRelease(Base):
    """PR press release — draft, review, distribution tracking."""
    __tablename__ = "press_releases"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    target_outlets: Mapped[str] = mapped_column(String(500), default="")
    release_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    sent_by: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class SupplyItem(Base):
    """ORG logistics — supply tracking with vendor, quantity, cost."""
    __tablename__ = "supply_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    item: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(60), default="general")
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    vendor: Mapped[str] = mapped_column(String(160), default="")
    cost: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(30), default="requested")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
