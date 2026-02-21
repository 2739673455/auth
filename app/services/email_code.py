"""邮箱验证码服务"""

import random
import string
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import user as user_error
from app.repositories import email_code as email_code_repo


def _generate_code(length: int = 6) -> str:
    """生成随机数字验证码"""
    return "".join(random.choices(string.digits, k=length))


async def create_email_code(
    db_session: AsyncSession, email: str, code_type: str, expire_minutes: int = 10
) -> str:
    """创建邮箱验证码"""
    code = _generate_code()
    expire_at = datetime.now() + timedelta(minutes=expire_minutes)
    await email_code_repo.create(db_session, email, code, code_type, expire_at)
    return code


async def verify_email_code(db_session, email: str, code: str, code_type: str) -> None:
    """验证邮箱验证码"""
    # 获取最新有效验证码
    email_code = await email_code_repo.get_latest(db_session, email, code_type)

    # 验证码不存在、不匹配或已过期
    if not email_code or email_code.code != code:
        raise user_error.InvalidVerifyCodeError

    # 验证成功，作废该验证码及之前的所有验证码
    await email_code_repo.revoke_all(db_session, email, code_type, email_code.create_at)
