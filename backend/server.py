from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, BeforeValidator, ConfigDict
from typing import List, Optional, Annotated, Any
from datetime import datetime, timezone, date, timedelta
from bson import ObjectId
import bcrypt
import jwt
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
    CheckoutStatusResponse,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Server-side Brix packages (never trust the client for amounts)
BRIX_PACKAGES = {
    "starter": {"usd": 1.99, "brix": 500, "label": "Starter Pack", "bonus": 0},
    "popular": {"usd": 4.99, "brix": 1500, "label": "Popular Pack", "bonus": 200},
    "pro": {"usd": 9.99, "brix": 3500, "label": "Pro Pack", "bonus": 600},
    "mega": {"usd": 19.99, "brix": 8000, "label": "Mega Pack", "bonus": 2000},
}

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------------- Helpers ----------------
PyObjectId = Annotated[str, BeforeValidator(str)]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_user(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------------- Models ----------------
DEFAULT_AVATAR = {
    "skin": "#F5C99B",
    "shirt": "#2563EB",
    "pants": "#0F172A",
    "hat": None,       # item id
    "face": None,      # item id
    "gear": None,      # item id
}


class RegisterInput(BaseModel):
    username: str
    email: EmailStr
    password: str


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class AvatarInput(BaseModel):
    skin: Optional[str] = None
    shirt: Optional[str] = None
    pants: Optional[str] = None
    hat: Optional[str] = None
    face: Optional[str] = None
    gear: Optional[str] = None


class ItemInput(BaseModel):
    name: str
    description: str = ""
    price: int = 0
    image: str = ""
    category: str = "hat"  # hat, face, shirt, pants, gear
    is_live: bool = True
    status: str = "sale"   # sale, limited, offsale
    stock: int = 0          # only used for limited items (total copies)


class CheckoutInput(BaseModel):
    package_id: str
    origin_url: str


class PromoInput(BaseModel):
    code: str
    brix_reward: int = 100
    max_uses: int = 100
    active: bool = True


class ChallengeInput(BaseModel):
    title: str
    description: str = ""
    brix_reward: int = 50
    active: bool = True


class RedeemInput(BaseModel):
    code: str


# ---------------- Auth Routes ----------------
@api_router.post("/auth/register")
async def register(data: RegisterInput):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await db.users.find_one({"username": data.username}):
        raise HTTPException(status_code=400, detail="Username already taken")
    doc = {
        "username": data.username,
        "email": email,
        "password_hash": hash_password(data.password),
        "role": "user",
        "brix": 500,
        "avatar": dict(DEFAULT_AVATAR),
        "owned_items": [],
        "bio": "",
        "last_challenge_claim": None,
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    user = clean_user(doc)
    return {"token": create_access_token(str(res.inserted_id)), "user": user}


@api_router.post("/auth/login")
async def login(data: LoginInput):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": create_access_token(str(user["_id"])), "user": clean_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return clean_user(user)


# ---------------- Avatar & Profile ----------------
@api_router.put("/avatar")
async def update_avatar(data: AvatarInput, user: dict = Depends(get_current_user)):
    avatar = user.get("avatar", dict(DEFAULT_AVATAR))
    updates = {k: v for k, v in data.model_dump().items() if v is not None or k in ("hat", "face", "gear")}
    # allow unequip via explicit provided keys
    payload = data.model_dump(exclude_unset=True)
    for k, v in payload.items():
        avatar[k] = v
    # validate equipped items are owned
    for slot in ("hat", "face", "gear"):
        if avatar.get(slot) and avatar[slot] not in user.get("owned_items", []):
            raise HTTPException(status_code=400, detail=f"You don't own the {slot} item")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"avatar": avatar}})
    return {"avatar": avatar}


@api_router.put("/profile")
async def update_profile(data: dict, user: dict = Depends(get_current_user)):
    bio = data.get("bio", "")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"bio": bio}})
    return {"bio": bio}


