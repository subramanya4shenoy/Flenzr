from datetime import datetime, timezone
from typing import Any, Dict, Optional
import jwt
from jwt import PyJWKClient
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


_jwks_client: Optional[PyJWKClient] = None


def get_jwks_client() -> Optional[PyJWKClient]:
    global _jwks_client
    if _jwks_client is None and settings.SUPABASE_JWKS_URL:
        _jwks_client = PyJWKClient(settings.SUPABASE_JWKS_URL)
    return _jwks_client


class SecurityService:
    @staticmethod
    def decode_and_verify_token(token: str) -> SupabaseTokenPayload:
        """
        Cryptographically validates and decodes a Supabase JWT.
        Supports both:
        1. Modern asymmetric ES256 JWKS verification directly from Supabase.
        2. Symmetric HS256 fallback for tests and development.
        """
        try:
            unverified_header = jwt.get_unverified_header(token)
            alg = unverified_header.get("alg", "HS256")

            if alg == "ES256" and settings.SUPABASE_JWKS_URL:
                jwks_client = get_jwks_client()
                if jwks_client:
                    signing_key = jwks_client.get_signing_key_from_jwt(token)
                    payload = jwt.decode(
                        token,
                        signing_key.key,
                        algorithms=["ES256"],
                        options={"verify_signature": True, "verify_exp": True, "verify_aud": False},
                    )
                    return SupabaseTokenPayload(**payload)

            # Fallback to HS256 symmetric secret
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=[settings.SUPABASE_JWT_ALGORITHM, "HS256"],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": False,
                },
            )
            return SupabaseTokenPayload(**payload)
        except jwt.ExpiredSignatureError:
            raise ValueError("Token signature has expired")
        except jwt.InvalidTokenError as e:
            raise ValueError(f"Invalid token: {str(e)}")
        except Exception as e:
            raise ValueError(f"Token verification error: {str(e)}")

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
