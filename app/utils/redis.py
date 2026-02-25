"""Redis 工具"""

import redis.asyncio as redis

from app.config import CFG

_redis_client: redis.Redis | None = None


async def get() -> redis.Redis:
    """获取 Redis 客户端单例"""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=CFG.redis.host,
            port=CFG.redis.port,
            password=CFG.redis.password or None,
            db=CFG.redis.db,
            decode_responses=True,
        )
    return _redis_client


async def close() -> None:
    """关闭 Redis 连接"""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None
