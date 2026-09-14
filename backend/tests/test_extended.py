from fastapi.testclient import TestClient
from app.main import app
from app.seed import seed
from app.db import SessionLocal
from app import models


def get_client():
    seed()
    # Wipe test-created application + volunteer user records to avoid conflicts between runs
    db = SessionLocal()
    db.query(models.Application).delete()
    # Only delete volunteer users created by test approvals (they have a KIMV- prefix)
    db.query(models.User).filter(
        models.User.role == "volunteer",
        models.User.reference_number.like("KIMV-%"),
    ).delete(synchronize_session=False)
    db.commit()
    db.close()
    c = TestClient(app)
    r = c.post("/api/auth/login", json={"email": "sg@kimun.demo", "password": "kimun123"})
    assert r.status_code == 200, r.text
    c.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return c


def test_delegate_csv_roundtrip():
    c = get_client()
    r = c.get("/api/delegates/export")
    assert r.status_code == 200
    assert "name,institution" in r.text
    csv_data = "name,institution,email,country,pay_status\nCSV Import Test,CSV University,csv@test.mail,Japan,unpaid\n"
    r = c.post("/api/delegates/import", files={"f": ("delegates.csv", csv_data, "text/csv")})
    assert r.status_code == 200
    assert r.json()["imported"] == 1


def test_delegate_csv_rejects_bad_rows():
    c = get_client()
    r = c.post("/api/delegates/import", files={"f": ("x.csv", "name,institution\n,MissingName\n", "text/csv")})
    assert r.json() == {"imported": 0, "failed": 1}


def test_upload_accepts_image_rejects_exe():
    c = get_client()
    r = c.post("/api/uploads", files={"f": ("proof.png", b"\x89PNG fake", "image/png")})
    assert r.status_code == 200
    assert r.json()["url"].startswith("/uploads/")
    r = c.post("/api/uploads", files={"f": ("evil.exe", b"MZ", "application/octet-stream")})
    assert r.status_code == 400


def test_finance_still_rbac_guarded():
    from app.security import create_token
    c = TestClient(app)
    c.headers.update({"Authorization": f"Bearer {create_token('vol@kimun.demo')}"})
    assert c.get("/api/delegates/export").status_code == 403


def test_global_search_groups():
    c = get_client()
    r = c.get("/api/search", params={"q": "DEMO"})
    assert r.status_code == 200
    assert "delegates" in r.json() or "tasks" in r.json()
    assert c.get("/api/search").json() == {}


def test_search_respects_rbac():
    from app.security import create_token
    c = TestClient(app)
    c.headers.update({"Authorization": f"Bearer {create_token('vol@kimun.demo')}"})
    r = c.get("/api/search", params={"q": "DEMO"}).json()
    assert "sponsors" not in r and "documents" not in r


def test_pagination_limit():
    c = get_client()
    assert len(c.get("/api/tasks", params={"limit": 1}).json()) <= 1


def test_task_comments_roundtrip():
    c = get_client()
    tid = c.post("/api/tasks", json={"title": "Comment test"}).json()["id"]
    assert c.post(f"/api/tasks/{tid}/comments", json={"body": "hello"}).status_code == 200
    assert any(x["body"] == "hello" for x in c.get(f"/api/tasks/{tid}/comments").json())
    c.delete(f"/api/tasks/{tid}")


def test_recurring_task_spawns_next():
    c = get_client()
    tid = c.post("/api/tasks", json={"title": "Weekly sync", "status": "in_progress",
                                     "recurrence": "weekly", "due_date": "2026-10-01"}).json()["id"]
    r = c.put(f"/api/tasks/{tid}", json={"status": "completed"}).json()
    assert "spawned_id" in r
    spawned = [t for t in c.get("/api/tasks").json() if t["id"] == r["spawned_id"]][0]
    assert spawned["status"] == "todo" and spawned["due_date"] == "2026-10-08"
    # re-saving without a status transition must not spawn again
    r2 = c.put(f"/api/tasks/{tid}", json={"priority": "low"}).json()
    assert "spawned_id" not in r2
    c.delete(f"/api/tasks/{tid}")
    c.delete(f"/api/tasks/{spawned['id']}")


