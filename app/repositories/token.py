"""刷新令牌数据访问"""

from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.entities.auth import RefreshToken


async def create(
    db_session: AsyncSession, jti: str, user_id: int, expires_at: datetime
) -> RefreshToken:
    """在数据库中创建新的刷新令牌记录

    Args:
        db_session: 数据库会话
        jti: JWT 唯一标识符
        user_id: 关联的用户 ID
        expires_at: 令牌过期时间

    Returns:
        创建成功的 RefreshToken 对象
    """
    refresh_token = RefreshToken(jti=jti, user_id=user_id, expires_at=expires_at)
    db_session.add(refresh_token)
    await db_session.commit()
    await db_session.refresh(refresh_token)
    return refresh_token


async def revoke(db_session: AsyncSession, jti: str, user_id: int) -> None:
    """撤销指定的刷新令牌（软删除）

    将令牌的 yn 字段设置为 0，表示已撤销

    Args:
        db_session: 数据库会话
        jti: JWT 唯一标识符
        user_id: 关联的用户 ID（用于验证令牌归属）
    """
    stmt = (
        update(RefreshToken)
        .where(
            RefreshToken.jti == jti,
            RefreshToken.user_id == user_id,
            RefreshToken.yn == 1,
        )
        .values(yn=0)
    )
    await db_session.execute(stmt)
    await db_session.commit()


async def revoke_all(db_session: AsyncSession, user_id: int) -> None:
    """撤销用户的所有有效刷新令牌（软删除）

    通常用于用户修改密码、登出所有设备等场景

    Args:
        db_session: 数据库会话
        user_id: 要撤销所有令牌的用户 ID
    """
    stmt = (
        update(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.yn == 1,
        )
        .values(yn=0)
    )
    await db_session.execute(stmt)
    await db_session.commit()


async def get_by_jti(
    db_session: AsyncSession, jti: str, user_id: int
) -> tuple[bool, datetime] | None:
    """通过 JTI 和用户 ID 获取刷新令牌的状态信息

    Args:
        db_session: 数据库会话
        jti: JWT 唯一标识符
        user_id: 关联的用户 ID

    Returns:
        元组 (是否有效, 过期时间)，如果令牌不存在则返回 None
    """
    stmt = select(RefreshToken.yn, RefreshToken.expires_at).where(
        RefreshToken.jti == jti, RefreshToken.user_id == user_id
    )
    result = await db_session.execute(stmt)
    token_record = result.first()
    if not token_record:
        return None
    yn, expires_at = token_record
    return bool(yn), expires_at
