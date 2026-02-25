"""访问令牌数据访问

使用 Redis 存储访问令牌权限，并通过 Sorted Set 维护令牌索引以支持批量操作。

Redis Key 设计:
    - access_token:{user_id}:{jti} - 存储令牌权限（String，带 TTL）
    - access_tokens:{user_id} - 令牌索引（Sorted Set，分数为过期时间戳）
"""

import json
import time

from app.utils import redis as redis_util

TOKEN_KEY = "access_token:{user_id}:{jti}"
INDEX_KEY = "access_tokens:{user_id}"


async def create(
    user_id: int, jti: str, expire_seconds: int, scopes: list[str]
) -> None:
    """创建访问令牌

    在 Redis 中存储令牌权限，并将 jti 添加到 Sorted Set 索引。

    Args:
        user_id: 关联的用户 ID
        jti: JWT 唯一标识符
        expire_seconds: 过期秒数
        scopes: 权限列表
    """
    r = await redis_util.get()
    token_key = TOKEN_KEY.format(user_id=user_id, jti=jti)

    # 存储信息
    data = {"scope": scopes}
    await r.setex(token_key, expire_seconds, json.dumps(data))

    # 将 jti 添加到 Sorted Set，分数为过期时间戳
    expire_timestamp = int(time.time()) + expire_seconds
    await r.zadd(INDEX_KEY.format(user_id=user_id), {jti: expire_timestamp})


async def update(user_id: int, jti: str, scopes: list[str]) -> None:
    """更新单个访问令牌权限

    保留原有过期时间，仅更新权限内容。

    Args:
        user_id: 关联的用户 ID
        jti: JWT 唯一标识符
        scopes: 新的权限列表
    """
    r = await redis_util.get()
    token_key = TOKEN_KEY.format(user_id=user_id, jti=jti)

    # 存储信息
    data = {"scope": scopes}
    await r.set(token_key, json.dumps(data), keepttl=True)


async def update_all(user_id: int, scopes: list[str]) -> None:
    """更新用户所有有效令牌的权限

    先清理索引中已过期的令牌，再更新所有有效令牌的权限。

    Args:
        user_id: 关联的用户 ID
        scopes: 新的权限列表
    """
    r = await redis_util.get()
    index_key = INDEX_KEY.format(user_id=user_id)
    now = int(time.time())

    # 清理已过期的令牌索引
    await r.zremrangebyscore(index_key, "-inf", now)

    # 获取所有未过期的 jti
    jtis = await r.zrange(index_key, 0, -1)

    if jtis:
        # 更新每个令牌的权限
        for jti in jtis:
            token_key = TOKEN_KEY.format(user_id=user_id, jti=jti)
            data = {"scope": scopes}
            await r.set(token_key, json.dumps(data), keepttl=True)


async def revoke(user_id: int, jti: str) -> None:
    """撤销指定的访问令牌

    删除令牌数据并从索引中移除。

    Args:
        user_id: 关联的用户 ID
        jti: JWT 唯一标识符
    """
    r = await redis_util.get()
    token_key = TOKEN_KEY.format(user_id=user_id, jti=jti)
    # 检查令牌是否存在
    data = await r.get(token_key)
    if data:
        # 删除令牌
        await r.delete(token_key)
        # 从索引中移除
        await r.zrem(INDEX_KEY.format(user_id=user_id), jti)


async def revoke_all(user_id: int) -> None:
    """撤销用户的所有有效访问令牌

    先清理索引中已过期的令牌，再批量删除所有有效令牌及其索引。

    Args:
        user_id: 要撤销所有令牌的用户 ID
    """
    r = await redis_util.get()
    index_key = INDEX_KEY.format(user_id=user_id)
    now = int(time.time())

    # 清理已过期的令牌索引
    await r.zremrangebyscore(index_key, "-inf", now)

    # 获取所有未过期的 jti
    jtis = await r.zrange(index_key, 0, -1)

    if jtis:
        # 构建所有 key 并批量删除，同时删除索引
        keys = [TOKEN_KEY.format(user_id=user_id, jti=jti) for jti in jtis] + [
            index_key
        ]
        await r.delete(*keys)


async def get(user_id: int, jti: str) -> dict | None:
    """获取访问令牌数据

    Args:
        user_id: 关联的用户 ID
        jti: JWT 唯一标识符

    Returns:
        令牌数据字典，如果令牌不存在则返回 None
    """
    r = await redis_util.get()
    token_key = TOKEN_KEY.format(user_id=user_id, jti=jti)
    data = await r.get(token_key)
    if data:
        return json.loads(data)
