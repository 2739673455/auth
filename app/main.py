from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CFG
from app.entities.auth import Group, Scope
from app.exceptions.handlers import register_exception_handlers
from app.middlewares import trace
from app.repositories import group as group_repo
from app.repositories import scope as scope_repo
from app.repositories import user as user_repo
from app.routers import user
from app.utils import db
from app.utils.log import logger, setup_logger


async def create_admin_user():
    """创建管理员用户（如果不存在）"""
    async for db_session in db.get_auth_db():
        # 检查是否存在权限为 *
        all_scope = await scope_repo.get_by_name(db_session, "*")

        # 如果不存在则创建管理员用户和管理员组，并赋予 * 权限（存在则覆盖）
        # 创建或覆盖权限
        if not all_scope:
            all_scope = Scope(name="*", description="全部权限")
            db_session.add(all_scope)
            await db_session.flush()
            logger.info("Created * scope")

        # 创建或覆盖组
        admin_group = await group_repo.get_by_name(db_session, "admin", options="scope")
        if not admin_group:
            admin_group = Group(name="admin", scope=[all_scope])
            db_session.add(admin_group)
            await db_session.flush()
            logger.info("Created admin group with * scope")
        elif "*" not in [s.name for s in admin_group.scope]:
            admin_group.scope = [all_scope]
            await db_session.flush()
            logger.info("Updated admin group with * scope")

        # 创建或更新用户
        admin_user = await user_repo.get_by_email(
            db_session, CFG.admin.email, options="group"
        )
        if not admin_user:
            admin_user = await user_repo.create(
                db_session,
                email=CFG.admin.email,
                username=CFG.admin.username,
                password=CFG.admin.password,
                groups=[admin_group],
            )
            logger.info(f"Created admin user: {admin_user.email}")
        elif "admin" not in [g.name for g in admin_user.group]:
            admin_user.name = CFG.admin.username
            admin_user.password_hash = user_repo.passwd_hash.hash(CFG.admin.password)
            admin_user.group = [admin_group]
            await db_session.commit()
            logger.info(f"Updated admin user: {admin_user.email}")


# 生命周期管理
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 初始化日志
    setup_logger()

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
app.include_router(user.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=7777, reload=True)
