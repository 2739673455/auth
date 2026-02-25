"""邮箱验证码数据访问"""

from app.utils import redis as redis_util


async def create(email: str, code_type: str, code: str, expire_seconds: int) -> None:
    """创建验证码

    Redis Key: email_code:{email}:{type}

    Args:
        email: 邮箱地址
        code_type: 验证码类型
        code: 验证码
        expire_seconds: 过期秒数
    """
    r = await redis_util.get()
    key = f"email_code:{email}:{code_type}"
    # 存储邮箱验证码
    await r.setex(key, expire_seconds, code)


async def get(email: str, code_type: str) -> str | None:
    """获取该邮箱该类型验证码

    Args:
        email: 邮箱地址
        code_type: 验证码类型

    Returns:
        验证码，不存在则返回 None
    """
    r = await redis_util.get()
    key = f"email_code:{email}:{code_type}"
    code = await r.get(key)
    return code


async def remove(email: str, code_type: str) -> None:
    """撤销该邮箱该类型验证码

    Args:
        email: 邮箱地址
        code_type: 验证码类型
    """
    r = await redis_util.get()
    key = f"email_code:{email}:{code_type}"
    await r.delete(key)
