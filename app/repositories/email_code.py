"""邮箱验证码数据访问"""

from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.entities.auth import EmailCode


async def create(
    db_session: AsyncSession,
    email: str,
    code: str,
    code_type: str,
    expire_at: datetime,
) -> EmailCode:
    """创建验证码"""
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


async def verify(
    db_session: AsyncSession,
    email: str,
    code: str,
    code_type: str,
) -> bool:
    """验证验证码"""
    stmt = select(EmailCode).where(
        and_(
            EmailCode.email == email,
            EmailCode.code == code,
            EmailCode.type == code_type,
            EmailCode.used == 0,
            EmailCode.expire_at > datetime.now(),
        )
    )
    result = await db_session.execute(stmt)
    email_code = result.scalar_one_or_none()

    if not email_code:
        return False

    # 标记为已使用
    email_code.used = 1
    await db_session.commit()
    return True
