"""用户数据访问"""

from typing import Literal

from pwdlib._hash import PasswordHash
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.entities.auth import Group, Scope, User

passwd_hash = PasswordHash.recommended()


async def _execute_with_options(
    db_session: AsyncSession, stmt, options: Literal["group", "scope"] | None
) -> User | None:
    """根据 options 执行查询"""
    match options:
        case "group":
            stmt = stmt.options(selectinload(User.group.and_(Group.yn == 1)))
        case "scope":
            stmt = stmt.options(
                selectinload(User.group.and_(Group.yn == 1)).selectinload(
                    Group.scope.and_(Scope.yn == 1)
                )
            )

    result = await db_session.execute(stmt)
    if options:
        return result.unique().scalar_one_or_none()
    return result.scalar_one_or_none()


async def get_by_id(
    db_session: AsyncSession,
    user_id: int,
    options: Literal["group", "scope"] | None = None,
) -> User | None:
    """通过 ID 获取用户"""
    stmt = select(User).where(User.id == user_id)
    return await _execute_with_options(db_session, stmt, options)


async def get_by_email(
    db_session: AsyncSession,
    email: str,
    options: Literal["group", "scope"] | None = None,
) -> User | None:
    """通过邮箱获取用户"""
    stmt = select(User).where(User.email == email)
    return await _execute_with_options(db_session, stmt, options)


async def create(
    db_session: AsyncSession,
    email: str,
    username: str,
    password: str,
    groups: list[Group],
) -> User:
    """创建用户 (自动 hash 密码)"""
    user = User(
        email=email,
        name=username,
        password_hash=passwd_hash.hash(password),
        group=groups,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def update_username(db_session: AsyncSession, user: User, username: str) -> None:
    """更新用户名"""
    user.name = username
    await db_session.commit()


async def update_email(db_session: AsyncSession, user: User, email: str) -> None:
    """更新邮箱"""
    user.email = email
    await db_session.commit()


async def update_password(db_session: AsyncSession, user: User, password: str) -> None:
    """更新密码"""
    user.password_hash = passwd_hash.hash(password)
    await db_session.commit()
