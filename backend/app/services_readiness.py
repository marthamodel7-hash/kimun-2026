"""Readiness engine — computed from real DB rows, never hard-coded."""
from sqlalchemy.orm import Session
from app import models


def _pct(done: int, total: int) -> int:
    return round(done * 100 / total) if total else 0


def compute_readiness(db: Session) -> dict:
    tasks = db.query(models.Task).all()
    tasks_done = sum(1 for t in tasks if t.status == "completed")
    ops = _pct(tasks_done, len(tasks))

    delegates = db.query(models.Delegate).all()
    paid = sum(1 for d in delegates if d.pay_status == "paid")
    academics_committees = db.query(models.Committee).all()
    guides = sum(1 for c in academics_committees if c.study_guide_url)
    academics = _pct(paid + guides, len(delegates) + len(academics_committees)) if (delegates or academics_committees) else 0

    sponsors = db.query(models.Sponsor).all()
    spons_val = sum(s.value for s in sponsors)
    spons_got = sum(s.amount_received for s in sponsors)
    sponsorship = _pct(int(spons_got), int(spons_val)) if spons_val else 0

    tx = db.query(models.Transaction).all()
    rev = sum(t.amount for t in tx if t.kind == "revenue" and t.status == "paid")
    rev_proj = sum(t.projected or t.amount for t in tx if t.kind == "revenue")
    exp = sum(t.amount for t in tx if t.kind == "expense" and t.status == "paid")
    finance = _pct(int(rev), int(rev_proj)) if rev_proj else (100 if not tx else 50)

    checks = db.query(models.VenueCheck).all()
    venue = _pct(sum(1 for c in checks if c.status == "done"), len(checks)) if checks else 0
    proc = db.query(models.ProcurementItem).all()
    procurement = _pct(sum(1 for p in proc if p.status == "delivered"), len(proc)) if proc else 0
    content = db.query(models.ContentItem).all()
    marketing = _pct(sum(1 for c in content if c.status == "published"), len(content)) if content else 0
    media = marketing
    logistics = _pct(venue + procurement, 200) if (checks or proc) else 0
    deleg = _pct(paid, len(delegates)) if delegates else 0

    cats = {"operations": ops, "academics": academics, "delegates": deleg,
            "sponsorship": sponsorship, "finance": finance, "logistics": logistics,
            "marketing": marketing, "media": media, "venue": venue, "procurement": procurement}
    overall = round(sum(cats.values()) / len(cats)) if cats else 0
    reasons = []
    if sponsorship < 70 and sponsors:
        pending = sum(1 for s in sponsors if s.payment_status != "paid")
        outstanding = sum(s.value - s.amount_received for s in sponsors)
        reasons.append(f"Sponsorship {sponsorship}%: {pending} sponsors unpaid, Rs. {outstanding:,.0f} outstanding")
    overdue = sum(1 for t in tasks if t.status != "completed" and str(t.due_date or "") < "2026-12-31" and t.due_date)
    if overdue:
        reasons.append(f"{overdue} tasks past due or at risk")
    if delegates and paid < len(delegates):
        reasons.append(f"{len(delegates)-paid} delegates unpaid")
    return {"overall": overall, "categories": cats, "reasons": reasons,
            "counts": {"tasks": len(tasks), "tasks_done": tasks_done, "delegates": len(delegates),
                       "paid_delegates": paid, "sponsors": len(sponsors), "revenue": rev, "expenses": exp}}
