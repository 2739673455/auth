"""权限相关异常"""

from app.exceptions.base import ConflictError, NotFoundError


class ScopeNotFoundError(NotFoundError):
    code = 2201
    message = "权限不存在"


class ScopeNameExistsError(ConflictError):
    code = 2202
    message = "权限名已存在"