def test_non_recurring_complete_spawns_nothing():
    c = get_client()
    tid = c.post("/api/tasks", json={"title": "One-off"}).json()["id"]
    assert "spawned_id" not in c.put(f"/api/tasks/{tid}", json={"status": "completed"}).json()
    c.delete(f"/api/tasks/{tid}")


def test_recurring_task_spawns_next():
    c = get_client()
    tid = c.post("/api/tasks", json={"title": "Weekly sync", "status": "in_progress",
                                     "recurrence": "weekly", "due_date": "2026-10-01"}).json()["id"]
    r = c.put(f"/api/tasks/{tid}", json={"status": "completed"}).json()
    assert "spawned_id" in r
    spawned = [t for t in c.get("/api/tasks").json() if t["id"] == r["spawned_id"]][0]
    assert spawned["status"] == "todo" and spawned["due_date"] == "2026-10-08"
    # completing again without transition must not spawn
    r2 = c.put(f"/api/tasks/{tid}", json={"priority": "low"}).json()
    assert "spawned_id" not in r2
    c.delete(f"/api/tasks/{tid}")
    c.delete(f"/api/tasks/{spawned['id']}")


def test_event_report_consistent():
    c = get_client()
    r = c.get("/api/reports/event-summary").json()
    for section in ["delegates", "sponsors", "finance", "tasks", "media", "logistics", "team", "readiness"]:
        assert section in r
    assert r["delegates"]["total"] == len(c.get("/api/delegates").json())
    assert r["sponsors"]["count"] == len(c.get("/api/sponsors").json())
    assert r["finance"]["profit_actual"] == r["finance"]["revenue_actual"] - r["finance"]["expenses_actual"]


def test_badge_checkin_flow():
    c = get_client()
    did = c.post("/api/delegates", json={"name": "Badge Test"}).json()["id"]
    b = c.post(f"/api/delegates/{did}/badge").json()
    assert b["code"].startswith("K26-") and b["badge_url"].startswith("/uploads/")
    r = c.post("/api/checkin", json={"code": b["code"].lower()}).json()
    assert r["name"] == "Badge Test" and r["already"] is False
    r2 = c.post("/api/checkin", json={"code": b["code"]}).json()
    assert r2["already"] is True
    assert c.post("/api/checkin", json={"code": "K26-0000-NOPE"}).status_code == 404
    stats = c.get("/api/checkin/today").json()
    assert stats["inside"] >= 1
    c.delete(f"/api/delegates/{did}")


def test_rate_limit_trips_on_abuse():
    c = get_client()
    codes = [c.get("/api/ai/status").status_code for _ in range(30)]
    assert 429 in codes
    assert c.get("/api/ai/status").status_code == 429


def test_shift_planner_crud():
    c = get_client()
    uid = c.get("/api/users").json()[0]["id"]
    r = c.post("/api/shifts", json={"user_id": uid, "shift_date": "2026-12-18", "start_time": "09:00",
                                    "end_time": "13:00", "zone": "Registration", "role": "Greeter"})
    assert r.status_code == 200
    sid = r.json()["id"]
    rows = c.get("/api/shifts").json()
    assert any(s["id"] == sid and s["zone"] == "Registration" for s in rows)
    assert c.put(f"/api/shifts/{sid}", json={"status": "confirmed"}).status_code == 200
    assert [s for s in c.get("/api/shifts").json() if s["id"] == sid][0]["status"] == "confirmed"
    assert c.delete(f"/api/shifts/{sid}").status_code == 200


