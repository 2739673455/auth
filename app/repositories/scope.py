"""权限数据访问"""

from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.entities.auth import Group, Scope, User


async def get_by_name(
    db_session: AsyncSession,
    name: str,
    options: Literal["group", "group_user"] | None = None,
) -> Scope | None:
    """通过名称获取权限

    Args:
        db_session: 数据库会话
        name: 权限名称
        options: 预加载选项
            - "group": 预加载关联的组
            - "group_user": 预加载关联的组及组内用户
    """
    stmt = select(Scope).where(Scope.name == name)

    match options:
        case "group":
            stmt = stmt.options(selectinload(Scope.group.and_(Group.yn == 1)))
        case "group_user":
            stmt = stmt.options(
                selectinload(Scope.group.and_(Group.yn == 1)).selectinload(
                    Group.user.and_(User.yn == 1)
                )
            )

    result = await db_session.execute(stmt)
    if options:
        return result.unique().scalar_one_or_none()
    return result.scalar_one_or_none()
