from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import CFG
from app.exceptions import user as user_error
from app.repositories import token as token_repo
from app.repositories import user as user_repo
from app.schemas import token as token_schema
from app.schemas import user as user_schema
from app.services import email as email_service
from app.services import email_code as email_code_service
from app.services import token as token_service
from app.services import user as user_service
from app.utils import context, db
from app.utils.log import logger

router = APIRouter(tags=["user"])


async def _create_and_set_token(
    db_session: AsyncSession, user_id: int, response: Response
):
    """创建并设置令牌"""
    # 创建访问令牌
    token = await token_service.create_access_token(db_session, user_id)
    # 在 Cookie 中设置 access_token
    response.set_cookie(
        key="access_token",  # Cookie 名称，用于存储访问令牌
        value=token,  # 从 JWT 创建的访问令牌值
        httponly=True,  # 防止 JavaScript 访问 Cookie
        secure=False,  # 在 HTTP 和 HTTPS 下都可以发送
        samesite="lax",  # 防止 CSRF 攻击，允许跨站 GET 请求时发送 Cookie
    )


@router.post("/send_email_code")
async def api_send_email_code(
    body: user_schema.SendCodeRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> None:
    """发送邮箱验证码"""
    user = await user_repo.get_by_email(db_session, body.email)
    if body.type in ["register", "reset_email"]:
        # 检查邮箱是否已经注册
        if user:
            raise user_error.EmailAlreadyExistsError  # 邮箱已注册
    elif body.type == "reset_password":
        # 检查邮箱是否存在
        if not user:
            raise user_error.EmailNotFoundError  # 邮箱不存在
        # 检查用户是否被禁用
        if not user.yn:
            raise user_error.UserDisabledError  # 用户被禁用
    # 创建验证码
    code = await email_code_service.create_email_code(
        body.email, body.type, CFG.email_code_expire_seconds
    )
    # 发送验证码邮件
    await email_service.send_verification_code(body.email, code, body.type)
    logger.info(f"Email code sent to: {body.email}")


@router.post("/register")
async def api_register(
    body: user_schema.RegisterRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    response: Response,
) -> None:
    """注册新用户"""
    # 检查邮箱是否已经注册
    if await user_repo.get_by_email(db_session, body.email):
        raise user_error.EmailAlreadyExistsError  # 邮箱已注册
    # 验证邮箱验证码
    await email_code_service.verify_email_code(body.email, "register", body.code)
    # 将用户加入数据库
    user = await user_repo.create(db_session, body.email, body.username, body.password)
    # 设置 user_id 到 ContextVar
    context.user_id_ctx.set(str(user.id))
    logger.info("Register")
    # 创建并设置令牌
    await _create_and_set_token(db_session, user.id, response)


@router.post("/login")
async def api_login(
    body: user_schema.LoginRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    response: Response,
) -> None:
    """用户登录"""
    # 通过邮箱获取用户信息
    user = await user_repo.get_by_email_with_group_scope(db_session, body.email)
    # 检查用户是否存在
    if not user:
        raise user_error.UserNotFoundError  # 用户不存在
    # 设置 user_id 到 ContextVar
    context.user_id_ctx.set(str(user.id))
    logger.info("Login")
    # 检查用户是否被禁用
    if not user.yn:
        raise user_error.UserDisabledError  # 用户被禁用
    # 验证密码
    if not user_service.verify_password(user, body.password):
        raise user_error.InvalidCredentialsError  # 邮箱或密码错误
    # 创建并设置令牌
    await _create_and_set_token(db_session, user.id, response)


@router.get("/me")
async def api_me(
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    payload: Annotated[
        token_schema.AccessTokenPayload,
        Depends(token_service.authenticate_access_token),
    ],
) -> user_schema.UserResponse:
    """获取当前用户信息"""
    logger.info("User get user info")
    # 获取用户信息
    user = await user_repo.get_by_id_with_group(db_session, payload.sub)
    # 检查用户是否存在
    if not user:
        raise user_error.UserNotFoundError  # 用户不存在
    # 检查用户是否被禁用
    if not user.yn:
        raise user_error.UserDisabledError  # 用户被禁用
    # 获取组信息
    groups = [g.name for g in user.group if g.yn == 1]
    return user_schema.UserResponse(username=user.name, email=user.email, groups=groups)


@router.post("/me/username")
async def api_update_username(
    body: user_schema.UpdateUsernameRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    payload: Annotated[
        token_schema.AccessTokenPayload,
        Depends(token_service.authenticate_access_token),
    ],
) -> None:
    """修改用户名"""
    logger.info("User update username")
    # 获取用户信息
    user = await user_repo.get_by_id(db_session, payload.sub)
    # 检查用户是否存在
    if not user:
        raise user_error.UserNotFoundError  # 用户不存在
    # 检查用户是否被禁用
    if not user.yn:
        raise user_error.UserDisabledError  # 用户被禁用
    # 检查用户名是否和原用户名相同
    if user.name == body.username:
        raise user_error.UserNameSameError  # 用户名与原用户名相同
    # 更新用户名
    await user_repo.update(db_session, user, username=body.username)


@router.post("/me/email")
async def api_update_email(
    body: user_schema.UpdateEmailRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    payload: Annotated[
        token_schema.AccessTokenPayload,
        Depends(token_service.authenticate_access_token),
    ],
    response: Response,
) -> None:
    """修改邮箱"""
    logger.info("User update email")
    # 获取用户信息
    user = await user_repo.get_by_id_with_group_scope(db_session, payload.sub)
    # 检查用户是否存在
    if not user:
        raise user_error.UserNotFoundError  # 用户不存在
    # 检查用户是否被禁用
    if not user.yn:
        raise user_error.UserDisabledError  # 用户被禁用
    # 检查邮箱是否和原邮箱相同
    if user.email == body.email:
        raise user_error.UserEmailSameError  # 邮箱与原邮箱相同
    # 检查邮箱是否已经注册
    if await user_repo.get_by_email(db_session, body.email):
        raise user_error.EmailAlreadyExistsError  # 邮箱已注册
    # 更新邮箱
    await user_repo.update(db_session, user, email=body.email)
    # 撤销用户所有刷新令牌
    await token_repo.revoke_all(payload.sub)
    logger.info("User email updated, all refresh tokens revoked")
    # 创建并设置令牌
    await _create_and_set_token(db_session, user.id, response)


@router.post("/me/password")
async def api_update_password(
    body: user_schema.UpdatePasswordRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    payload: Annotated[
        token_schema.AccessTokenPayload,
        Depends(token_service.authenticate_access_token),
    ],
    response: Response,
) -> None:
    """修改密码"""
    logger.info("User update password")
    # 获取用户信息
    user = await user_repo.get_by_id_with_group_scope(db_session, payload.sub)
    # 检查用户是否存在
    if not user:
        raise user_error.UserNotFoundError  # 用户不存在
    # 检查用户是否被禁用
    if not user.yn:
        raise user_error.UserDisabledError  # 用户被禁用
    # 检查密码是否和原密码相同
    if user_service.verify_password(user, body.password):
        raise user_error.UserPasswordSameError  # 密码与原密码相同
    # 更新密码
    await user_repo.update(db_session, user, password=body.password)
    # 撤销用户所有刷新令牌
    await token_repo.revoke_all(payload.sub)
    logger.info("User password updated, all refresh tokens revoked")
    # 创建并设置令牌
    await _create_and_set_token(db_session, user.id, response)


@router.post("/logout")
async def api_logout(
    payload: Annotated[
        token_schema.AccessTokenPayload,
        Depends(token_service.authenticate_access_token),
    ],
) -> None:
    """登出"""
    logger.info("Logout")
    # 撤销刷新令牌
    await token_repo.revoke(payload.sub, payload.jti)


@router.post("/verify_access_token")
async def api_verify_access_token(
    payload: Annotated[
        token_schema.AccessTokenPayload,
        Depends(token_service.authenticate_access_token),
    ],
) -> token_schema.AccessTokenPayload:
    """验证访问令牌"""
    logger.info("Verify access token")
    return payload