def test_committee_session_crud_with_minutes():
    c = get_client()
    cid = c.get("/api/committees").json()[0]["id"]
    r = c.post("/api/committee_sessions", json={"committee_id": cid, "title": "Round 1", "session_date": "2026-12-18",
                                               "start_time": "10:00", "end_time": "13:00", "status": "scheduled"})
    assert r.status_code == 200
    sid = r.json()["id"]
    assert c.put(f"/api/committee_sessions/{sid}", json={"status": "minutes_draft",
                                                         "minutes": "Resolutions drafted — fictional."}).status_code == 200
    sess = [s for s in c.get("/api/committee_sessions").json() if s["id"] == sid][0]
    assert sess["status"] == "minutes_draft" and "Resolutions" in sess["minutes"]
    assert c.delete(f"/api/committee_sessions/{sid}").status_code == 200


def test_excel_export_kinds():
    c = get_client()
    for kind in ["sponsors", "finance", "delegates"]:
        r = c.get(f"/api/exports/{kind}.xlsx")
        assert r.status_code == 200, (kind, r.text[:200])
        assert r.headers["content-type"].startswith("application/vnd.openxmlformats")
        assert r.content[:2] == b"PK"  # ZIP magic — valid xlsx
    assert c.get("/api/exports/nope.xlsx").status_code == 404


def test_asset_version_history():
    c = get_client()
    aid = c.post("/api/assets", json={"name": "Versioned Graphic", "url": "/uploads/v1.png"}).json()["id"]
    assert c.get(f"/api/assets/{aid}/versions").json() == []
    v = c.post(f"/api/assets/{aid}/versions", json={"url": "/uploads/v2.png", "note": "new headline"}).json()
    assert v["version"] == 2
    hist = c.get(f"/api/assets/{aid}/versions").json()
    assert [h["version"] for h in hist] == [1, 2]  # v1 snapshotted, nothing destroyed
    assert hist[1]["note"] == "new headline"
    cur = [a for a in c.get("/api/assets").json() if a["id"] == aid][0]
    assert cur["url"] == "/uploads/v2.png" and cur["approval"] == "awaiting_review"
    assert c.post(f"/api/assets/{aid}/versions", json={"url": ""}).status_code == 400
    c.delete(f"/api/assets/{aid}")


# ---------- delegation module (groups + allocator + ambassador accounting) ----------
def _amb(cc, code):
    for a in cc.get("/api/ambassadors").json():
        if a["code"].upper() == code.upper():
            return a["registrations"]
    return None


def test_ambassador_auto_accounting():
    """Referral units follow live rows: +1 per group, +1 per walk-in delegate;
    grouped delegates count under their group's code, never their own."""
    c = get_client()
    k0, l0 = _amb(c, "AMB-KARACHI"), _amb(c, "AMB-LAHORE")
    assert k0 >= 2 and l0 >= 1  # seeded: group + walk-in / group + grouped delegate

    r = c.post("/api/groups", json={"name": "Test School X", "ambassador_code": "amb-lahore"})
    assert r.status_code == 200, r.text
    gid = r.json()["id"]
    assert _amb(c, "AMB-LAHORE") == l0 + 1

    assert c.put(f"/api/groups/{gid}", json={"ambassador_code": "AMB-KARACHI"}).status_code == 200
    assert _amb(c, "AMB-LAHORE") == l0
    assert _amb(c, "AMB-KARACHI") == k0 + 1

    assert c.delete(f"/api/groups/{gid}").status_code == 200
    assert _amb(c, "AMB-KARACHI") == k0

    r = c.post("/api/delegates", json={"name": "Walk-in Referred", "ambassador_code": "amb-karachi"})
    assert r.status_code == 200, r.text
    did = r.json()["id"]
    assert _amb(c, "AMB-KARACHI") == k0 + 1

    g2 = c.post("/api/groups", json={"name": "Test School Y", "ambassador_code": "AMB-LAHORE"}).json()["id"]
    assert c.put(f"/api/delegates/{did}", json={"group_id": g2}).status_code == 200
    assert _amb(c, "AMB-KARACHI") == k0          # own code revoked on grouping
    assert _amb(c, "AMB-LAHORE") == l0 + 2       # group's own unit + attributed delegate

    assert c.delete(f"/api/delegates/{did}").status_code == 200
    assert _amb(c, "AMB-LAHORE") == l0 + 1
    assert c.delete(f"/api/groups/{g2}").status_code == 200
    assert _amb(c, "AMB-LAHORE") == l0


