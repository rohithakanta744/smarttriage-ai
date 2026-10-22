from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_requires_credentials(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    assert client.get("/health").status_code == 503


def test_health_reports_configuration_only(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-only-not-a-credential")
    monkeypatch.setenv("AI_MODEL", "test-model")
    assert client.get("/health").json() == {"status": "ok", "engine": "live-ai", "upstream_checked": False}


def test_rejects_more_than_50000_characters():
    assert client.post("/api/diagnose", json={"error_log": "x" * 50001}).status_code == 422


def test_rejects_foreign_browser_origin():
    assert client.post("/api/diagnose", headers={"Origin": "https://untrusted.example"}, json={"error_log": "ERROR expired certificate"}).status_code == 403


def test_no_credentials_never_returns_demo(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post("/api/diagnose", json={"error_log": "ERROR expired certificate"})
    assert response.status_code == 503
    assert "severity" not in response.json()