"""
Backend tests for MATRIX platform.
Covers: auth (register/login/me), catalog list & buy, avatar, profile,
promocodes redemption, daily challenge, admin CRUD (items/promos/challenges), admin stats.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://avatar-catalog-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@matrix.com"
ADMIN_PASSWORD = "admin123"


# -------------- Fixtures --------------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def user_creds():
    suffix = uuid.uuid4().hex[:8]
    return {
        "username": f"testuser_{suffix}",
        "email": f"testuser_{suffix}@example.com",
        "password": "TestPass123!",
    }


@pytest.fixture(scope="session")
def user_ctx(user_creds):
    r = requests.post(f"{API}/auth/register", json=user_creds)
    assert r.status_code == 200, f"Register failed: {r.text}"
    data = r.json()
    return {"token": data["token"], "user": data["user"], "creds": user_creds}


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# -------------- Auth --------------
class TestAuth:
    def test_register_new_user_grants_500_brix(self, user_ctx):
        u = user_ctx["user"]
        assert u["brix"] == 500
        assert u["role"] == "user"
        assert "id" in u
        assert u.get("owned_items") == []

    def test_register_duplicate_email(self, user_ctx):
        r = requests.post(f"{API}/auth/register", json=user_ctx["creds"])
        assert r.status_code == 400
        assert "already" in r.json()["detail"].lower()

    def test_login_admin(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 10

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_bearer(self, user_ctx):
        r = requests.get(f"{API}/auth/me", headers=auth_headers(user_ctx["token"]))
        assert r.status_code == 200
        assert r.json()["email"] == user_ctx["creds"]["email"]

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# -------------- Catalog --------------
class TestCatalog:
    def test_list_returns_live_items(self):
        r = requests.get(f"{API}/catalog")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 6
        for it in items:
            assert it["is_live"] is True
            assert "price" in it and "name" in it and "category" in it
            assert "id" in it and "_id" not in it

    def test_list_category_filter(self):
        r = requests.get(f"{API}/catalog", params={"category": "hat"})
        assert r.status_code == 200
        for it in r.json():
            assert it["category"] == "hat"

    def test_get_item_by_id(self):
        items = requests.get(f"{API}/catalog").json()
        iid = items[0]["id"]
        r = requests.get(f"{API}/catalog/{iid}")
        assert r.status_code == 200
        assert r.json()["id"] == iid


# -------------- Purchase --------------
class TestPurchase:
    def test_buy_cheapest_item_decrements_brix(self):
        # Use fresh user for deterministic Brix balance
        suffix = uuid.uuid4().hex[:8]
        creds = {"username": f"buyer2_{suffix}", "email": f"buyer2_{suffix}@example.com", "password": "TestPass123!"}
        reg = requests.post(f"{API}/auth/register", json=creds)
        assert reg.status_code == 200, reg.text
        token = reg.json()["token"]
        brix_before = reg.json()["user"]["brix"]

        items = sorted(
            [i for i in requests.get(f"{API}/catalog").json() if i["price"] <= brix_before],
            key=lambda x: x["price"],
        )
        assert items, "No affordable item available"
        cheap = items[0]
        r = requests.post(f"{API}/catalog/{cheap['id']}/buy", headers=auth_headers(token))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["brix"] == brix_before - cheap["price"]
        assert cheap["id"] in data["user"]["owned_items"]

    def test_buy_already_owned_blocked(self, user_ctx):
        # Use a fresh user to avoid conflicts with other purchase tests
        suffix = uuid.uuid4().hex[:8]
        creds = {"username": f"buyer_{suffix}", "email": f"buyer_{suffix}@example.com", "password": "TestPass123!"}
        reg = requests.post(f"{API}/auth/register", json=creds)
        assert reg.status_code == 200, reg.text
        token = reg.json()["token"]
        items = sorted(requests.get(f"{API}/catalog").json(), key=lambda x: x["price"])
        buy_r = requests.post(f"{API}/catalog/{items[0]['id']}/buy", headers=auth_headers(token))
        assert buy_r.status_code == 200, buy_r.text
        # Now attempt to buy same item again
        r = requests.post(f"{API}/catalog/{items[0]['id']}/buy", headers=auth_headers(token))
        assert r.status_code == 400
        assert "already own" in r.json()["detail"].lower()

    def test_buy_expensive_not_enough_brix(self, user_ctx):
        items = sorted(requests.get(f"{API}/catalog").json(), key=lambda x: -x["price"])
        expensive = items[0]  # 2000 Brix jetpack
        # user should have < 2000 by now (started with 500 - cheapest)
        r = requests.post(f"{API}/catalog/{expensive['id']}/buy", headers=auth_headers(user_ctx["token"]))
        # user might not own it; expect 400 not enough brix
        assert r.status_code == 400
        assert "brix" in r.json()["detail"].lower()

    def test_buy_unauthenticated(self):
        items = requests.get(f"{API}/catalog").json()
        r = requests.post(f"{API}/catalog/{items[0]['id']}/buy")
        assert r.status_code == 401


# -------------- Avatar & Profile --------------
class TestAvatarProfile:
    def test_update_avatar_colors(self, user_ctx):
        r = requests.put(
            f"{API}/avatar",
            headers=auth_headers(user_ctx["token"]),
            json={"skin": "#123456", "shirt": "#654321", "pants": "#000000"},
        )
        assert r.status_code == 200
        av = r.json()["avatar"]
        assert av["skin"] == "#123456"
        assert av["shirt"] == "#654321"
        # verify persistence
        me = requests.get(f"{API}/auth/me", headers=auth_headers(user_ctx["token"])).json()
        assert me["avatar"]["skin"] == "#123456"

    def test_equip_owned_item(self, user_ctx):
        me = requests.get(f"{API}/auth/me", headers=auth_headers(user_ctx["token"])).json()
        if not me["owned_items"]:
            # buy the cheapest hat/face/gear so we have something to equip
            items = sorted(
                [i for i in requests.get(f"{API}/catalog").json() if i["category"] in ("hat", "face", "gear")],
                key=lambda x: x["price"],
            )
            # ensure we have Brix
            if me["brix"] < items[0]["price"]:
                requests.post(f"{API}/promocodes/redeem", headers=auth_headers(user_ctx["token"]), json={"code": "WELCOME"})
            buy_r = requests.post(f"{API}/catalog/{items[0]['id']}/buy", headers=auth_headers(user_ctx["token"]))
            assert buy_r.status_code == 200, buy_r.text
            me = buy_r.json()["user"]
        owned_id = me["owned_items"][0]
        item = requests.get(f"{API}/catalog/{owned_id}").json()
        slot = item["category"] if item["category"] in ("hat", "face", "gear") else "gear"
        r = requests.put(f"{API}/avatar", headers=auth_headers(user_ctx["token"]), json={slot: owned_id})
        assert r.status_code == 200
        assert r.json()["avatar"][slot] == owned_id

    def test_equip_unowned_rejected(self, user_ctx):
        # find an item the user doesn't own
        me = requests.get(f"{API}/auth/me", headers=auth_headers(user_ctx["token"])).json()
        owned = set(me["owned_items"])
        items = requests.get(f"{API}/catalog").json()
        candidate = next((i for i in items if i["id"] not in owned and i["category"] in ("hat", "face", "gear")), None)
        assert candidate, "No unowned equippable item found"
        r = requests.put(
            f"{API}/avatar",
            headers=auth_headers(user_ctx["token"]),
            json={candidate["category"]: candidate["id"]},
        )
        assert r.status_code == 400

    def test_update_bio(self, user_ctx):
        r = requests.put(f"{API}/profile", headers=auth_headers(user_ctx["token"]), json={"bio": "Hello Matrix!"})
        assert r.status_code == 200
        assert r.json()["bio"] == "Hello Matrix!"

    def test_get_public_profile(self, user_ctx):
        username = user_ctx["user"]["username"]
        r = requests.get(f"{API}/users/{username}")
        assert r.status_code == 200
        data = r.json()
        assert data["username"] == username
        assert "email" not in data  # email excluded from public profile
        assert isinstance(data["owned"], list)


# -------------- Promocodes --------------
class TestPromocodes:
    def test_redeem_matrix2026(self, user_ctx):
        me_before = requests.get(f"{API}/auth/me", headers=auth_headers(user_ctx["token"])).json()
        r = requests.post(f"{API}/promocodes/redeem", headers=auth_headers(user_ctx["token"]), json={"code": "MATRIX2026"})
        assert r.status_code == 200, r.text
        assert r.json()["reward"] == 250
        assert r.json()["user"]["brix"] == me_before["brix"] + 250

    def test_redeem_same_code_twice_blocked(self, user_ctx):
        r = requests.post(f"{API}/promocodes/redeem", headers=auth_headers(user_ctx["token"]), json={"code": "MATRIX2026"})
        assert r.status_code == 400
        assert "already" in r.json()["detail"].lower()

    def test_redeem_invalid_code(self, user_ctx):
        r = requests.post(f"{API}/promocodes/redeem", headers=auth_headers(user_ctx["token"]), json={"code": "NOPE_XYZ"})
        assert r.status_code == 404


# -------------- Daily Challenge --------------
class TestDailyChallenge:
    def test_get_active_challenge(self, user_ctx):
        r = requests.get(f"{API}/challenges/daily", headers=auth_headers(user_ctx["token"]))
        assert r.status_code == 200
        data = r.json()
        assert data["challenge"] is not None
        assert data["challenge"]["title"] == "Daily Login Bonus"

    def test_claim_challenge_grants_75(self, user_ctx):
        me_before = requests.get(f"{API}/auth/me", headers=auth_headers(user_ctx["token"])).json()
        r = requests.post(f"{API}/challenges/daily/claim", headers=auth_headers(user_ctx["token"]))
        assert r.status_code == 200, r.text
        assert r.json()["reward"] == 75
        assert r.json()["user"]["brix"] == me_before["brix"] + 75

    def test_claim_challenge_twice_same_day_blocked(self, user_ctx):
        r = requests.post(f"{API}/challenges/daily/claim", headers=auth_headers(user_ctx["token"]))
        assert r.status_code == 400
        assert "already" in r.json()["detail"].lower()


# -------------- Admin CRUD --------------
class TestAdmin:
    def test_admin_stats(self, admin_token):
        r = requests.get(f"{API}/admin/stats", headers=auth_headers(admin_token))
        assert r.status_code == 200
        data = r.json()
        for k in ("users", "items", "promocodes", "challenges"):
            assert k in data and isinstance(data[k], int)

    def test_non_admin_forbidden(self, user_ctx):
        r = requests.get(f"{API}/admin/stats", headers=auth_headers(user_ctx["token"]))
        assert r.status_code == 403

    def test_create_and_delete_item(self, admin_token):
        payload = {
            "name": "TEST_Item_Hat",
            "description": "test",
            "price": 100,
            "image": "",
            "category": "hat",
            "is_live": True,
        }
        r = requests.post(f"{API}/admin/catalog", headers=auth_headers(admin_token), json=payload)
        assert r.status_code == 200
        iid = r.json()["id"]
        # verify present in catalog
        listing = requests.get(f"{API}/catalog").json()
        assert any(i["id"] == iid for i in listing)
        # delete
        d = requests.delete(f"{API}/admin/catalog/{iid}", headers=auth_headers(admin_token))
        assert d.status_code == 200
        # confirm 404
        g = requests.get(f"{API}/catalog/{iid}")
        assert g.status_code == 404

    def test_create_and_delete_promo(self, admin_token):
        code = f"TEST_{uuid.uuid4().hex[:6].upper()}"
        r = requests.post(f"{API}/admin/promocodes", headers=auth_headers(admin_token),
                          json={"code": code, "brix_reward": 50, "max_uses": 10, "active": True})
        assert r.status_code == 200
        pid = r.json()["id"]
        d = requests.delete(f"{API}/admin/promocodes/{pid}", headers=auth_headers(admin_token))
        assert d.status_code == 200

    def test_create_and_delete_challenge(self, admin_token):
        # Note: creating an active challenge deactivates others - be careful
        r = requests.post(f"{API}/admin/challenges", headers=auth_headers(admin_token),
                          json={"title": "TEST_Challenge", "description": "test", "brix_reward": 10, "active": False})
        assert r.status_code == 200
        cid = r.json()["id"]
        d = requests.delete(f"{API}/admin/challenges/{cid}", headers=auth_headers(admin_token))
        assert d.status_code == 200
