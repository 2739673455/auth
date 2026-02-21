"""组数据访问"""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.entities.auth import Group


async def _execute_with_scope(db_session: AsyncSession, stmt) -> Group | None:
    """预加载 scope 关联数据"""
    stmt = stmt.options(selectinload(Group.scope))
    result = await db_session.execute(stmt)
    return result.unique().scalar_one_or_none()


async def _execute_with_user(db_session: AsyncSession, stmt) -> Group | None:
    """预加载 user 关联数据"""
    stmt = stmt.options(selectinload(Group.user))
    result = await db_session.execute(stmt)
    return result.unique().scalar_one_or_none()


async def _execute_with_user_scope(db_session: AsyncSession, stmt) -> Group | None:
    """预加载 user 和 scope 关联数据"""
    stmt = stmt.options(
        selectinload(Group.user),
        selectinload(Group.scope),
    )
    result = await db_session.execute(stmt)
    return result.unique().scalar_one_or_none()


async def get_by_id(db_session: AsyncSession, group_id: int) -> Group | None:
    """通过 ID 获取组

    Args:
        db_session: 数据库会话
        group_id: 组 ID

    Returns:
        组对象，不存在则返回 None
    """
    stmt = select(Group).where(Group.id == group_id)
    result = await db_session.execute(stmt)
    return result.scalar_one_or_none()


async def get_by_id_with_scope(db_session: AsyncSession, group_id: int) -> Group | None:
    """通过 ID 获取组（预加载权限）

    Args:
        db_session: 数据库会话
        group_id: 组 ID

    Returns:
        组对象，不存在则返回 None
    """
    stmt = select(Group).where(Group.id == group_id)
    return await _execute_with_scope(db_session, stmt)


async def get_by_id_with_user(db_session: AsyncSession, group_id: int) -> Group | None:
    """通过 ID 获取组（预加载用户）

    Args:
        db_session: 数据库会话
        group_id: 组 ID

    Returns:
        组对象，不存在则返回 None
    """
    stmt = select(Group).where(Group.id == group_id)
    return await _execute_with_user(db_session, stmt)


async def get_by_id_with_user_scope(
    db_session: AsyncSession, group_id: int
) -> Group | None:
    """通过 ID 获取组（预加载用户和权限）

    Args:
        db_session: 数据库会话
        group_id: 组 ID

    Returns:
        组对象，不存在则返回 None
    """
    stmt = select(Group).where(Group.id == group_id)
    return await _execute_with_user_scope(db_session, stmt)


async def get_by_name(db_session: AsyncSession, name: str) -> Group | None:
    """通过名称获取组

    Args:
        db_session: 数据库会话
        name: 组名称

    Returns:
        组对象，不存在则返回 None
    """
    stmt = select(Group).where(Group.name == name)
    result = await db_session.execute(stmt)
    return result.scalar_one_or_none()


async def get_by_name_with_scope(db_session: AsyncSession, name: str) -> Group | None:
    """通过名称获取组（预加载权限）

    Args:
        db_session: 数据库会话
        name: 组名称

    Returns:
        组对象，不存在则返回 None
    """
    stmt = select(Group).where(Group.name == name)
    return await _execute_with_scope(db_session, stmt)


async def get_by_name_with_user(db_session: AsyncSession, name: str) -> Group | None:
    """通过名称获取组（预加载用户）

    Args:
        db_session: 数据库会话
        name: 组名称

    Returns:
        组对象，不存在则返回 None
    """
    stmt = select(Group).where(Group.name == name)
    return await _execute_with_user(db_session, stmt)


async def get_by_name_with_user_scope(
    db_session: AsyncSession, name: str
) -> Group | None:
    """通过名称获取组（预加载用户和权限）

    Args:
        db_session: 数据库会话
        name: 组名称

    Returns:
        组对象，不存在则返回 None
    """
    stmt = select(Group).where(Group.name == name)
    return await _execute_with_user_scope(db_session, stmt)


async def get_by_ids(
    db_session: AsyncSession,
    group_ids: list[int],
) -> list[Group]:
    """通过组 ID 列表批量获取组

    Args:
        db_session: 数据库会话
        group_ids: 组 ID 列表

    Returns:
        组对象列表（只返回存在的组）
    """
    if not group_ids:
        return []
    stmt = select(Group).where(Group.id.in_(group_ids))
    result = await db_session.execute(stmt)
    groups = result.scalars().all()
    return list(groups)


async def create(db_session: AsyncSession, name: str) -> Group:
    """创建新组

    Args:
        db_session: 数据库会话
        name: 组名称

    Returns:
        创建成功的组对象
    """
    group = Group(name=name)
    db_session.add(group)
    await db_session.commit()
    await db_session.refresh(group)
    return group


async def update(
    db_session: AsyncSession,
    group: Group,
    name: str | None = None,
    yn: int | None = None,
) -> None:
    """更新组信息

    只更新传入的非 None 字段

    Args:
        db_session: 数据库会话
        group: 要更新的组对象
        name: 新组名，为 None 则不更新
        yn: 启用状态（1-启用，0-禁用），为 None 则不更新
    """
    if name is not None:
        group.name = name
    if yn is not None:
        group.yn = yn
    await db_session.commit()


async def remove(db_session: AsyncSession, group_id: int) -> None:
    """删除指定 ID 的组

    Args:
        db_session: 数据库会话
        group_id: 要删除的组 ID
    """
    stmt = delete(Group).where(Group.id == group_id)
    await db_session.execute(stmt)
    await db_session.commit()


async def ls(
    db_session: AsyncSession, offset: int, limit: int, keyword: str | None = None
) -> tuple[list[Group], int]:
    """获取组列表

    Returns:
        (组列表, 总数)
    """
    # 构建基础查询
    base_stmt = select(Group)
    count_stmt = select(func.count()).select_from(Group)

    # 添加搜索条件
    if keyword:
        filter_cond = Group.name.contains(keyword)
        base_stmt = base_stmt.where(filter_cond)
        count_stmt = count_stmt.where(filter_cond)

    # 执行查询
    stmt = base_stmt.offset(offset).limit(limit).order_by(Group.id.desc())
    result = await db_session.execute(stmt)
    groups = result.scalars().all()

    # 获取总数
    total_result = await db_session.execute(count_stmt)
    total = total_result.scalar() or 0

    return list(groups), total
