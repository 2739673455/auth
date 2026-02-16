"""刷新令牌数据访问"""

from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.entities.auth import RefreshToken


async def create(
    db_session: AsyncSession, jti: str, user_id: int, expires_at: datetime
) -> RefreshToken:
    """数据库中创建刷新令牌"""
    refresh_token = RefreshToken(jti=jti, user_id=user_id, expires_at=expires_at)
    db_session.add(refresh_token)
    await db_session.commit()
    await db_session.refresh(refresh_token)
    return refresh_token


async def revoke(db_session: AsyncSession, jti: str, user_id: int) -> None:
    """通过 jti 和 user_id 撤销刷新令牌"""
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
    """撤销用户所有刷新令牌"""
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
    """通过 jti 和 user_id 获取刷新令牌信息"""
    stmt = select(RefreshToken.yn, RefreshToken.expires_at).where(
        RefreshToken.jti == jti, RefreshToken.user_id == user_id
    )
    result = await db_session.execute(stmt)
    token_record = result.first()
    if not token_record:
        return None
    yn, expires_at = token_record
    return bool(yn), expires_at
