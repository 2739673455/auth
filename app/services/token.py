"""令牌认证"""

import uuid
from datetime import datetime, timedelta
from typing import Annotated

import jwt
from fastapi import Cookie, Depends, Header
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import CFG
from app.exceptions import auth as auth_error
from app.repositories import token as token_repo
from app.schemas import token as token_schema
from app.utils import context, db


def _generate_refresh_token(user_id: int) -> tuple:
    """生成刷新令牌"""
    jti = str(uuid.uuid4())  # JWT ID
    expire = datetime.now() + timedelta(
        days=CFG.auth.refresh_token_expire_days
    )  # 刷新令牌过期时间
    payload = {
        "sub": str(user_id),
        "exp": expire.timestamp(),
        "jti": jti,
        "typ": "refresh",
    }
    token = jwt.encode(payload, CFG.auth.secret_key, CFG.auth.algorithm)
    return jti, expire, token


def _generate_access_token(user_id: int, scopes: list[str]) -> str:
    """生成访问令牌"""
    expire = datetime.now() + timedelta(
        minutes=CFG.auth.access_token_expire_minutes
    )  # 访问令牌过期时间
    payload = {
        "sub": str(user_id),
        "exp": expire.timestamp(),
        "scope": " ".join(scopes),
        "typ": "access",
    }
    token = jwt.encode(payload, CFG.auth.secret_key, CFG.auth.algorithm)
    return token


async def create_token(
    db_session: AsyncSession, user_id: int, scopes: list[str]
) -> dict:
    """创建刷新令牌和访问令牌"""
    # 生成刷新令牌
    jti, expire, r_token = _generate_refresh_token(user_id)

    # 存储刷新令牌
    await token_repo.create(db_session, jti, user_id, expire)

    # 生成访问令牌
    a_token = _generate_access_token(user_id, scopes)

    return {
        "access_token": a_token,
        "refresh_token": r_token,
        "token_type": "bearer",
    }


# --- 验证访问令牌 ---


def _get_access_token(
    authorization: Annotated[str | None, Header()] = None,  # 从请求头获取 Bearer token
) -> str | None:
    """从请求头获取 Bearer token"""
    if authorization is None:
        raise auth_error.InvalidAccessTokenError  # 缺少访问令牌
    return authorization.replace("Bearer ", "")


def _decode_access_token(
    access_token: Annotated[str, Depends(_get_access_token)],
) -> token_schema.AccessTokenPayload:
    """解析访问令牌"""
    try:
        payload = jwt.decode(access_token, CFG.auth.secret_key, [CFG.auth.algorithm])
        payload["scope"] = payload["scope"].split()
        payload = token_schema.AccessTokenPayload(**payload)
        if payload.typ != "access":
            raise auth_error.InvalidAccessTokenError  # token 类型不正确
        return payload
    except jwt.ExpiredSignatureError:
        raise auth_error.ExpiredAccessTokenError  # 访问令牌过期
    except jwt.exceptions.InvalidTokenError or ValidationError:
        raise auth_error.InvalidAccessTokenError  # 访问令牌无效


async def authenticate_access_token(
    payload: Annotated[token_schema.AccessTokenPayload, Depends(_decode_access_token)],
) -> token_schema.AccessTokenPayload:
    """验证访问令牌"""
    # 设置 user_id 到 ContextVar
    context.user_id_ctx.set(str(payload.sub))
    return payload


# --- 验证刷新令牌 ---


def _decode_refresh_token(
    refresh_token: Annotated[str, Cookie()],  # 从 Cookie 获取 refresh_token
) -> token_schema.RefreshTokenPayload:
    """解析刷新令牌"""
    try:
        payload = jwt.decode(refresh_token, CFG.auth.secret_key, [CFG.auth.algorithm])
        payload = token_schema.RefreshTokenPayload(**payload)
        if payload.typ != "refresh":
            raise auth_error.InvalidRefreshTokenError  # token 类型不正确
        return payload
    except jwt.ExpiredSignatureError:
        raise auth_error.ExpiredRefreshTokenError  # 刷新令牌过期
    except jwt.exceptions.InvalidTokenError or ValidationError:
        raise auth_error.InvalidRefreshTokenError  # 刷新令牌无效


async def authenticate_refresh_token(
    payload: Annotated[
        token_schema.RefreshTokenPayload, Depends(_decode_refresh_token)
    ],
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> token_schema.RefreshTokenPayload:
    """验证刷新令牌"""
    # 设置 user_id 到 ContextVar
    context.user_id_ctx.set(str(payload.sub))

    # 验证刷新令牌是否在数据库中且未撤销
    token_record = await token_repo.get_by_jti(
        db_session, payload.jti, int(payload.sub)
    )

    if not token_record:  # 刷新令牌不存在
        raise auth_error.InvalidRefreshTokenError

    yn, expires_at = token_record
    if not yn:  # 刷新令牌已被撤销
        raise auth_error.InvalidRefreshTokenError

    if datetime.now() > expires_at:
        raise auth_error.ExpiredRefreshTokenError  # 刷新令牌过期

    return payload
