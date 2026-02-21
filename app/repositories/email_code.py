"""邮箱验证码数据访问"""

from datetime import datetime

from sqlalchemy import and_, desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.entities.auth import EmailCode


async def create(
    db_session: AsyncSession,
    email: str,
    code: str,
    code_type: str,
    expire_at: datetime,
) -> EmailCode:
    """创建验证码

    Args:
        db_session: 数据库会话
        email: 邮箱地址
        code: 验证码
        code_type: 验证码类型
        expire_at: 过期时间

    Returns:
        创建的验证码记录
    """
    email_code = EmailCode(
        email=email,
        code=code,
        type=code_type,
        expire_at=expire_at,
    )
    db_session.add(email_code)
    await db_session.commit()
    await db_session.refresh(email_code)
    return email_code


async def get_latest(
    db_session: AsyncSession, email: str, code_type: str
) -> EmailCode | None:
    """获取该邮箱该类型最新的未使用且未过期的验证码

    Args:
        db_session: 数据库会话
        email: 邮箱地址
        code_type: 验证码类型

    Returns:
        最新的有效验证码，不存在则返回 None
    """
    stmt = (
        select(EmailCode)
        .where(
            and_(
                EmailCode.email == email,
                EmailCode.type == code_type,
                EmailCode.used == 0,
                EmailCode.expire_at > datetime.now(),
            )
        )
        .order_by(desc(EmailCode.create_at))
        .limit(1)
    )
    result = await db_session.execute(stmt)
    return result.scalar_one_or_none()


async def revoke_all(
    db_session: AsyncSession, email: str, code_type: str, before: datetime
) -> None:
    """撤销该邮箱该类型下指定时间之前所有未使用的验证码

    Args:
        db_session: 数据库会话
        email: 邮箱地址
        code_type: 验证码类型
        before: 作废该时间戳之前（含）创建的所有验证码
    """
    stmt = (
        update(EmailCode)
        .where(
            and_(
                EmailCode.email == email,
                EmailCode.type == code_type,
                EmailCode.used == 0,
                EmailCode.create_at <= before,
            )
        )
        .values(used=1)
    )
    await db_session.execute(stmt)
    await db_session.commit()
