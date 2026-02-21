"""关联操作"""

from sqlalchemy import delete, insert, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.entities.auth import t_group_scope_rel, t_group_user_rel


async def add_user_group(
    db_session: AsyncSession, user_group_id_tuples: list[tuple[int, int]]
) -> None:
    """批量添加用户-组关联，已存在的关联会跳过

    Args:
        db_session: 数据库会话
        user_group_id_tuples: (user_id, group_id) 元组列表
    """
    if not user_group_id_tuples:
        return
    # 去重
    unique_tuples = list(set(user_group_id_tuples))
    # 查询已存在的关联
    stmt = select(t_group_user_rel.c.user_id, t_group_user_rel.c.group_id).where(
        or_(
            *[
                (t_group_user_rel.c.user_id == user_id)
                & (t_group_user_rel.c.group_id == group_id)
                for user_id, group_id in unique_tuples
            ]
        )
    )
    result = await db_session.execute(stmt)
    existing = set(result.all())
    # 过滤掉已存在的
    to_insert = [
        {"user_id": user_id, "group_id": group_id}
        for user_id, group_id in unique_tuples
        if (user_id, group_id) not in existing
    ]
    if not to_insert:
        return
    stmt = insert(t_group_user_rel).values(to_insert)
    result = await db_session.execute(stmt)
    await db_session.commit()


async def remove_user_group(
    db_session: AsyncSession, user_group_id_tuples: list[tuple[int, int]]
) -> None:
    """批量移除用户-组关联，不存在的关联会跳过

    Args:
        db_session: 数据库会话
        user_group_id_tuples: (user_id, group_id) 元组列表
    """
    if not user_group_id_tuples:
        return
    # 去重
    unique_tuples = list(set(user_group_id_tuples))
    # 查询存在的关联
    stmt = select(t_group_user_rel.c.user_id, t_group_user_rel.c.group_id).where(
        or_(
            *[
                (t_group_user_rel.c.user_id == user_id)
                & (t_group_user_rel.c.group_id == group_id)
                for user_id, group_id in unique_tuples
            ]
        )
    )
    result = await db_session.execute(stmt)
    existing = set(result.all())
    # 过滤掉不存在的
    to_delete = [
        (user_id, group_id)
        for user_id, group_id in unique_tuples
        if (user_id, group_id) in existing
    ]
    if not to_delete:
        return
    # 删除存在的关联
    conditions = [
        (t_group_user_rel.c.user_id == user_id)
        & (t_group_user_rel.c.group_id == group_id)
        for user_id, group_id in to_delete
    ]
    stmt = delete(t_group_user_rel).where(or_(*conditions))
    await db_session.execute(stmt)
    await db_session.commit()


async def add_group_scope(
    db_session: AsyncSession, group_scope_id_tuples: list[tuple[int, int]]
) -> None:
    """批量添加组-权限关联，已存在的关联会跳过

    Args:
        db_session: 数据库会话
        group_scope_id_tuples: (group_id, scope_id) 元组列表
    """
    if not group_scope_id_tuples:
        return
    # 去重
    unique_tuples = list(set(group_scope_id_tuples))
    # 查询已存在的关联
    stmt = select(t_group_scope_rel.c.group_id, t_group_scope_rel.c.scope_id).where(
        or_(
            *[
                (t_group_scope_rel.c.group_id == group_id)
                & (t_group_scope_rel.c.scope_id == scope_id)
                for group_id, scope_id in unique_tuples
            ]
        )
    )
    result = await db_session.execute(stmt)
    existing = set(result.all())
    # 过滤掉已存在的
    to_insert = [
        {"group_id": group_id, "scope_id": scope_id}
        for group_id, scope_id in unique_tuples
        if (group_id, scope_id) not in existing
    ]
    if not to_insert:
        return
    stmt = insert(t_group_scope_rel).values(to_insert)
    result = await db_session.execute(stmt)
    await db_session.commit()


async def remove_group_scope(
    db_session: AsyncSession, group_scope_id_tuples: list[tuple[int, int]]
) -> None:
    """批量移除组-权限关联，不存在的关联会跳过

    Args:
        db_session: 数据库会话
        group_scope_id_tuples: (group_id, scope_id) 元组列表
    """
    if not group_scope_id_tuples:
        return
    # 去重
    unique_tuples = list(set(group_scope_id_tuples))
    # 查询存在的关联
    stmt = select(t_group_scope_rel.c.group_id, t_group_scope_rel.c.scope_id).where(
        or_(
            *[
                (t_group_scope_rel.c.group_id == group_id)
                & (t_group_scope_rel.c.scope_id == scope_id)
                for group_id, scope_id in unique_tuples
            ]
        )
    )
    result = await db_session.execute(stmt)
    existing = set(result.all())
    # 过滤掉不存在的
    to_delete = [
        (group_id, scope_id)
        for group_id, scope_id in unique_tuples
        if (group_id, scope_id) in existing
    ]
    if not to_delete:
        return
    # 删除存在的关联
    conditions = [
        (t_group_scope_rel.c.group_id == group_id)
        & (t_group_scope_rel.c.scope_id == scope_id)
        for group_id, scope_id in to_delete
    ]
    stmt = delete(t_group_scope_rel).where(or_(*conditions))
    await db_session.execute(stmt)
    await db_session.commit()
