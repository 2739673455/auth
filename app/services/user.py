"""用户管理"""

from typing import Literal

from fastapi import Response
from pwdlib._hash import PasswordHash
from sqlalchemy.ext.asyncio import AsyncSession

from app.entities.auth import Group, User
from app.exceptions import user as user_error
from app.repositories import user as user_repo
from app.services import token as token_service

passwd_hash = PasswordHash.recommended()
HASHED_DUMMY_PASSWORD = passwd_hash.hash("dummy_password")


def verify_password(user: User, password: str) -> None:
    """验证密码"""
    # 使用 dummy_password 避免时序攻击
    target_hash = user.password_hash if user else HASHED_DUMMY_PASSWORD
    password_correct = passwd_hash.verify(password, target_hash)
    if not password_correct:
        raise user_error.InvalidCredentialsError  # 邮箱或密码错误


async def verify_email_not_used(db_session: AsyncSession, email: str) -> None:
    """验证邮箱未被使用"""
    if await user_repo.get_by_email(db_session, email):
        raise user_error.EmailAlreadyExistsError  # 邮箱已被使用


async def verify_email_exist(db: AsyncSession, email: str) -> None:
    """验证邮箱存在"""
    if not await user_repo.get_by_email(db, email):
        raise user_error.EmailNotFoundError  # 邮箱不存在


async def add_user_in_db(
    db_session: AsyncSession,
    email: str,
    username: str,
    password: str,
    groups: list[Group],
) -> User:
    """将用户加入数据库"""
    return await user_repo.create(db_session, email, username, password, groups)


def _flatten_groups_scopes(
    user: User, options: Literal["group", "scope"] | None
) -> tuple[list[str], list[str]]:
    """展平组信息和权限信息"""
    match options:
        case "group":
            groups = [g.name for g in user.group]
            return groups, []
        case "scope":
            groups = [g.name for g in user.group]
            scopes = list(set([s.name for g in user.group for s in g.scope]))
            return groups, scopes
        case _:
            return [], []


async def get_user_by_id(
    db_session: AsyncSession,
    user_id: int,
    options: Literal["group", "scope"] | None = None,
) -> tuple[User, list[str], list[str]]:
    """通过 user_id 获取用户信息，可附带组信息和权限范围信息"""
    user = await user_repo.get_by_id(db_session, user_id, options)
    if not user:
        raise user_error.UserNotFoundError  # 用户不存在
    elif not user.yn:
        raise user_error.UserDisabledError  # 用户已被禁用
    groups, scopes = _flatten_groups_scopes(user, options)
    return user, groups, scopes


async def get_user_by_email(
    db_session: AsyncSession,
    email: str,
    options: Literal["group", "scope"] | None = None,
) -> tuple[User, list[str], list[str]]:
    """通过 email 获取用户信息，可附带组信息和权限范围信息"""
    user = await user_repo.get_by_email(db_session, email, options)
    if not user:
        raise user_error.UserNotFoundError  # 用户不存在
    elif not user.yn:
        raise user_error.UserDisabledError  # 用户已被禁用
    groups, scopes = _flatten_groups_scopes(user, options)
    return user, groups, scopes


async def update_username(
    db_session: AsyncSession, user_id: int, user_name: str
) -> None:
    """修改用户名"""
    user = await user_repo.get_by_id(db_session, user_id)
    if not user:
        raise user_error.UserNotFoundError
    if user.name == user_name:
        raise user_error.UserNameSameError  # 用户名与原用户名相同
    await user_repo.update_username(db_session, user, user_name)


async def update_email(db_session: AsyncSession, user_id: int, email: str) -> None:
    """修改邮箱"""
    user = await user_repo.get_by_id(db_session, user_id)
    if not user:
        raise user_error.UserNotFoundError
    if user.email == email:
        raise user_error.UserEmailSameError  # 邮箱与原邮箱相同
    # 检查邮箱是否已被使用
    if await user_repo.get_by_email(db_session, email):
        raise user_error.EmailAlreadyExistsError  # 邮箱已被使用
    await user_repo.update_email(db_session, user, email)


async def update_password(
    db_session: AsyncSession, user_id: int, password: str
) -> None:
    """修改密码"""
    user = await user_repo.get_by_id(db_session, user_id)
    if not user:
        raise user_error.UserNotFoundError
    if passwd_hash.verify(password, user.password_hash):
        raise user_error.UserPasswordSameError  # 密码与原密码相同
    await user_repo.update_password(db_session, user, password)


async def login_by_user_id(db_session: AsyncSession, user_id: int, response: Response):
    """通过 user_id 登录，返回用户信息和令牌"""
    # 获取用户信息，包含权限信息
    user, _, scopes = await get_user_by_id(db_session, user_id, options="scope")
    # 创建访问令牌和刷新令牌
    tokens = await token_service.create_token(db_session, user.id, scopes)
    # 在 Cookie 中设置 refresh_token
    response.set_cookie(
        key="refresh_token",  # Cookie 名称，用于存储刷新令牌
        value=tokens["refresh_token"],  # 从 JWT 创建的刷新令牌值
        httponly=True,  # 防止 JavaScript 访问 Cookie
        secure=False,  # 在 HTTP 和 HTTPS 下都可以发送
        samesite="lax",  # 防止 CSRF 攻击，允许跨站 GET 请求时发送 Cookie
    )
    return user, tokens
