from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas import token as token_schema
from app.schemas import user as user_schema
from app.services import email as email_service
from app.services import email_code as email_code_service
from app.services import token as token_service
from app.services import user as user_service
from app.utils import context, db
from app.utils.log import logger

router = APIRouter(prefix="/api", tags=["user"])


@router.post("/send_email_code")
async def api_send_email_code(
    body: user_schema.SendCodeRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
) -> None:
    """发送邮箱验证码"""
    if body.type in ["register", "reset_email"]:
        # 验证邮箱未被使用
        await user_service.verify_email_not_used(db_session, body.email)
    elif body.type == "reset_password":
        # 验证邮箱存在
        await user_service.verify_email_exist(db_session, body.email)
    # 创建验证码
    code = await email_code_service.create_email_code(db_session, body.email, body.type)
    # 发送验证码邮件
    await email_service.send_verification_code(body.email, code, body.type)
    logger.info(f"Email code sent to: {body.email}")


@router.post("/register")
async def api_register(
    body: user_schema.RegisterRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    response: Response,
) -> user_schema.LoginResponse:
    """注册新用户"""
    # 验证邮箱验证码
    await email_code_service.verify_email_code(
        db_session, body.email, body.code, "register"
    )
    # 验证邮箱未被使用
    await user_service.verify_email_not_used(db_session, body.email)
    # 将用户加入数据库
    user = await user_service.add_user_in_db(
        db_session, body.email, body.username, body.password, []
    )
    # 登录
    user, tokens = await user_service.login_by_user_id(db_session, user.id, response)
    # 设置 user_id 到 ContextVar
    context.user_id_ctx.set(str(user.id))
    logger.info("User register")
    return user_schema.LoginResponse(**tokens)


@router.post("/login")
async def api_login(
    body: user_schema.LoginRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    response: Response,
) -> user_schema.LoginResponse:
    """用户登录"""
    # 通过邮箱获取用户信息，包含权限信息
    user, _, scopes = await user_service.get_user_by_email(
        db_session, email=body.email, options="scope"
    )
    # 验证密码
    user_service.verify_password(user, body.password)
    # 创建访问令牌和刷新令牌
    tokens = await token_service.create_token(db_session, user.id, scopes)
    # 在 Cookie 中设置 refresh_token
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        secure=False,
        samesite="lax",
    )
    # 设置 user_id 到 ContextVar
    context.user_id_ctx.set(str(user.id))
    logger.info("User login")
    return user_schema.LoginResponse(**tokens)


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
    user, groups, _ = await user_service.get_user_by_id(
        db_session, payload.sub, options="group"
    )
    return user_schema.UserResponse(username=user.name, email=user.email, groups=groups)


@router.post("/me/username", status_code=status.HTTP_202_ACCEPTED)
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
    await user_service.update_username(db_session, payload.sub, body.username)


@router.post("/me/email", status_code=status.HTTP_202_ACCEPTED)
async def api_update_email(
    body: user_schema.UpdateEmailRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    payload: Annotated[
        token_schema.RefreshTokenPayload,
        Depends(token_service.authenticate_refresh_token),
    ],
    response: Response,
) -> user_schema.LoginResponse:
    """修改邮箱"""
    logger.info("User update email")
    # 修改邮箱
    await user_service.update_email(db_session, payload.sub, body.email)
    # 撤销用户所有刷新令牌
    await token_service.revoke_all_refresh_tokens(db_session, payload.sub)
    logger.info("User email updated, all refresh tokens revoked")
    # 登录
    user, tokens = await user_service.login_by_user_id(
        db_session, payload.sub, response
    )
    return user_schema.LoginResponse(**tokens)


@router.post("/me/password", status_code=status.HTTP_202_ACCEPTED)
async def api_update_password(
    body: user_schema.UpdatePasswordRequest,
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    payload: Annotated[
        token_schema.RefreshTokenPayload,
        Depends(token_service.authenticate_refresh_token),
    ],
    response: Response,
) -> user_schema.LoginResponse:
    """修改密码"""
    logger.info("User update password")
    # 修改密码
    await user_service.update_password(db_session, payload.sub, body.password)
    # 撤销用户所有刷新令牌
    await token_service.revoke_all_refresh_tokens(db_session, payload.sub)
    logger.info("User password updated, all refresh tokens revoked")
    # 登录
    user, tokens = await user_service.login_by_user_id(
        db_session, payload.sub, response
    )
    return user_schema.LoginResponse(**tokens)


@router.post("/logout")
async def api_logout(
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    payload: Annotated[
        token_schema.RefreshTokenPayload,
        Depends(token_service.authenticate_refresh_token),
    ],
) -> None:
    """登出"""
    logger.info("Logout")
    # 撤销旧的刷新令牌
    await token_service.revoke_refresh_token(db_session, payload.jti, payload.sub)


@router.post("/refresh")
async def api_refresh(
    db_session: Annotated[AsyncSession, Depends(db.get_auth_db)],
    payload: Annotated[
        token_schema.RefreshTokenPayload,
        Depends(token_service.authenticate_refresh_token),
    ],
    response: Response,
) -> user_schema.LoginResponse:
    """刷新访问令牌"""
    logger.info("Refresh access token")
    # 撤销旧的刷新令牌
    await token_service.revoke_refresh_token(db_session, payload.jti, payload.sub)
    # 登录
    user, tokens = await user_service.login_by_user_id(
        db_session, payload.sub, response
    )
    return user_schema.LoginResponse(**tokens)


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