def test_committee_pool_and_allocator():
    import time as _t
    c = get_client()
    unga = next(x for x in c.get("/api/committees").json() if x["name"] == "UNGA")
    cid = unga["id"]

    # matrix management: add → duplicate block → remove
    assert any(x["country"] == "Japan" for x in c.get(f"/api/committees/{cid}/countries").json())
    r = c.post(f"/api/committees/{cid}/countries", json={"country": "Qatar"})
    assert r.status_code == 200, r.text
    ccid = r.json()["id"]
    assert c.post(f"/api/committees/{cid}/countries", json={"country": "Qatar"}).status_code == 409
    assert c.delete(f"/api/committees/{cid}/countries/{ccid}").status_code == 200

    # one country = one delegate per committee (seed owns Japan + Brazil + Kenya in UNGA)
    r = c.post("/api/delegates", json={"name": "Dup Tester", "committee_id": cid, "country": "Japan"})
    assert r.status_code == 409
    r = c.post("/api/delegates", json={"name": "Out of Matrix", "committee_id": cid, "country": "Atlantis"})
    assert r.status_code == 400

    # valid allocation, then allocator endpoints
    name = f"In Pool {_t.time()}"
    r = c.post("/api/delegates", json={"name": name, "committee_id": cid, "country": "France"})
    assert r.status_code == 200, r.text
    fid = r.json()["id"]
    assert c.put(f"/api/delegates/{fid}/allocate", json={"committee_id": cid, "country": "Brazil"}).status_code == 409
    assert c.put(f"/api/delegates/{fid}/allocate", json={"committee_id": None, "country": ""}).status_code == 200

    r = c.get("/api/allocation")
    assert r.status_code == 200
    body = r.json()
    unalloc = [u for u in body["unallocated"] if u["id"] == fid]
    assert unalloc and unalloc[0]["country"] == ""
    ch = next(x for x in body["committees"] if x["id"] == cid)
    assert "pool" in ch and "delegates" in ch and ch["capacity"] > 0
    assert all(d["id"] != fid for d in ch["delegates"])  # cleared no longer in committee

    assert c.delete(f"/api/delegates/{fid}").status_code == 200


def test_search_index_includes_groups_and_export_has_group_column():
    c = get_client()
    r = c.get("/api/search", params={"q": "Demo University"})
    assert "groups" in r.json()
    x = c.get("/api/delegates/export")
    assert x.status_code == 200 and ",group," in x.text


# ---------- team hierarchy: tiers + assignment gate + volunteer scoping ----------
def test_user_payload_includes_tier():
    c = get_client()
    r = c.get("/api/auth/me")
    assert r.json()["tier"] == "executive"
    users = c.get("/api/users").json()
    roles_seen = {u["role"] for u in users}
    assert "deputy_sg" in roles_seen or "team_member" in roles_seen
    # every user has tier + tier_label
    assert all("tier" in u and "tier_label" in u for u in users)


def test_assignment_gate():
    """Only Executive + Dept Head can (re)assign tasks."""
    from app.security import create_token
    c_vol = TestClient(app)
    c_vol.headers.update({"Authorization": f"Bearer {create_token('vol@kimun.demo')}"})
    c_gen = TestClient(app)
    c_gen.headers.update({"Authorization": f"Bearer {create_token('general@kimun.demo')}"})
    c_exec = TestClient(app)
    c_exec.headers.update({"Authorization": f"Bearer {create_token('exec@kimun.demo')}"})
    # SG can create + assign
    r = c_exec.post("/api/tasks", json={"title": "Assign Test", "owner_id": 1})
    assert r.status_code == 200, r.text
    tid = r.json()["id"]
    # general body cannot reassign
    r = c_gen.put(f"/api/tasks/{tid}", json={"owner_id": 2})
    assert r.status_code == 403
    # volunteer cannot assign at all
    r = c_vol.put(f"/api/tasks/{tid}", json={"owner_id": 3})
    assert r.status_code == 403
    # exec can reassign
    r = c_exec.put(f"/api/tasks/{tid}", json={"owner_id": 2})
    assert r.status_code == 200
    # cleanup
    c_exec.delete(f"/api/tasks/{tid}")


