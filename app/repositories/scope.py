"""权限数据访问"""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.entities.auth import Group, Scope


async def _execute_with_group(db_session: AsyncSession, stmt) -> Scope | None:
    """预加载 group 关联数据"""
    stmt = stmt.options(selectinload(Scope.group))
    result = await db_session.execute(stmt)
    return result.unique().scalar_one_or_none()


async def _execute_with_group_user(db_session: AsyncSession, stmt) -> Scope | None:
    """预加载 group 和 user 关联数据"""
    stmt = stmt.options(selectinload(Scope.group).selectinload(Group.user))
    result = await db_session.execute(stmt)
    return result.unique().scalar_one_or_none()


async def get_by_id(db_session: AsyncSession, scope_id: int) -> Scope | None:
    """通过 ID 获取权限

    Args:
        db_session: 数据库会话
        scope_id: 权限 ID

    Returns:
        权限对象，不存在则返回 None
    """
    stmt = select(Scope).where(Scope.id == scope_id)
    result = await db_session.execute(stmt)
    return result.scalar_one_or_none()


async def get_by_id_with_group(db_session: AsyncSession, scope_id: int) -> Scope | None:
    """通过 ID 获取权限（预加载组）

    Args:
        db_session: 数据库会话
        scope_id: 权限 ID

    Returns:
        权限对象，不存在则返回 None
    """
    stmt = select(Scope).where(Scope.id == scope_id)
    return await _execute_with_group(db_session, stmt)


async def get_by_id_with_group_user(
    db_session: AsyncSession, scope_id: int
) -> Scope | None:
    """通过 ID 获取权限（预加载组及组内用户）

    Args:
        db_session: 数据库会话
        scope_id: 权限 ID

    Returns:
        权限对象，不存在则返回 None
    """
    stmt = select(Scope).where(Scope.id == scope_id)
    return await _execute_with_group_user(db_session, stmt)


async def get_by_name(db_session: AsyncSession, name: str) -> Scope | None:
    """通过名称获取权限

    Args:
        db_session: 数据库会话
        name: 权限名称

    Returns:
        权限对象，不存在则返回 None
    """
    stmt = select(Scope).where(Scope.name == name)
    result = await db_session.execute(stmt)
    return result.scalar_one_or_none()


async def get_by_name_with_group(db_session: AsyncSession, name: str) -> Scope | None:
    """通过名称获取权限（预加载组）

    Args:
        db_session: 数据库会话
        name: 权限名称

    Returns:
        权限对象，不存在则返回 None
    """
    stmt = select(Scope).where(Scope.name == name)
    return await _execute_with_group(db_session, stmt)


async def get_by_name_with_group_user(
    db_session: AsyncSession, name: str
) -> Scope | None:
    """通过名称获取权限（预加载组及组内用户）

    Args:
        db_session: 数据库会话
        name: 权限名称

    Returns:
        权限对象，不存在则返回 None
    """
    stmt = select(Scope).where(Scope.name == name)
    return await _execute_with_group_user(db_session, stmt)


async def get_by_ids(
    db_session: AsyncSession,
    scope_ids: list[int],
) -> list[Scope]:
    """通过权限 ID 列表批量获取权限

    Args:
        db_session: 数据库会话
        scope_ids: 权限 ID 列表

    Returns:
        权限对象列表（只返回存在的权限）
    """
    if not scope_ids:
        return []
    stmt = select(Scope).where(Scope.id.in_(scope_ids))
    result = await db_session.execute(stmt)
    scopes = result.scalars().all()
    return list(scopes)


async def create(
    db_session: AsyncSession, name: str, description: str | None = None
) -> Scope:
    """创建新权限

    Args:
        db_session: 数据库会话
        name: 权限名称
        description: 权限描述，可选

    Returns:
        创建成功的权限对象
    """
    scope = Scope(name=name, description=description)
    db_session.add(scope)
    await db_session.commit()
    await db_session.refresh(scope)
    return scope


async def update(
    db_session: AsyncSession,
    scope: Scope,
    name: str | None = None,
    description: str | None = None,
    yn: int | None = None,
) -> None:
    """更新权限信息

    只更新传入的非 None 字段

    Args:
        db_session: 数据库会话
        scope: 要更新的权限对象
        name: 新权限名，为 None 则不更新
        description: 新描述，为 None 则不更新
        yn: 启用状态（1-启用，0-禁用），为 None 则不更新
    """
    if name is not None:
        scope.name = name
    if description is not None:
        scope.description = description
    if yn is not None:
        scope.yn = yn
    await db_session.commit()


async def remove(db_session: AsyncSession, scope_id: int) -> None:
    """删除指定 ID 的权限

    Args:
        db_session: 数据库会话
        scope_id: 要删除的权限 ID
    """
    stmt = delete(Scope).where(Scope.id == scope_id)
    await db_session.execute(stmt)
    await db_session.commit()


async def ls(
    db_session: AsyncSession, offset: int, limit: int, keyword: str | None = None
) -> tuple[list[Scope], int]:
    """获取权限列表（支持分页和搜索）

    Args:
        db_session: 数据库会话
        offset: 分页偏移量，从 0 开始
        limit: 每页返回数量
        keyword: 搜索关键字，会匹配权限名和描述，为 None 则不搜索

    Returns:
        元组 (权限列表, 总数)
    """
    # 构建基础查询
    base_stmt = select(Scope)
    count_stmt = select(func.count()).select_from(Scope)

    # 添加搜索条件
    if keyword:
        filter_cond = (Scope.name.contains(keyword)) | (
            Scope.description.contains(keyword)
        )
        base_stmt = base_stmt.where(filter_cond)
        count_stmt = count_stmt.where(filter_cond)

    # 执行查询
    stmt = base_stmt.offset(offset).limit(limit).order_by(Scope.id.desc())
    result = await db_session.execute(stmt)
    scopes = result.scalars().all()

    # 获取总数
    total_result = await db_session.execute(count_stmt)
    total = total_result.scalar() or 0

    return list(scopes), total
