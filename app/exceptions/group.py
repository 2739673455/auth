"""组相关异常"""

from app.exceptions.base import ConflictError, NotFoundError


class GroupNotFoundError(NotFoundError):
    code = 2101
    message = "组不存在"


class GroupNameExistsError(ConflictError):
    code = 2102
    message = "组名已存在"