def test_volunteer_scoping():
    """Volunteers see only their own tasks; cannot create/delete."""
    from app.security import create_token
    c_vol = TestClient(app)
    c_vol.headers.update({"Authorization": f"Bearer {create_token('vol@kimun.demo')}"})
    c_exec = TestClient(app)
    c_exec.headers.update({"Authorization": f"Bearer {create_token('exec@kimun.demo')}"})
    # exec creates a task assigned to vol
    vol_user = c_exec.get("/api/auth/me").json()  # this is exec, not vol
    vol_info = TestClient(app)
    vol_info.headers.update({"Authorization": f"Bearer {create_token('vol@kimun.demo')}"})
    vol_id = vol_info.get("/api/auth/me").json()["id"]
    r = c_exec.post("/api/tasks", json={"title": "Vol Task", "owner_id": vol_id})
    assert r.status_code == 200
    tid = r.json()["id"]
    # vol can see it
    vol_tasks = c_vol.get("/api/tasks").json()
    assert any(t["id"] == tid for t in vol_tasks)
    # vol cannot create
    r = c_vol.post("/api/tasks", json={"title": "Blocked"})
    assert r.status_code == 403
    # vol can update status of own task
    r = c_vol.put(f"/api/tasks/{tid}", json={"status": "in_progress"})
    assert r.status_code == 200
    # vol cannot change owner
    r = c_vol.put(f"/api/tasks/{tid}", json={"owner_id": 1})
    assert r.status_code == 403
    # vol cannot delete
    r = c_vol.delete(f"/api/tasks/{tid}")
    assert r.status_code == 403
    # exec cleans up
    c_exec.delete(f"/api/tasks/{tid}")


def test_assignment_creates_notification():
    """Assigning a task generates an in-app notification for the assignee."""
    from app.security import create_token
    c = get_client()
    vol_info = TestClient(app)
    vol_info.headers.update({"Authorization": f"Bearer {create_token('vol@kimun.demo')}"})
    vol_id = vol_info.get("/api/auth/me").json()["id"]
    from datetime import date, timedelta
    due = (date.today() + timedelta(days=1)).isoformat()
    r = c.post("/api/tasks", json={"title": "Notify Test", "owner_id": vol_id, "due_date": due})
    assert r.status_code == 200
    tid = r.json()["id"]
    # vol should have a notification
    notifs = vol_info.get("/api/notifications").json()
    assert notifs["unread"] >= 1
    assert any("Notify Test" in n["message"] for n in notifs["items"])
    # due_now should include it (due 2026-12-20)
    assert any(d["task_id"] == tid for d in notifs["due_now"])
    c.delete(f"/api/tasks/{tid}")


def test_notifications_unread_endpoint():
    c = get_client()
    r = c.get("/api/notifications/unread")
    assert r.status_code == 200
    assert "unread" in r.json()


# =====================================================================
# PUBLIC REGISTRATION + PORTAL TESTS
# =====================================================================

def test_public_committees():
    """Public committees endpoint returns seed committees without auth."""
    c = get_client()
    r = c.get("/api/public/committees")
    assert r.status_code == 200
    names = [x["name"] for x in r.json()]
    assert "UNGA" in names
    assert "UNSC" in names


