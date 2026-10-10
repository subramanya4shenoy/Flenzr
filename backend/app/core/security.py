from datetime import datetime, timezone
from typing import Any, Dict, Optional
import jwt
from pydantic import BaseModel

from app.core.config import settings


class SupabaseTokenPayload(BaseModel):
    sub: str  # Supabase Auth UID
    email: Optional[str] = None
    role: Optional[str] = None
    aud: Optional[str] = None
    exp: Optional[int] = None
    app_metadata: Dict[str, Any] = {}
    user_metadata: Dict[str, Any] = {}


class SecurityService:
    @staticmethod
    def decode_and_verify_token(token: str) -> SupabaseTokenPayload:
        """
        Cryptographically validates and decodes a Supabase JWT.
        Supports Supabase HS256 JWT secret.
        """
        try:
            # Note: Supabase default tokens use HS256 signed with the SUPABASE_JWT_SECRET
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=[settings.SUPABASE_JWT_ALGORITHM],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": False,  # Aud can be verified if explicitly passed
                },
            )
            return SupabaseTokenPayload(**payload)
        except jwt.ExpiredSignatureError:
            raise ValueError("Token signature has expired")
        except jwt.InvalidTokenError as e:
            raise ValueError(f"Invalid token: {str(e)}")

    @staticmethod
    def create_mock_token(
        sub: str,
        email: str = "user@flenzr.com",
        exp_seconds: int = 3600,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Helper for tests and development to sign mock tokens."""
        now = int(datetime.now(timezone.utc).timestamp())
        payload = {
            "sub": sub,
            "email": email,
            "aud": settings.SUPABASE_JWT_AUDIENCE,
            "role": "authenticated",
            "iat": now,
            "exp": now + exp_seconds,
            "app_metadata": {"provider": "email"},
            "user_metadata": metadata or {"full_name": "Test User"},
        }
        return jwt.encode(
            payload,
            settings.SUPABASE_JWT_SECRET,
            algorithm=settings.SUPABASE_JWT_ALGORITHM,
        )
