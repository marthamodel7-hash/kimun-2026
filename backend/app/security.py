import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from jose import jwt
from app.core_config import settings

_ITER = 200_000


def hash_password(p: str) -> str:
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", p.encode(), bytes.fromhex(salt), _ITER).hex()
    return f"pbkdf2${_ITER}${salt}${dk}"


def verify_password(p: str, h: str) -> bool:
    try:
        _, it, salt, dk = h.split("$")
        cand = hashlib.pbkdf2_hmac("sha256", p.encode(), bytes.fromhex(salt), int(it)).hex()
        return hmac.compare_digest(cand, dk)
    except Exception:
        return False


def create_token(sub: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": sub, "exp": exp}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(t: str) -> str | None:
    try:
        return jwt.decode(t, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]).get("sub")
    except Exception:
        return None
