"""邮箱验证码服务"""

import random
import string

from app.exceptions import user as user_error
from app.repositories import email_code as email_code_repo


async def create_email_code(email: str, code_type: str, expire_seconds: int) -> str:
    """创建邮箱验证码"""
    # 生成6位数字随机验证码
    code = "".join(random.choices(string.digits, k=6))
    # 存储验证码
    await email_code_repo.create(email, code_type, code, expire_seconds)
    return code


async def verify_email_code(email: str, code_type: str, code: str) -> None:
    """验证邮箱验证码"""
    # 获取存储的验证码
    stored_code = await email_code_repo.get(email, code_type)
    # 验证码不存在、不匹配或已过期
    if not stored_code or stored_code != code:
        raise user_error.InvalidVerifyCodeError
    # 验证成功，作废该验证码
    await email_code_repo.remove(email, code_type)