def test_public_register_individual():
    """Individual registration creates a delegate with token + checkin_code + sends email."""
    c = get_client()
    r = c.post("/api/public/register", json={
        "name": "Public Test Delegate",
        "email": "pub@test.com",
        "phone": "+92 300 1111111",
        "institution": "Test University",
        "experience_level": "first_timer",
        "registration_type": "individual",
        "committee_preferences": "UNGA,UNSC",
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["ok"] is True
    assert data["type"] == "individual"
    assert data["reference"].startswith("K26-")
    # verify delegate exists in DB
    from app.db import SessionLocal
    from app import models
    db = SessionLocal()
    d = db.query(models.Delegate).filter(models.Delegate.checkin_code == data["reference"]).first()
    assert d is not None
    assert d.registration_token != ""
    assert d.fee_amount == 8000
    assert d.reg_status == "started"
    assert d.pay_status == "unpaid"
    db.close()


def test_public_register_delegation():
    """Delegation of 6 creates 6 delegates + 1 group + head delegate."""
    c = get_client()
    members = [{"name": f"Del {i}", "email": f"del{i}@test.com", "phone": f"+92 300 111111{i}"} for i in range(6)]
    r = c.post("/api/public/register", json={
        "name": "Test School",
        "email": "school@test.com",
        "phone": "+92 300 2222222",
        "institution": "Test School Inst",
        "registration_type": "delegation",
        "delegation_members": members,
        "head_delegate_index": 0,
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["ok"] is True
    assert data["type"] == "delegation"
    assert data["delegate_count"] == 6
    assert data["group_id"] is not None
    from app.db import SessionLocal
    from app import models
    db = SessionLocal()
    grp = db.get(models.Group, data["group_id"])
    assert grp is not None
    assert grp.head_delegate_id is not None
    assert grp.fee_agreed == 45000
    dels = db.query(models.Delegate).filter_by(group_id=grp.id).all()
    assert len(dels) == 6
    assert all(d.registration_type == "delegation" for d in dels)
    assert all(d.registration_token != "" for d in dels)
    db.close()


def test_public_login_and_portal_profile():
    """Login with reference number → portal profile returns delegate data."""
    c = get_client()
    # first register
    r = c.post("/api/public/register", json={
        "name": "Portal Test Delegate",
        "email": "portal@test.com",
        "registration_type": "individual",
    })
    ref = r.json()["reference"]
    # login
    r = c.post("/api/public/login", json={"reference": ref})
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    assert r.json()["delegate"]["reference"] == ref
    # portal profile
    headers = {"Authorization": f"Bearer {token}"}
    r = c.get("/api/portal/profile", headers=headers)
    assert r.status_code == 200
    prof = r.json()
    assert prof["name"] == "Portal Test Delegate"
    assert prof["reference"] == ref
    assert prof["pay_status"] == "unpaid"


def test_portal_notes_crud():
    """Portal notes: create, list, update, delete — scoped to own delegate."""
    c = get_client()
    r = c.post("/api/public/register", json={
        "name": "Notes Test",
        "email": "notes@test.com",
        "registration_type": "individual",
    })
    ref = r.json()["reference"]
    token = c.post("/api/public/login", json={"reference": ref}).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    # create
    r = c.post("/api/portal/notes", json={"body": "My first note"}, headers=headers)
    assert r.status_code == 200
    nid = r.json()["id"]
    assert r.json()["body"] == "My first note"
    # list
    r = c.get("/api/portal/notes", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1
    # update
    r = c.put(f"/api/portal/notes/{nid}", json={"body": "Updated note"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["body"] == "Updated note"
    # delete
    r = c.delete(f"/api/portal/notes/{nid}", headers=headers)
    assert r.status_code == 200
    # confirm gone
    r = c.get("/api/portal/notes", headers=headers)
    assert all(n["id"] != nid for n in r.json())


def test_public_payment_upload():
    """Payment upload updates delegate pay status."""
    c = get_client()
    r = c.post("/api/public/register", json={
        "name": "Payment Test",
        "email": "pay@test.com",
        "registration_type": "individual",
    })
    ref = r.json()["reference"]
    r = c.post("/api/public/payment", json={"reference": ref, "payment_reference": "TXN-12345"})
    assert r.status_code == 200
    # verify in DB
    from app.db import SessionLocal
    from app import models
    db = SessionLocal()
    d = db.query(models.Delegate).filter(models.Delegate.checkin_code == ref).first()
    assert d.payment_reference == "TXN-12345"
    assert d.reg_status == "completed"
    db.close()


def test_portal_study_guides():
    """Portal study guides endpoint returns demo guides for assigned committee."""
    c = get_client()
    # register and login
    r = c.post("/api/public/register", json={"name": "SG Test", "email": "sgtest@test.com", "registration_type": "individual"})
    ref = r.json()["reference"]
    token = c.post("/api/public/login", json={"reference": ref}).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    r = c.get("/api/portal/study-guides", headers=headers)
    assert r.status_code == 200
    # no committee assigned → only general guides (none in seed)
    assert isinstance(r.json(), list)


# =====================================================================
# VOLUNTEER APPLICATION + RECRUITMENT TESTS
# =====================================================================

def test_public_apply():
    """Public application creates an Application record + notifies admins."""
    c = get_client()
    r = c.post("/api/public/apply", json={
        "name": "Applicant Test", "phone": "+92 300 9999999",
        "email": "applicant@test.com", "city": "Karachi",
        "experience": "2 MUNs", "department_preference": "IT"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["ok"] is True
    assert data["application_id"] > 0
    # verify in DB
    from app.db import SessionLocal
    from app import models
    db = SessionLocal()
    a = db.get(models.Application, data["application_id"])
    assert a is not None
    assert a.status == "applied"
    assert a.department_preference == "IT"
    db.close()


def test_apply_duplicate_email():
    """Cannot apply twice with the same email."""
    c = get_client()
    c.post("/api/public/apply", json={"name": "Dup", "email": "dup@test.com"})
    r = c.post("/api/public/apply", json={"name": "Dup2", "email": "dup@test.com"})
    assert r.status_code == 409


def test_admin_schedule_interview():
    """Admin schedules interview → status changes to interview_scheduled + email sent."""
    c = get_client()
    # create application
    r = c.post("/api/public/apply", json={"name": "Interview Test", "email": "intv@test.com"})
    aid = r.json()["application_id"]
    # admin schedules interview
    r = c.put(f"/api/applications/{aid}", json={"status": "interview_scheduled",
              "interview_date": "2026-12-20T10:00:00", "interview_notes": "Slot 1"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "interview_scheduled"
    # verify in DB
    from app.db import SessionLocal
    from app import models
    db = SessionLocal()
    a = db.get(models.Application, aid)
    assert a.status == "interview_scheduled"
    assert a.interview_notes == "Slot 1"
    db.close()


def test_admin_approve_creates_user_and_ref():
    """Admin approval creates a User + reference_number + sends selection email."""
    c = get_client()
    r = c.post("/api/public/apply", json={"name": "Approve Test", "email": "approve@test.com"})
    aid = r.json()["application_id"]
    # get a department
    r = c.get("/api/departments")
    dept_id = r.json()[0]["id"]
    # approve
    r = c.put(f"/api/applications/{aid}", json={"status": "approved", "department_id": dept_id})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "approved"
    assert data["reference_number"].startswith("KIMV-")
    # verify User created
    from app.db import SessionLocal
    from app import models
    db = SessionLocal()
    u = db.query(models.User).filter(models.User.reference_number == data["reference_number"]).first()
    assert u is not None
    assert u.role == "volunteer"
    assert u.department_id == dept_id
    db.close()


def test_dept_portal_login_and_tasks():
    """Approved volunteer can login with reference number + see department tasks."""
    c = get_client()
    # apply + approve
    r = c.post("/api/public/apply", json={"name": "Portal Vol", "email": "volport@test.com"})
    aid = r.json()["application_id"]
    r = c.get("/api/departments")
    dept_id = r.json()[0]["id"]
    r = c.put(f"/api/applications/{aid}", json={"status": "approved", "department_id": dept_id})
    ref = r.json()["reference_number"]
    # login
    r = c.post("/api/public/apply/login", json={"reference": ref})
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    # profile
    r = c.get("/api/apply/portal/profile", headers=headers)
    assert r.status_code == 200
    assert r.json()["name"] == "Portal Vol"
    assert r.json()["department_id"] == dept_id
    # tasks
    r = c.get("/api/apply/portal/tasks", headers=headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_reject_sends_email():
    """Admin rejection sends rejection email."""
    c = get_client()
    r = c.post("/api/public/apply", json={"name": "Reject Test", "email": "reject@test.com"})
    aid = r.json()["application_id"]
    r = c.put(f"/api/applications/{aid}", json={"status": "rejected"})
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"
    # no reference number should be generated
    assert r.json()["reference_number"] == ""


def test_list_applications_admin():
    """Admin can list applications with optional status filter."""
    c = get_client()
    c.post("/api/public/apply", json={"name": "List Test", "email": "list@test.com"})
    r = c.get("/api/applications")
    assert r.status_code == 200
    assert len(r.json()) >= 1
    # filter by status
    r = c.get("/api/applications?status=applied")
    assert r.status_code == 200
    assert all(a["status"] == "applied" for a in r.json())


def test_registration_auto_generates_qr_badge():
    """Delegate registration auto-generates QR badge."""
    c = get_client()
    r = c.post("/api/public/register", json={
        "name": "QR Test", "email": "qr@test.com", "phone": "000",
        "institution": "Test U", "registration_type": "individual",
    })
    assert r.status_code == 200
    did = r.json()["delegate_id"]
    ref = r.json()["reference"]
    db = SessionLocal()
    d = db.get(models.Delegate, did)
    assert d.checkin_code == ref
    assert d.badge_url != ""  # QR auto-generated
    db.close()


def test_delegation_auto_generates_qr_badge():
    """Each delegation member gets auto-generated QR badge."""
    c = get_client()
    r = c.post("/api/public/register", json={
        "name": "Del QR", "email": "delqr@test.com", "phone": "000",
        "institution": "Del U", "registration_type": "delegation",
        "head_delegate_index": 0,
        "delegation_members": [
            {"name": "M1", "email": "m1@test.com", "phone": "111", "institution": "Del U"},
            {"name": "M2", "email": "m2@test.com", "phone": "222", "institution": "Del U"},
        ]
    })
    assert r.status_code == 200
    gid = r.json()["group_id"]
    db = SessionLocal()
    members = db.query(models.Delegate).filter_by(group_id=gid).all()
    assert len(members) == 2
    for m in members:
        assert m.checkin_code != ""
        assert m.badge_url != ""  # QR auto-generated
    db.close()


def test_approve_payment_sets_paid_and_generates_qr():
    """POST /delegates/{did}/approve-payment sets pay_status=paid + auto-generates QR."""
    c = get_client()
    # create a delegate manually
    d = models.Delegate(name="PayTest", email="pay@test.com", institution="PayU",
                        reg_status="completed", pay_status="unpaid", fee_amount=8000)
    db = SessionLocal()
    db.add(d); db.commit(); db.refresh(d)
    did = d.id
    db.close()
    r = c.post(f"/api/delegates/{did}/approve-payment", json={})
    assert r.status_code == 200
    assert r.json()["pay_status"] == "paid"
    assert r.json()["amount_paid"] == 8000
    assert r.json()["badge_url"] != ""  # QR generated on approval
    # verify in DB
    db = SessionLocal()
    d = db.get(models.Delegate, did)
    assert d.pay_status == "paid"
    assert d.amount_paid == 8000
    assert d.badge_url != ""
    db.close()


def test_approve_payment_custom_amount():
    """Approve payment with custom amount."""
    c = get_client()
    d = models.Delegate(name="PayAmt", email="payamt@test.com", institution="PayAU",
                        reg_status="completed", pay_status="unpaid", fee_amount=8000)
    db = SessionLocal()
    db.add(d); db.commit(); db.refresh(d)
    did = d.id
    db.close()
    r = c.post(f"/api/delegates/{did}/approve-payment", json={"amount_paid": 5000})
    assert r.status_code == 200
    assert r.json()["amount_paid"] == 5000
