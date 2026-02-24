from contextlib import asynccontextmanager

import sqlalchemy.exc
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CFG
from app.entities.auth import Group, Scope
from app.exceptions.handlers import register_exception_handlers
from app.init_db import prepare
from app.middlewares import trace
from app.repositories import group as group_repo
from app.repositories import relation as relation_repo
from app.repositories import scope as scope_repo
from app.repositories import user as user_repo
from app.routers import api
from app.utils import db
from app.utils.log import logger, setup_logger


async def init_database_if_needed():
    """如果数据库不存在则自动初始化"""
    db_init, db_sql_orm = prepare()

    # 检查每个数据库是否存在，不存在则初始化
    need_init = []
    for db_name, sql_file_path, output_path in db_sql_orm:
        exists = await db_init.check_db_exists(db_name)
        if not exists:
            need_init.append((db_name, sql_file_path, output_path))
        else:
            logger.debug(f"数据库 {db_name} 已存在，跳过初始化")

    if need_init:
        await db_init.init_db(need_init)


async def create_admin_user():
    """创建管理员用户（如果不存在）"""
    try:
        admin_group = CFG.admin.group
        admin_email = CFG.admin.email
        admin_username = CFG.admin.username
        admin_password = CFG.admin.password
        async for db_session in db.get_auth_db():
            # 查找 * 权限
            all_scope = await scope_repo.get_by_name(db_session, "*")
            # 如果权限存在，则结束
            if all_scope:
                return

            # 如果权限不存在，则创建
            all_scope = Scope(name="*", description="全部权限")
            db_session.add(all_scope)
            await db_session.flush()
            logger.info("Created * scope")

            # 查找管理员组
            group = await group_repo.get_by_name_with_scope(db_session, admin_group)
            # 如果组不存在，则创建
            if not group:
                group = Group(name=admin_group, scope=[all_scope])
                db_session.add(group)
                await db_session.flush()
                logger.info("Created admin group with * scope")
            # 如果组存在但不包含 * 权限，则添加
            elif "*" not in [s.name for s in group.scope]:
                group.scope = [all_scope]
                await db_session.flush()
                logger.info("Updated admin group with * scope")

            # 查找是否存在预设的管理员用户
            user = await user_repo.get_by_email_with_group(db_session, admin_email)
            # 如果用户不存在，则创建
            if not user:
                user = await user_repo.create(
                    db_session,
                    email=admin_email,
                    username=admin_username,
                    password=admin_password,
                )
                # 将用户添加到组中
                await relation_repo.add_user_group(db_session, [(user.id, group.id)])
                logger.info(f"Created admin user: {user.email}")
            # 如果用户存在但不在组中，则修改用户名和密码为预设值，并添加到组中
            elif "admin" not in [g.name for g in user.group]:
                user.name = admin_username
                user.password_hash = user_repo.passwd_hash.hash(admin_password)
                user.group = [group]
                await db_session.commit()
                logger.info(f"Updated admin user: {user.email}")
    except sqlalchemy.exc.OperationalError as e:
        logger.exception("操作失败，请先初始化数据库")
        raise e


# 生命周期管理
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 初始化日志
    setup_logger()

    # 检查并初始化数据库（如果不存在）
    await init_database_if_needed()

    # 创建管理员用户
    await create_admin_user()

    yield

    # 关闭数据库引擎
    await db.close_all()


app = FastAPI(lifespan=lifespan)

# 日志中间件
app.middleware("http")(trace.middleware)
# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=CFG.cors_origins,  # 允许的源列表
    allow_credentials=True,  # 允许 Authorization headers, Cookies
    allow_methods=["*"],  # 允许的 HTTP 方法列表
    allow_headers=["*"],  # 允许的请求头列表
)

# 注册异常处理
register_exception_handlers(app)


@app.get("/health")
async def health():
    return {"status": "healthy"}


# 添加路由
app.include_router(api.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=7777, reload=True)
