"""Fictional demo seed — clearly marked DEMO. Wipe with --wipe."""
import sys
from datetime import date, timedelta
from app.db import SessionLocal, init_db
from app import models
from app.security import hash_password

DEMO_TAG = "[DEMO] "


def recount_ambassadors(db):
    """Mirrors the API rule: one referral unit per Group, one per walk-in delegate;
    grouped delegates inherit their group's code, never their own."""
    from collections import Counter
    codes: Counter = Counter()
    for g in db.query(models.Group).all():
        if g.ambassador_code:
            codes[g.ambassador_code.strip().upper()] += 1
    for d in db.query(models.Delegate).all():
        if d.group_id is not None:
            g = db.get(models.Group, d.group_id)
            if g and g.ambassador_code:
                codes[g.ambassador_code.strip().upper()] += 1
        elif d.ambassador_code:
            codes[d.ambassador_code.strip().upper()] += 1
    for a in db.query(models.Ambassador).all():
        a.registrations = codes[a.code.strip().upper()]
    db.commit()


def wipe(db):
    for m in [models.Shift, models.CommitteeSession, models.AssetVersion, models.Notification, models.ActivityEvent, models.Document, models.Incident, models.Risk,
              models.Approval, models.PressContact, models.Ambassador, models.SocialAccount, models.Video,
              models.Asset, models.ContentIdea, models.ContentItem, models.Campaign, models.Milestone,
              models.Room, models.VenueCheck, models.ProcurementItem, models.Transaction, models.Vendor,
              models.SponsorDeliverable, models.Sponsor, models.DelegateNote, models.StudyGuide,
              models.Application, models.Delegate, models.CommitteeCountry, models.Group,
              models.Committee, models.TaskComment, models.Task, models.User, models.Department,
              models.SecurityZone, models.EmergencyContact, models.Ticket, models.MediaItem,
              models.SchoolContact, models.PressRelease, models.SupplyItem]:
        db.query(m).delete()
    db.commit()


