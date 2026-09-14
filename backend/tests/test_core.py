import app.models  # noqa
from fastapi.testclient import TestClient
from app.main import app
from app.db import SessionLocal
from app.seed import seed


def get_client():
    seed()
    c = TestClient(app)
    r = c.post("/api/auth/login", json={"email": "sg@kimun.demo", "password": "kimun123"})
    assert r.status_code == 200, r.text
    c.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return c


def test_health():
    assert TestClient(app).get("/api/health").json()["ok"] is True


def test_auth_rbac():
    c = get_client()
    assert c.get("/api/auth/me").status_code == 200
    assert c.get("/api/dashboard/summary").json()["readiness"]["overall"] >= 0


def test_tasks_crud():
    c = get_client()
    r = c.post("/api/tasks", json={"title": "Test task", "status": "todo", "priority": "high"})
    assert r.status_code == 200
    oid = r.json()["id"]
    assert c.put(f"/api/tasks/{oid}", json={"status": "completed"}).status_code == 200
    assert c.delete(f"/api/tasks/{oid}").status_code == 200


def test_delegates_sponsors_finance():
    c = get_client()
    assert c.get("/api/delegates").status_code == 200
    assert c.get("/api/sponsors").status_code == 200
    assert c.get("/api/transactions").status_code == 200


def test_media_pipeline():
    c = get_client()
    r = c.post("/api/content", json={"title": "AI test post", "status": "idea"})
    assert r.status_code == 200
    assert c.get("/api/campaigns").status_code == 200
    assert c.get("/api/ideas").status_code == 200


def test_ai_status_provider_reported():
    c = get_client()
    s = c.get("/api/ai/status").json()
    assert "openai" not in str(s).lower()
    assert "anthropic" not in str(s).lower()
    assert s["provider"] in ("gemini", "nvidia")


def test_volunteer_blocked_from_finance():
    from app.security import create_token
    c = TestClient(app)
    c.headers.update({"Authorization": f"Bearer {create_token('vol@kimun.demo')}"})
    assert c.get("/api/transactions").status_code == 403


def test_no_fake_metrics_marker():
    c = get_client()
    social = c.get("/api/social").json()
    assert all("connection" in s for s in social)