@api_router.get("/users/{username}")
async def get_profile(username: str):
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    owned = []
    if user.get("owned_items"):
        oids = [ObjectId(i) for i in user["owned_items"]]
        items = await db.items.find({"_id": {"$in": oids}}).to_list(1000)
        owned = [serialize_item(i) for i in items]
    pub = clean_user(user)
    pub.pop("email", None)
    pub["owned"] = owned
    return pub


# ---------------- Catalog ----------------
def serialize_item(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    doc.setdefault("status", "sale")
    doc.setdefault("stock", 0)
    doc.setdefault("sold", 0)
    if doc["status"] == "limited":
        doc["remaining"] = max(doc.get("stock", 0) - doc.get("sold", 0), 0)
        doc["sold_out"] = doc["remaining"] <= 0
    else:
        doc["remaining"] = None
        doc["sold_out"] = False
    return doc


@api_router.get("/catalog")
async def list_catalog(category: Optional[str] = None, all: bool = False):
    query = {} if all else {"is_live": True}
    if category and category != "all":
        query["category"] = category
    items = await db.items.find(query).sort("created_at", -1).to_list(1000)
    return [serialize_item(i) for i in items]


@api_router.get("/catalog/{item_id}")
async def get_item(item_id: str):
    item = await db.items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return serialize_item(item)


@api_router.post("/catalog/{item_id}/buy")
async def buy_item(item_id: str, user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item_id in user.get("owned_items", []):
        raise HTTPException(status_code=400, detail="You already own this item")
    status = item.get("status", "sale")
    if status == "offsale":
        raise HTTPException(status_code=400, detail="This item is off-sale and cannot be purchased")
    price = item.get("price", 0)
    if user.get("brix", 0) < price:
        raise HTTPException(status_code=400, detail="Not enough Brix")

    if status == "limited":
        stock = item.get("stock", 0)
        # atomic claim of one copy while stock remains
        claimed = await db.items.find_one_and_update(
            {"_id": ObjectId(item_id), "$expr": {"$lt": [{"$ifNull": ["$sold", 0]}, stock]}},
            {"$inc": {"sold": 1}},
        )
        if not claimed:
            raise HTTPException(status_code=400, detail="Sold out! This limited item is gone.")

    result = await db.users.find_one_and_update(
        {"_id": user["_id"], "brix": {"$gte": price}, "owned_items": {"$ne": item_id}},
        {"$inc": {"brix": -price}, "$push": {"owned_items": item_id}},
        return_document=True,
    )
    if not result:
        # refund the reserved limited copy on failure
        if status == "limited":
            await db.items.update_one({"_id": ObjectId(item_id)}, {"$inc": {"sold": -1}})
        raise HTTPException(status_code=400, detail="Purchase failed")
    return {"user": clean_user(result), "message": f"Purchased {item['name']}!"}


@api_router.post("/admin/catalog")
async def create_item(data: ItemInput, admin: dict = Depends(require_admin)):
    doc = data.model_dump()
    doc["sold"] = 0
    doc["created_at"] = now_iso()
    res = await db.items.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_item(doc)


@api_router.put("/admin/catalog/{item_id}")
async def edit_item(item_id: str, data: ItemInput, admin: dict = Depends(require_admin)):
    await db.items.update_one({"_id": ObjectId(item_id)}, {"$set": data.model_dump()})
    item = await db.items.find_one({"_id": ObjectId(item_id)})
    return serialize_item(item)


@api_router.delete("/admin/catalog/{item_id}")
async def delete_item(item_id: str, admin: dict = Depends(require_admin)):
    await db.items.delete_one({"_id": ObjectId(item_id)})
    return {"success": True}


# ---------------- Promocodes ----------------
@api_router.post("/promocodes/redeem")
async def redeem_promo(data: RedeemInput, user: dict = Depends(get_current_user)):
    code = data.code.strip().upper()
    promo = await db.promocodes.find_one({"code": code})
    if not promo or not promo.get("active", True):
        raise HTTPException(status_code=404, detail="Invalid or inactive code")
    used_by = promo.get("used_by", [])
    uid = str(user["_id"])
    if uid in used_by:
        raise HTTPException(status_code=400, detail="You already redeemed this code")
    if len(used_by) >= promo.get("max_uses", 0):
        raise HTTPException(status_code=400, detail="This code has reached its usage limit")
    reward = promo.get("brix_reward", 0)
    await db.promocodes.update_one({"_id": promo["_id"]}, {"$push": {"used_by": uid}})
    await db.users.update_one({"_id": user["_id"]}, {"$inc": {"brix": reward}})
    updated = await db.users.find_one({"_id": user["_id"]})
    return {"user": clean_user(updated), "reward": reward, "message": f"Redeemed {reward} Brix!"}


def serialize_promo(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    doc["uses"] = len(doc.get("used_by", []))
    doc.pop("used_by", None)
    return doc


@api_router.get("/admin/promocodes")
async def list_promos(admin: dict = Depends(require_admin)):
    promos = await db.promocodes.find().sort("created_at", -1).to_list(1000)
    return [serialize_promo(p) for p in promos]


@api_router.post("/admin/promocodes")
async def create_promo(data: PromoInput, admin: dict = Depends(require_admin)):
    code = data.code.strip().upper()
    if await db.promocodes.find_one({"code": code}):
        raise HTTPException(status_code=400, detail="Code already exists")
    doc = data.model_dump()
    doc["code"] = code
    doc["used_by"] = []
    doc["created_at"] = now_iso()
    res = await db.promocodes.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_promo(doc)


@api_router.delete("/admin/promocodes/{promo_id}")
async def delete_promo(promo_id: str, admin: dict = Depends(require_admin)):
    await db.promocodes.delete_one({"_id": ObjectId(promo_id)})
    return {"success": True}


# ---------------- Daily Challenge ----------------
@api_router.get("/challenges/daily")
async def get_daily_challenge(user: dict = Depends(get_current_user)):
    challenge = await db.challenges.find_one({"active": True}, sort=[("created_at", -1)])
    if not challenge:
        return {"challenge": None, "claimed": False}
    today = date.today().isoformat()
    claimed = user.get("last_challenge_claim") == today
    c = dict(challenge)
    c["id"] = str(c.pop("_id"))
    return {"challenge": c, "claimed": claimed}


@api_router.post("/challenges/daily/claim")
async def claim_challenge(user: dict = Depends(get_current_user)):
    challenge = await db.challenges.find_one({"active": True}, sort=[("created_at", -1)])
    if not challenge:
        raise HTTPException(status_code=404, detail="No active challenge")
    today = date.today().isoformat()
    if user.get("last_challenge_claim") == today:
        raise HTTPException(status_code=400, detail="Already claimed today. Come back tomorrow!")
    reward = challenge.get("brix_reward", 0)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$inc": {"brix": reward}, "$set": {"last_challenge_claim": today}},
    )
    updated = await db.users.find_one({"_id": user["_id"]})
    return {"user": clean_user(updated), "reward": reward, "message": f"Claimed {reward} Brix!"}


@api_router.get("/admin/challenges")
async def list_challenges(admin: dict = Depends(require_admin)):
    challenges = await db.challenges.find().sort("created_at", -1).to_list(1000)
    out = []
    for c in challenges:
        c = dict(c)
        c["id"] = str(c.pop("_id"))
        out.append(c)
    return out


@api_router.post("/admin/challenges")
async def create_challenge(data: ChallengeInput, admin: dict = Depends(require_admin)):
    if data.active:
        await db.challenges.update_many({}, {"$set": {"active": False}})
    doc = data.model_dump()
    doc["created_at"] = now_iso()
    res = await db.challenges.insert_one(doc)
    doc["_id"] = res.inserted_id
    doc["id"] = str(doc.pop("_id"))
    return doc


@api_router.delete("/admin/challenges/{challenge_id}")
async def delete_challenge(challenge_id: str, admin: dict = Depends(require_admin)):
    await db.challenges.delete_one({"_id": ObjectId(challenge_id)})
    return {"success": True}


@api_router.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    return {
        "users": await db.users.count_documents({}),
        "items": await db.items.count_documents({}),
        "promocodes": await db.promocodes.count_documents({}),
        "challenges": await db.challenges.count_documents({}),
    }


# ---------------- Payments (Stripe: buy Brix) ----------------
@api_router.get("/payments/packages")
async def list_packages():
    return [
        {"id": k, "usd": v["usd"], "brix": v["brix"], "label": v["label"], "bonus": v["bonus"]}
        for k, v in BRIX_PACKAGES.items()
    ]


def get_stripe(request: Request) -> StripeCheckout:
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    return StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)


@api_router.post("/payments/checkout")
async def create_checkout(data: CheckoutInput, request: Request, user: dict = Depends(get_current_user)):
    pkg = BRIX_PACKAGES.get(data.package_id)
    if not pkg:
        raise HTTPException(status_code=400, detail="Invalid package")
    amount = float(pkg["usd"])
    total_brix = pkg["brix"] + pkg["bonus"]
    # Prefer the verified Origin header; fall back to the provided origin_url
    origin = (request.headers.get("origin") or data.origin_url).rstrip("/")
    success_url = f"{origin}/buy-brix?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/buy-brix"
    metadata = {
        "user_id": str(user["_id"]),
        "package_id": data.package_id,
        "brix": str(total_brix),
    }
    stripe = get_stripe(request)
    session = await stripe.create_checkout_session(
        CheckoutSessionRequest(
            amount=amount,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
        )
    )
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": str(user["_id"]),
        "package_id": data.package_id,
        "amount": amount,
        "currency": "usd",
        "brix": total_brix,
        "payment_status": "initiated",
        "credited": False,
        "metadata": metadata,
        "created_at": now_iso(),
    })
    return {"url": session.url, "session_id": session.session_id}


