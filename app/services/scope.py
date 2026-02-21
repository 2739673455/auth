from typing import Annotated

from fastapi import Depends

from app.exceptions import auth as auth_error
from app.schemas import token as token_schema
from app.services import token as token_service


def require_admin_scope(
    payload: Annotated[
        token_schema.AccessTokenPayload,
        Depends(token_service.authenticate_access_token),
    ],
) -> token_schema.AccessTokenPayload:
    """校验管理员权限（拥有 * 权限）"""
    if "*" not in payload.scope:
        raise auth_error.InsufficientPermissionsError
    return payload
