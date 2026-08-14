import jwt

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.auth_user import AuthUser


def test_password_hash_is_not_plaintext():
    password = "correct horse battery staple"
    password_hash = hash_password(password)

    assert password_hash != password
    assert verify_password(password, password_hash)
    assert not verify_password("wrong password", password_hash)


def test_access_token_contains_identity_and_role():
    user = AuthUser(id=42, email="player@example.com", name="Player", role="user", password="unused")

    token, expires_at = create_access_token(user)
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

    assert payload["sub"] == "42"
    assert payload["role"] == "user"
    assert payload["type"] == "access"
    assert expires_at.tzinfo is not None
