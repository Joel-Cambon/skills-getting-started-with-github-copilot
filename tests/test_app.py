from fastapi.testclient import TestClient
import pytest

from src.app import app, activities


client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_duplicate_and_remove():
    activity = "Chess Club"
    email = "testuser@example.com"

    # Ensure clean state for the test
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Sign up should succeed
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 200
    assert email in activities[activity]["participants"]

    # Duplicate sign-up should return 400
    resp2 = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp2.status_code == 400

    # Remove participant
    resp3 = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert resp3.status_code == 200
    assert email not in activities[activity]["participants"]


def test_signup_nonexistent_activity():
    resp = client.post("/activities/NoSuchActivity/signup", params={"email": "x@x.com"})
    assert resp.status_code == 404


def test_delete_nonexistent_participant():
    activity = "Programming Class"
    email = "not-present@mergington.edu"
    # Ensure not present
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    resp = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert resp.status_code == 404
