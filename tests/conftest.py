import sys
from pathlib import Path
from typing import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import CFG
from app.init_db import prepare
from app.main import app, create_admin_user
from app.utils import db


class DBMock:
    def __init__(self):
        db_init, db_sql_orm = prepare()
        db_sql_orm = [(f"test_{db_name}", i, j) for db_name, i, j in db_sql_orm]
        db_name, _, _ = next(iter(db_sql_orm))

        self.db_init = db_init
        self.db_sql_orm = db_sql_orm
        self.db_name = db_name
        self.db_url = db_init.get_async_db_url(self.db_name)

    async def init(self):
        await self.db_init.init_db(self.db_sql_orm)

    async def clean(self):
        for db_name, _, _ in self.db_sql_orm:
            await self.db_init.delete_db(db_name)


db_mock = DBMock()


@pytest.fixture(scope="session", autouse=True)
async def setup_test_database():
    """创建测试数据库并初始化表结构"""
    await db_mock.init()

    async for db_session in db.get_db(db_mock.db_name, db_mock.db_url, CFG.db.driver)():
        await create_admin_user(db_session)

    yield

    await db_mock.clean()


@pytest_asyncio.fixture
async def override_get_db() -> AsyncGenerator[None, None]:
    """覆盖数据库依赖以使用测试数据库"""
    await db.close_all()
    test_get_auth_db = db.get_db(db_mock.db_name, db_mock.db_url, CFG.db.driver)
    app.dependency_overrides[db.get_auth_db] = test_get_auth_db

    yield

    app.dependency_overrides.clear()
    await db.close_all()


@pytest_asyncio.fixture
async def async_test_client(override_get_db) -> AsyncGenerator[AsyncClient, None]:
    """创建异步测试客户端"""
    with patch("app.services.email.send_verification_code", new_callable=AsyncMock):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            yield ac