async def _credit_if_paid(session_id: str, status: CheckoutStatusResponse):
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if not txn:
        return
    updates = {"payment_status": status.payment_status, "status": status.status}
    if status.payment_status == "paid" and not txn.get("credited"):
        res = await db.payment_transactions.update_one(
            {"session_id": session_id, "credited": {"$ne": True}},
            {"$set": {**updates, "credited": True}},
        )
        if res.modified_count == 1:
            await db.users.update_one(
                {"_id": ObjectId(txn["user_id"])},
                {"$inc": {"brix": int(txn["brix"])}},
            )
    else:
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": updates})


@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if not txn or txn.get("user_id") != str(user["_id"]):
        raise HTTPException(status_code=404, detail="Transaction not found")
    stripe = get_stripe(request)
    status = await stripe.get_checkout_status(session_id)
    await _credit_if_paid(session_id, status)
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    return {
        "payment_status": status.payment_status,
        "status": status.status,
        "brix": txn.get("brix") if txn else None,
        "credited": txn.get("credited", False) if txn else False,
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    stripe = get_stripe(request)
    try:
        event = await stripe.handle_webhook(body, request.headers.get("Stripe-Signature"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    if event.session_id and event.payment_status == "paid":
        txn = await db.payment_transactions.find_one({"session_id": event.session_id})
        if txn and not txn.get("credited"):
            res = await db.payment_transactions.update_one(
                {"session_id": event.session_id, "credited": {"$ne": True}},
                {"$set": {"payment_status": "paid", "credited": True}},
            )
            if res.modified_count == 1:
                await db.users.update_one(
                    {"_id": ObjectId(txn["user_id"])},
                    {"$inc": {"brix": int(txn["brix"])}},
                )
    return {"received": True}


@api_router.get("/")
async def root():
    return {"message": "Matrix API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@matrix.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "username": "MatrixAdmin",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "brix": 999999,
            "avatar": dict(DEFAULT_AVATAR),
            "owned_items": [],
            "bio": "Platform administrator",
            "last_challenge_claim": None,
            "created_at": now_iso(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await seed_admin()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
