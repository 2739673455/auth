import sys
from pathlib import Path
from typing import AsyncGenerator
from unittest.mock import AsyncMock, patch

import asyncmy
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from app._init_db import MyInit, SQLiteInit
from app.config import CFG, MySQLCfg, SQLiteCfg
from app.entities.auth import Group, Scope
from app.main import app
from app.repositories import group as group_repo
from app.repositories import relation as relation_repo
from app.repositories import scope as scope_repo
from app.repositories import user as user_repo
from app.utils import db


class MySQLMock:
    def __init__(self, config: MySQLCfg):
        self.config = config
        self.conn_conf = {
            "host": config.host,
            "port": config.port,
            "user": config.user,
            "password": config.password,
        }
        self.db_name = f"test_{config.database}"
        self.db_url = f"mysql+asyncmy://{self.config.user}:{self.config.password}@{self.config.host}:{self.config.port}/{self.db_name}"

    async def init(self):
        """初始化数据"""
        db_init = MyInit(self.config)
        # 项目根目录
        root_dir = Path(__file__).parent.parent
        # SQL 文件
        sql_file = root_dir / "sql" / DB_DRIVER / "auth.sql"
        # 表模型输出路径
        output_path = root_dir / "app" / "entities" / f"{sql_file.stem}.py"
        # db_name, sql_file_path, output_path
        db_sql_orm = [(self.db_name, sql_file, output_path)]
        await db_init.init_db(db_sql_orm)

    async def clean(self):
        """清理数据"""
        conn = await asyncmy.connect(**self.conn_conf)
        try:
            async with conn.cursor() as cur:
                await cur.execute(f"DROP DATABASE IF EXISTS {self.db_name}")
        finally:
            conn.close()


class SQLiteMock:
    def __init__(self, config: SQLiteCfg):
        path = Path(config.database).parent
        db_name = Path(config.database).name
        self.config = config
        self.database = path / f"test_{db_name}"
        self.db_url = f"sqlite+aiosqlite:///{self.database}"

    async def init(self):
        """初始化数据"""
        db_init = SQLiteInit(self.config)
        # 项目根目录
        root_dir = Path(__file__).parent.parent
        # SQL 文件
        sql_file = root_dir / "sql" / DB_DRIVER / "auth.sql"
        # 表模型输出路径
        output_path = root_dir / "app" / "entities" / f"{sql_file.stem}.py"
        # db_name, sql_file_path, output_path
        db_sql_orm = [(self.database.stem, sql_file, output_path)]
        await db_init.init_db(db_sql_orm)

    async def clean(self):
        """清理数据"""
        if self.database.exists():
            self.database.unlink()


# 测试数据库配置
DB_DRIVER = CFG.db.driver
DB_CONFIG = CFG.db.configs[DB_DRIVER]
if isinstance(DB_CONFIG, MySQLCfg):
    db_mock = MySQLMock(DB_CONFIG)
elif isinstance(DB_CONFIG, SQLiteCfg):
    db_mock = SQLiteMock(DB_CONFIG)
else:
    raise ValueError(f"不支持的数据库驱动: {DB_DRIVER}")


async def _create_admin_user():
    """创建测试用的admin用户"""
    async for db_session in db.get_db("test_auth", db_mock.db_url, DB_DRIVER)():
        # 检查是否存在权限为 *
        all_scope = await scope_repo.get_by_name(db_session, "*")

        # 如果不存在则创建管理员用户和管理员组，并赋予 * 权限
        if not all_scope:
            all_scope = Scope(name="*", description="全部权限")
            db_session.add(all_scope)
            await db_session.flush()

        # 创建或覆盖组
        admin_group = await group_repo.get_by_name_with_scope(db_session, "admin")
        if not admin_group:
            admin_group = Group(name="admin", scope=[all_scope])
            db_session.add(admin_group)
            await db_session.flush()
        elif all_scope not in admin_group.scope:
            admin_group.scope.append(all_scope)
            await db_session.flush()

        # 创建或更新用户
        admin_user = await user_repo.get_by_email_with_group(
            db_session, CFG.admin.email
        )
        if not admin_user:
            admin_user = await user_repo.create(
                db_session,
                email=CFG.admin.email,
                username=CFG.admin.username,
                password=CFG.admin.password,
            )
            await relation_repo.add_user_group(
                db_session, [(admin_user.id, admin_group.id)]
            )
        elif admin_group not in admin_user.group:
            admin_user.name = CFG.admin.username
            admin_user.password_hash = user_repo.passwd_hash.hash(CFG.admin.password)
            await relation_repo.add_user_group(
                db_session, [(admin_user.id, admin_group.id)]
            )

        await db_session.commit()


@pytest.fixture(scope="session", autouse=True)
async def setup_test_database():
    """创建测试数据库并初始化表结构"""
    await db_mock.init()
    await _create_admin_user()
    yield
    await db_mock.clean()


@pytest_asyncio.fixture
async def override_get_db() -> AsyncGenerator[None, None]:
    """覆盖数据库依赖以使用测试数据库"""
    await db.close_all()
    test_get_auth_db = db.get_db("test_auth", db_mock.db_url, DB_DRIVER)
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
