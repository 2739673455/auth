"""用户数据访问"""

from pwdlib._hash import PasswordHash
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.entities.auth import Group, User

passwd_hash = PasswordHash.recommended()


async def _execute_with_group(db_session: AsyncSession, stmt) -> User | None:
    """预加载 group 关联数据"""
    stmt = stmt.options(selectinload(User.group))
    result = await db_session.execute(stmt)
    return result.scalar_one_or_none()


async def _execute_with_group_scope(db_session: AsyncSession, stmt) -> User | None:
    """预加载 group 和 scope 关联数据"""
    stmt = stmt.options(selectinload(User.group).selectinload(Group.scope))
    result = await db_session.execute(stmt)
    return result.unique().scalar_one_or_none()


async def get_by_id(db_session: AsyncSession, user_id: int) -> User | None:
    """通过 ID 获取用户

    Args:
        db_session: 数据库会话
        user_id: 用户 ID

    Returns:
        用户对象，不存在则返回 None
    """
    stmt = select(User).where(User.id == user_id)
    result = await db_session.execute(stmt)
    return result.scalar_one_or_none()


async def get_by_id_with_group(db_session: AsyncSession, user_id: int) -> User | None:
    """通过 ID 获取用户（预加载组）

    Args:
        db_session: 数据库会话
        user_id: 用户 ID

    Returns:
        用户对象，不存在则返回 None
    """
    stmt = select(User).where(User.id == user_id)
    return await _execute_with_group(db_session, stmt)


async def get_by_id_with_group_scope(
    db_session: AsyncSession, user_id: int
) -> User | None:
    """通过 ID 获取用户（预加载组和权限）

    Args:
        db_session: 数据库会话
        user_id: 用户 ID

    Returns:
        用户对象，不存在则返回 None
    """
    stmt = select(User).where(User.id == user_id)
    return await _execute_with_group_scope(db_session, stmt)


async def get_by_email(db_session: AsyncSession, email: str) -> User | None:
    """通过邮箱获取用户

    Args:
        db_session: 数据库会话
        email: 用户邮箱地址

    Returns:
        用户对象，不存在则返回 None
    """
    stmt = select(User).where(User.email == email)
    result = await db_session.execute(stmt)
    return result.scalar_one_or_none()


async def get_by_email_with_group(db_session: AsyncSession, email: str) -> User | None:
    """通过邮箱获取用户（预加载组）

    Args:
        db_session: 数据库会话
        email: 用户邮箱地址

    Returns:
        用户对象，不存在则返回 None
    """
    stmt = select(User).where(User.email == email)
    return await _execute_with_group(db_session, stmt)


async def get_by_email_with_group_scope(
    db_session: AsyncSession, email: str
) -> User | None:
    """通过邮箱获取用户（预加载组和权限）

    Args:
        db_session: 数据库会话
        email: 用户邮箱地址

    Returns:
        用户对象，不存在则返回 None
    """
    stmt = select(User).where(User.email == email)
    return await _execute_with_group_scope(db_session, stmt)


async def get_by_ids(
    db_session: AsyncSession,
    user_ids: list[int],
) -> list[User]:
    """通过用户 ID 列表批量获取用户

    Args:
        db_session: 数据库会话
        user_ids: 用户 ID 列表

    Returns:
        用户对象列表（只返回存在的用户）
    """
    if not user_ids:
        return []
    stmt = select(User).where(User.id.in_(user_ids))
    result = await db_session.execute(stmt)
    users = result.scalars().all()
    return list(users)


async def create(
    db_session: AsyncSession,
    email: str,
    username: str,
    password: str,
) -> User:
    """创建新用户（自动对密码进行 hash 处理）

    Args:
        db_session: 数据库会话
        email: 用户邮箱地址
        username: 用户名
        password: 原始密码（会被自动 hash）

    Returns:
        创建成功的用户对象
    """
    user = User(
        email=email,
        name=username,
        password_hash=passwd_hash.hash(password),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def update(
    db_session: AsyncSession,
    user: User,
    email: str | None = None,
    username: str | None = None,
    password: str | None = None,
    yn: int | None = None,
) -> None:
    """更新用户信息

    只更新传入的非 None 字段

    Args:
        db_session: 数据库会话
        user: 要更新的用户对象
        email: 新邮箱地址，为 None 则不更新
        username: 新用户名，为 None 则不更新
        password: 新密码，为 None 则不更新（会被自动 hash）
        yn: 启用状态（1-启用，0-禁用），为 None 则不更新
    """
    if email is not None:
        user.email = email
    if username is not None:
        user.name = username
    if password is not None:
        user.password_hash = passwd_hash.hash(password)
    if yn is not None:
        user.yn = yn
    await db_session.commit()


async def remove(db_session: AsyncSession, user_id: int) -> None:
    """删除指定 ID 的用户

    Args:
        db_session: 数据库会话
        user_id: 要删除的用户 ID
    """
    stmt = delete(User).where(User.id == user_id)
    await db_session.execute(stmt)
    await db_session.commit()


async def ls(
    db_session: AsyncSession, offset: int, limit: int, keyword: str | None = None
) -> tuple[list[User], int]:
    """获取用户列表（支持分页和搜索）

    Args:
        db_session: 数据库会话
        offset: 分页偏移量，从 0 开始
        limit: 每页返回数量
        keyword: 搜索关键字，会匹配用户名和邮箱，为 None 则不搜索

    Returns:
        元组 (用户列表, 总数)
    """
    # 构建基础查询
    base_stmt = select(User)
    count_stmt = select(func.count()).select_from(User)

    # 添加搜索条件
    if keyword:
        filter_cond = (User.name.contains(keyword)) | (User.email.contains(keyword))
        base_stmt = base_stmt.where(filter_cond)
        count_stmt = count_stmt.where(filter_cond)

    # 执行查询
    stmt = base_stmt.offset(offset).limit(limit).order_by(User.id.desc())
    result = await db_session.execute(stmt)
    users = result.scalars().all()

    # 获取总数
    total_result = await db_session.execute(count_stmt)
    total = total_result.scalar() or 0

    return list(users), total
