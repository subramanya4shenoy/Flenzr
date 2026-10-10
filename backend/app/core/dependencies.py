from typing import Callable, List, Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationError, PermissionDeniedError
from app.core.security import SecurityService, SupabaseTokenPayload
from app.domains.identity.models import SystemRole, User
from app.domains.identity.services import IdentityService

security_scheme = HTTPBearer(auto_error=False)


async def get_token_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> SupabaseTokenPayload:
    if not credentials or not credentials.credentials:
        raise AuthenticationError("Authorization header with Bearer token is missing")
    try:
        return SecurityService.decode_and_verify_token(credentials.credentials)
    except ValueError as e:
        raise AuthenticationError(str(e))


async def get_current_user(
    payload: SupabaseTokenPayload = Depends(get_token_payload),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extracts verified JWT payload and retrieves or JIT provisions the internal User record.
    """
    user = await IdentityService.get_or_create_user_from_token(db, payload)
    if not user.is_active:
        raise PermissionDeniedError("Account is inactive or suspended")
    return user


def require_role(allowed_roles: List[SystemRole]) -> Callable:
    """
    Enforces that the current authenticated user has at least one of the specified roles.
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles = [r.role for r in current_user.roles]
        if current_user.is_superadmin:
            return current_user
        
        has_permission = any(role in user_roles for role in allowed_roles)
        if not has_permission:
            role_names = [r.value for r in allowed_roles]
            raise PermissionDeniedError(
                f"Requires one of the following roles: {', '.join(role_names)}"
            )
        return current_user

    return role_checker
