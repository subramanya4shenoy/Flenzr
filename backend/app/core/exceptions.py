from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status


class FlenzrException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[List[Dict[str, Any]]] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or []
        super().__init__(message)


class AuthenticationError(FlenzrException):
    def __init__(self, message: str = "Invalid or expired authentication credentials"):
        super().__init__(
            code="UNAUTHENTICATED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class PermissionDeniedError(FlenzrException):
    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__(
            code="PERMISSION_DENIED",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


class EntityNotFoundError(FlenzrException):
    def __init__(self, entity_name: str, identifier: Any):
        super().__init__(
            code="ENTITY_NOT_FOUND",
            message=f"{entity_name} with identifier '{identifier}' was not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class DomainRuleViolation(FlenzrException):
    def __init__(self, code: str, message: str):
        super().__init__(
            code=code,
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )


class DuplicateEntityError(FlenzrException):
    def __init__(self, entity_name: str, field: str, value: Any):
        super().__init__(
            code="DUPLICATE_ENTITY",
            message=f"{entity_name} with {field} '{value}' already exists",
            status_code=status.HTTP_409_CONFLICT,
        )