def seed():
    init_db()
    db = SessionLocal()
    if "--wipe" in sys.argv:
        wipe(db)
        print("wiped")
        return
    if db.query(models.User).filter_by(email="sg@kimun.demo").first():
        print("already seeded")
        return
    existing_depts = {d.name for d in db.query(models.Department).all()}
    NEW_DEPTS = [
        ("Security Operations", "SEC", "Venue security, access control, incident response, and safety operations"),
        ("Public Relations", "PR", "Communications, press releases, media relations, and public announcements"),
        ("Media & Documentation", "MED", "Photography, videography, content capture, and media archive"),
        ("Marketing", "MKT", "Campaigns, social media, brand management, and promotional content"),
        ("Organizing Committee", "ORG", "Operations coordination, volunteer management, logistics, and scheduling"),
        ("Academics", "ACA", "Committee oversight, study guides, chair coordination, and academic resources"),
        ("Outreach", "OUT", "School/institution contacts, partnerships, ambassador recruitment, and outreach campaigns"),
        ("Technical Assistance", "TECH", "IT support, equipment management, system maintenance, and technical operations"),
        ("Brand Ambassadors", "BA", "Influencer partnerships, ambassador program, content creation, and social engagement"),
    ]
    depts = [models.Department(name=n, code=c, description=desc)
             for n, c, desc in NEW_DEPTS if n not in existing_depts]
    db.add_all(depts); db.commit()
    d = {x.name: x.id for x in db.query(models.Department).all()}
    users = [
        ("Ayesha Khan (SG)", "sg@kimun.demo", "secretary_general", "Security Operations"),
        ("Bilal Ahmed (Ops)", "ops@kimun.demo", "dept_head", "Organizing Committee"),
        ("Sara Shah (Media)", "media@kimun.demo", "dept_head", "Media & Documentation"),
        ("Ali Raza (Academics)", "acad@kimun.demo", "team_member", "Academics"),
        ("Fatima Noor (Sponsor)", "sponsor@kimun.demo", "team_member", "Brand Ambassadors"),
        ("Volunteer Demo", "vol@kimun.demo", "volunteer", "Organizing Committee"),
    ]
    import secrets as _sec
    for name, email, role, dep in users:
        dept_obj = db.query(models.Department).filter_by(name=dep).first()
        ref = f"KIM-{dept_obj.code}-{_sec.token_hex(2).upper()}" if dept_obj else ""
        u = models.User(name=DEMO_TAG + name, email=email, password_hash=hash_password("kimun123"),
                        role=role, department_id=d[dep], reference_number=ref)
        db.add(u)
    db.commit()
    # --- tier demo members (one per tier) ---
    tier_users = [
        (DEMO_TAG + "Taha Raza (Exec)", "exec@kimun.demo", "deputy_sg", "Security Operations"),
        (DEMO_TAG + "Amina Khalid (General)", "general@kimun.demo", "team_member", "Public Relations"),
        (DEMO_TAG + "Omar Shahzad (Organizing)", "org@kimun.demo", "volunteer", "Organizing Committee"),
    ]
    for name, email, role, dep in tier_users:
        if not db.query(models.User).filter_by(email=email).first():
            dept_obj = db.query(models.Department).filter_by(name=dep).first()
            ref = f"KIM-{dept_obj.code}-{_sec.token_hex(2).upper()}" if dept_obj else ""
            db.add(models.User(name=name, email=email, password_hash=hash_password("kimun123"),
                               role=role, department_id=d[dep], reference_number=ref))
    db.commit()
    coms = [models.Committee(name=n, agenda=DEMO_TAG + "sample agenda", chair="TBD") for n in
            ["UNGA", "UNSC", "WHO", "UNHRC", "ECOFIN", "Crisis"]]
    db.add_all(coms); db.commit()
    POOLS = {
        "UNGA": ["Japan", "Brazil", "Kenya", "France", "USA", "China", "India", "Germany", "Egypt", "Argentina", "Australia", "South Africa"],
        "UNSC": ["USA", "China", "Russia", "France", "UK", "Japan", "Brazil", "Kenya", "Switzerland", "Algeria", "Guyana", "South Korea", "Sierra Leone", "Slovenia", "Mozambique"],
        "WHO": ["Japan", "Brazil", "Kenya", "France", "USA", "India", "Germany", "Egypt", "Mexico", "Thailand", "Canada", "Nigeria"],
        "UNHRC": ["Japan", "Brazil", "Kenya", "France", "USA", "India", "Germany", "Egypt", "Argentina", "Australia", "Mexico", "South Africa"],
        "ECOFIN": ["USA", "China", "Japan", "Germany", "India", "Brazil", "France", "UK", "Egypt", "Argentina", "Kenya", "Australia"],
        "Crisis": ["USA", "China", "Russia", "France", "UK", "Iran", "North Korea", "Israel", "Turkey", "Saudi Arabia"],
    }
    CAPS = {"UNGA": 80, "UNSC": 15, "WHO": 60, "UNHRC": 60, "ECOFIN": 60, "Crisis": 20}
    com_by_name = {}
    for c in db.query(models.Committee).all():
        c.capacity = CAPS.get(c.name, c.capacity or 40)
        com_by_name[c.name] = c.id
        for country in POOLS.get(c.name, []):
            db.add(models.CommitteeCountry(committee_id=c.id, country=country))
    db.commit()
    c1 = db.query(models.Committee).first()
    for i, (nm, inst, pay) in enumerate([("Demo Delegate A", "Demo University Karachi", "paid"),
                                        ("Demo Delegate B", "Demo College Lahore", "unpaid"),
                                        ("Demo Delegate C", "Demo Institute Islamabad", "paid")]):
        db.add(models.Delegate(name=DEMO_TAG + nm, institution=inst, email=f"del{i}@demo.mail",
                               committee_id=c1.id, country=["Japan", "Brazil", "Kenya"][i],
                               reg_status="completed", pay_status=pay, amount_paid=8000 if pay == "paid" else 0))
    db.commit()
    groups = [
        models.Group(name=DEMO_TAG + "Demo University Karachi", contact_name="Demo Contact K",
                     contact_email="karachi@demo.mail", contact_phone="+92 300 0000001",
                     ambassador_code="AMB-KARACHI", status="confirmed"),
        models.Group(name=DEMO_TAG + "Demo College Lahore", contact_name="Demo Contact L",
                     contact_email="lahore@demo.mail", contact_phone="+92 300 0000002",
                     ambassador_code="AMB-LAHORE", status="registered"),
    ]
    db.add_all(groups); db.commit()
    dels = db.query(models.Delegate).order_by(models.Delegate.id).all()
    dels[0].group_id = groups[0].id          # Demo Delegate A → Demo University Karachi
    dels[1].group_id = groups[1].id          # Demo Delegate B → Demo College Lahore
    dels[2].ambassador_code = "AMB-KARACHI"  # walk-in recruited by the Karachi ambassador
    db.commit()
    db.add(models.Ambassador(name=DEMO_TAG + "Aamir Karachi", code="AMB-KARACHI", institution="Demo University Karachi", handle="@aamir.kimun"))
    db.add(models.Ambassador(name=DEMO_TAG + "Zara Lahore", code="AMB-LAHORE", institution="Demo College Lahore", handle="@zara.kimun"))
    s = models.Sponsor(organization=DEMO_TAG + "Demo Foods Co", contact_name="Demo Contact",
                       package="Gold", value=500000, amount_received=150000,
                       pipeline_status="negotiation", payment_status="partial")
    db.add(s); db.commit()
    db.add(models.SponsorDeliverable(sponsor_id=s.id, description="Logo on backdrop", category="Visibility", status="done", proof_url="demo-proof"))
    db.add(models.SponsorDeliverable(sponsor_id=s.id, description="3 Instagram posts", category="Media", status="pending"))
    today = date.today()
    db.add(models.Task(title=DEMO_TAG + "Book venue hall", description="demo", status="in_progress",
                       priority="critical", due_date=today + timedelta(days=7), project="Venue"))
    db.add(models.Task(title=DEMO_TAG + "Design poster", description="demo", status="review",
                       priority="high", due_date=today - timedelta(days=2), project="Media"))
    db.add(models.Campaign(name=DEMO_TAG + "Early Bird", objective="Drive registrations", audience="students",
                           status="active", platforms="Instagram,TikTok", owner="Sara Shah"))
    db.add(models.ContentItem(title=DEMO_TAG + "Committee reveal", content_type="Post", platform="Instagram",
                              status="review", approval="awaiting_review", caption="Draft caption"))
    db.add(models.VenueCheck(area="Main Hall", item="Stage + AV", status="pending", owner="Ops"))
    db.add(models.Risk(title=DEMO_TAG + "Venue delay", probability="med", impact="high", severity="high", owner="Ops"))
    db.add(models.Approval(type="design", title=DEMO_TAG + "Poster approval", requested_by="media@kimun.demo",
                           reviewer="sg@kimun.demo", status="pending"))
    for plat in ["Instagram", "TikTok", "Facebook", "LinkedIn", "YouTube"]:
        db.add(models.SocialAccount(platform=plat, handle="@kimun.demo", connection="not_connected"))
    add = date.fromisoformat("2026-12-18")
    for i, (z, rol) in enumerate([("Registration", "Greeter"), ("Security", "Usher"), ("Crisis", "Runner"), ("Media", "Photographer")], start=1):
        db.add(models.Shift(user_id=i, shift_date=add + timedelta(days=i // 3), start_time="09:00",
                            end_time="13:00", zone=z, role=rol, status="assigned",
                            notes=DEMO_TAG + "sample shift"))
    for cid, (t, room) in enumerate([("Opening Session", "Hall A"), ("Committee Round 1", "Room 12")], start=1):
        db.add(models.CommitteeSession(committee_id=cid, title=DEMO_TAG + t, session_date=add,
                                       start_time="10:00", end_time="13:00", room=room, chair="TBD",
                                       status="scheduled", agenda=DEMO_TAG + "sample agenda — fictional"))
    db.add(models.ActivityEvent(actor="system", action="seed", entity_type="db", message="DEMO seed loaded"))
    db.add(models.Notification(message=DEMO_TAG + "Welcome! This is fictional demo data.", type="info"))
    # --- demo study guides (one per committee) ---
    for cname in ["UNGA", "UNSC", "WHO", "UNHRC", "ECOFIN", "Crisis"]:
        cid = com_by_name.get(cname)
        if cid:
            db.add(models.StudyGuide(committee_id=cid, title=DEMO_TAG + f"{cname} Study Guide",
                                     description=DEMO_TAG + f"Background guide for {cname} committee sessions",
                                     kind="study_guide"))
            db.add(models.StudyGuide(committee_id=cid, title=DEMO_TAG + f"{cname} Background Guide",
                                     description=DEMO_TAG + f"Country-specific background for {cname}",
                                     kind="background_guide"))
    # ── SEC — Security Zones ────────────────────────────────────────────
    db.add(models.SecurityZone(name=DEMO_TAG + "Main Hall North", area="Main Hall", access_level="general",
                               status="active", assigned_team="Alpha Team", notes="Covered by cam 1-3"))
    db.add(models.SecurityZone(name=DEMO_TAG + "VIP Lounge", area="Building B", access_level="vip",
                               status="active", assigned_team="VIP Detail", notes="Restricted access"))
    db.add(models.SecurityZone(name=DEMO_TAG + "Press Room", area="Building A", access_level="restricted",
                               status="active", assigned_team="Charlie Team", notes="Media access only"))
    # ── SEC — Emergency Contacts ────────────────────────────────────────
    db.add(models.EmergencyContact(name=DEMO_TAG + "Dr. Rajesh Shrestha", role="Venue Medical Officer",
                                   phone="+977-9841-000001", category="internal", notes="On-site during event"))
    db.add(models.EmergencyContact(name=DEMO_TAG + "Birendra Hospital", role="Nearest Hospital",
                                   phone="+977-1-424-4121", category="emergency", notes="5 min from venue"))
    db.add(models.EmergencyContact(name=DEMO_TAG + "Kathmandu Metro Police", role="Local Police",
                                   phone="100", category="emergency", notes="Station 2km away"))
    # ── TECH — Tickets ──────────────────────────────────────────────────
    db.add(models.Ticket(title=DEMO_TAG + "Projector not displaying", description="Hall A projector shows blue screen",
                         category="projector", priority="high", status="open", room="Hall A",
                         reported_by="Sara Shah"))
    db.add(models.Ticket(title=DEMO_TAG + "WiFi slow in Room 12", description="Delegates reporting poor connectivity",
                         category="wifi", priority="medium", status="in_progress", room="Room 12",
                         reported_by="Ali Raza", assigned_to="Tech Team"))
    db.add(models.Ticket(title=DEMO_TAG + "Mic feedback in UNSC", description="Loud feedback during opening speech",
                         category="audio", priority="critical", status="resolved", room="UNSC Room",
                         reported_by="Ayesha Khan", resolution="Replaced batteries, adjusted gain"))
    # ── MED — Media Items ───────────────────────────────────────────────
    db.add(models.MediaItem(name=DEMO_TAG + "Opening Ceremony Group Photo", kind="photo",
                            event="Opening Ceremony", photographer="Sara Shah", status="uploaded",
                            approval="approved", tags="ceremony,formal,group"))
    db.add(models.MediaItem(name=DEMO_TAG + "UNSC Debate Clip", kind="video",
                            event="UNSC Day 1", photographer="Ali Raza", status="uploaded",
                            approval="pending", tags="debate,unsc,formal"))
    db.add(models.MediaItem(name=DEMO_TAG + "Delegate Registration", kind="photo",
                            event="Registration", photographer="Volunteer Demo", status="uploaded",
                            approval="pending", tags="registration,candid"))
    # ── MED — Videos ────────────────────────────────────────────────────
    db.add(models.Video(title=DEMO_TAG + "KIMUN 2026 Highlight Reel", kind="Highlight",
                        editor="Sara Shah", status="filming",
                        script=DEMO_TAG + "Capture key moments: opening, debates, closing"))
    db.add(models.Video(title=DEMO_TAG + "Delegate Interview Series", kind="Interview",
                        editor="Ali Raza", status="editing",
                        script=DEMO_TAG + "5-minute interviews with delegates from each committee"))
    # ── ORG — Supply Items ──────────────────────────────────────────────
    db.add(models.SupplyItem(item=DEMO_TAG + "Water Bottles (500 pcs)", category="beverage",
                             quantity=500, vendor="Himalayan Springs", cost=12500, status="delivered",
                             notes="Store room B"))
    db.add(models.SupplyItem(item=DEMO_TAG + "Name Badges (200 pcs)", category="printing",
                             quantity=200, vendor="PrintFast Kathmandu", cost=8000, status="ordered",
                             notes="Arriving Dec 15"))
    db.add(models.SupplyItem(item=DEMO_TAG + "Decoration Flags", category="decor",
                             quantity=50, vendor="Party Supplies NP", cost=3500, status="requested",
                             notes="UN-style blue flags"))
    # ── OUT — School Contacts ───────────────────────────────────────────
    db.add(models.SchoolContact(school_name=DEMO_TAG + "Kathmandu International School", city="Kathmandu",
                                contact_person="Mr. Sharma", email="sharma@kis.edu.np",
                                phone="+977-9841-100001", students_estimate=80, status="confirmed"))
    db.add(models.SchoolContact(school_name=DEMO_TAG + "Litchi School", city="Kathmandu",
                                contact_person="Ms. Gurung", email="info@litchischool.edu.np",
                                phone="+977-9841-100002", students_estimate=45, status="contacted"))
    db.add(models.SchoolContact(school_name=DEMO_TAG + "Sunrise Academy", city="Pokhara",
                                contact_person="Mr. Thapa", email="thapa@sunrise.edu.np",
                                phone="+977-9841-100003", students_estimate=30, status="prospect"))
    # ── PR — Press Releases ─────────────────────────────────────────────
    db.add(models.PressRelease(title=DEMO_TAG + "KIMUN 2026 Announces Theme",
                               body=DEMO_TAG + "Kathmandu International Model United Nations 2026 announces this year's theme: 'Diplomacy in the Digital Age'. The conference will be held December 18-20, 2026.",
                               target_outlets="Kathmandu Post, The Himalayan Times, Republica",
                               status="draft", sent_by="Ayesha Khan"))
    db.add(models.PressRelease(title=DEMO_TAG + "Registration Opens",
                               body=DEMO_TAG + "Registration for KIMUN 2026 is now open. Students from across Nepal and South Asia are invited to apply.",
                               target_outlets="All major outlets",
                               status="published", sent_by="Ayesha Khan"))
    recount_ambassadors(db)
    db.commit()
    print("seeded (DEMO). login sg@kimun.demo / kimun123")


if __name__ == "__main__":
    seed()
