"""令牌服务"""

import uuid
from datetime import datetime, timedelta
from typing import Annotated

import jwt
from fastapi import Cookie
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import CFG
from app.exceptions import auth as auth_error
from app.exceptions import user as user_error
from app.repositories import token as token_repo
from app.repositories import user as user_repo
from app.schemas import token as token_schema
from app.utils import context


async def create_access_token(db_session: AsyncSession, user_id: int) -> str:
    """创建并存储访问令牌"""
    # 生成访问令牌
    jti = str(uuid.uuid4())  # JWT ID
    expire_seconds = CFG.auth.access_token_expire_days * 24 * 60 * 60
    expire = datetime.now() + timedelta(seconds=expire_seconds)  # 过期时间
    payload = {
        "sub": str(user_id),
        "exp": expire.timestamp(),
        "jti": jti,
    }
    token = jwt.encode(payload, CFG.auth.secret_key, CFG.auth.algorithm)

    # 查询用户权限
    user = await user_repo.get_by_id_with_group_scope(db_session, user_id)
    if not user:
        raise user_error.UserNotFoundError  # 用户不存在
    scopes = []
    seen_scope_ids = set()
    if user.group:
        for g in user.group:
            for s in g.scope:
                if s.id not in seen_scope_ids:
                    seen_scope_ids.add(s.id)
                    scopes.append(s.name)

    # 存储访问令牌
    await token_repo.create(user_id, jti, expire_seconds, scopes)

    return token


async def authenticate_access_token(
    access_token: Annotated[str, Cookie()],  # 从 Cookie 获取 access_token
) -> token_schema.AccessTokenPayload:
    """验证访问令牌"""
    # 解析访问令牌
    try:
        payload = jwt.decode(access_token, CFG.auth.secret_key, [CFG.auth.algorithm])
        payload = token_schema.AccessTokenPayload(**payload)
    except jwt.ExpiredSignatureError:
        raise auth_error.ExpiredAccessTokenError  # 访问令牌过期
    except jwt.exceptions.InvalidTokenError or ValidationError:
        raise auth_error.InvalidAccessTokenError  # 访问令牌无效

    # 设置 user_id 到 ContextVar
    context.user_id_ctx.set(str(payload.sub))

    # 验证访问令牌是否存在
    data = await token_repo.get(int(payload.sub), payload.jti)
    if data is None:
        raise auth_error.InvalidAccessTokenError  # 访问令牌不存在
    payload.scope = data["scope"]

    return payload
