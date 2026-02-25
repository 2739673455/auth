"""认证异常"""

from app.exceptions.base import AuthError


class InvalidAccessTokenError(AuthError):
    code = 1201
    message = "无效访问令牌"


class ExpiredAccessTokenError(AuthError):
    code = 1202
    message = "访问令牌过期"
