"""管理接口请求和响应模型"""

from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, EmailStr, Field, field_validator

if TYPE_CHECKING:
    from app.entities.auth import Group, Scope, User


def _format_datetime(dt: datetime | None) -> str | None:
    """格式化日期时间"""
    if dt:
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    return None


class UserInfo(BaseModel):
    """用户信息"""

    id: int = Field(..., description="用户ID")
    email: str = Field(..., description="邮箱")
    username: str = Field(..., description="用户名")
    yn: int = Field(..., description="是否启用")
    create_at: str | None = Field(..., description="创建时间")

    @classmethod
    def from_user(cls, user: "User") -> "UserInfo":
        """从 User ORM 对象创建 UserInfo"""
        return cls(
            id=user.id,
            email=user.email,
            username=user.name,
            yn=user.yn,
            create_at=_format_datetime(user.create_at),
        )


class GroupInfo(BaseModel):
    """组信息"""

    id: int = Field(..., description="组ID")
    name: str = Field(..., description="组名")
    yn: int = Field(..., description="是否启用")
    create_at: str | None = Field(default=None, description="创建时间")

    @classmethod
    def from_group(cls, group: "Group") -> "GroupInfo":
        """从 Group ORM 对象创建 GroupInfo"""
        return cls(
            id=group.id,
            name=group.name,
            yn=group.yn,
            create_at=_format_datetime(group.create_at),
        )


class ScopeInfo(BaseModel):
    """权限信息"""

    id: int = Field(..., description="权限ID")
    name: str = Field(..., description="权限名")
    description: str | None = Field(default=None, description="权限描述")
    yn: int = Field(..., description="是否启用")
    create_at: str | None = Field(default=None, description="创建时间")

    @classmethod
    def from_scope(cls, scope: "Scope") -> "ScopeInfo":
        """从 Scope ORM 对象创建 ScopeInfo"""
        return cls(
            id=scope.id,
            name=scope.name,
            description=scope.description,
            yn=scope.yn,
            create_at=_format_datetime(scope.create_at),
        )


# ========== 用户相关 ==========
class CreateUserRequest(BaseModel):
    """创建用户请求"""

    email: EmailStr = Field(..., description="邮箱")
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if "@" in v:
            raise ValueError("用户名不能包含@字符")
        if len(v) < 1:
            raise ValueError("用户名不少于1个字符")
        if len(v) > 50:
            raise ValueError("用户名不超过50个字符")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("密码不少于6个字符")
        if len(v) > 128:
            raise ValueError("密码不超过128个字符")
        return v


class UpdateUserRequest(BaseModel):
    """更新用户请求"""

    user_id: int = Field(..., description="用户ID")
    email: EmailStr | None = Field(default=None, description="邮箱")
    username: str | None = Field(default=None, description="用户名")
    password: str | None = Field(default=None, description="密码")
    yn: int | None = Field(default=None, description="是否启用: 1-启用, 0-禁用")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if "@" in v:
            raise ValueError("用户名不能包含@字符")
        if len(v) < 1:
            raise ValueError("用户名不少于1个字符")
        if len(v) > 50:
            raise ValueError("用户名不超过50个字符")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if len(v) < 6:
            raise ValueError("密码不少于6个字符")
        if len(v) > 128:
            raise ValueError("密码不超过128个字符")
        return v


class RemoveUserRequest(BaseModel):
    """删除用户请求"""

    user_id: int = Field(..., description="用户ID")


class UserDetailResponse(UserInfo):
    """用户详情响应"""

    groups: list[GroupInfo] = Field(default=[], description="所属组列表")
    scopes: list[ScopeInfo] = Field(default=[], description="拥有的权限列表")


class UserListResponse(BaseModel):
    """用户列表响应"""

    total: int = Field(..., description="总数")
    items: list[UserInfo] = Field(..., description="用户列表")


# ========== 组相关 ==========
class CreateGroupRequest(BaseModel):
    """创建组请求"""

    name: str = Field(..., description="组名")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1:
            raise ValueError("组名不少于1个字符")
        if len(v) > 100:
            raise ValueError("组名不超过100个字符")
        return v


class UpdateGroupRequest(BaseModel):
    """更新组请求"""

    group_id: int = Field(..., description="组ID")
    name: str | None = Field(default=None, description="组名")
    yn: int | None = Field(default=None, description="是否启用")


class RemoveGroupRequest(BaseModel):
    """删除组请求"""

    group_id: int = Field(..., description="组ID")


class GroupDetailResponse(GroupInfo):
    """组详情响应"""

    users: list[UserInfo] = Field(default=[], description="组内用户列表")
    scopes: list[ScopeInfo] = Field(default=[], description="组权限列表")


class GroupListResponse(BaseModel):
    """组列表响应"""

    total: int = Field(..., description="总数")
    items: list[GroupInfo] = Field(..., description="组列表")


# ========== 权限相关 ==========
class CreateScopeRequest(BaseModel):
    """创建权限请求"""

    name: str = Field(..., description="权限名")
    description: str | None = Field(default=None, description="权限描述")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1:
            raise ValueError("权限名不少于1个字符")
        if len(v) > 100:
            raise ValueError("权限名不超过100个字符")
        return v


class UpdateScopeRequest(BaseModel):
    """更新权限请求"""

    scope_id: int = Field(..., description="权限ID")
    name: str | None = Field(default=None, description="权限名")
    description: str | None = Field(default=None, description="权限描述")
    yn: int | None = Field(default=None, description="是否启用")


class RemoveScopeRequest(BaseModel):
    """删除权限请求"""

    scope_id: int = Field(..., description="权限ID")


class ScopeDetailResponse(ScopeInfo):
    """权限详情响应"""

    groups: list[GroupInfo] = Field(default=[], description="拥有此权限的组列表")
    users: list[UserInfo] = Field(default=[], description="拥有此权限的用户列表")


class ScopeListResponse(BaseModel):
    """权限列表响应"""

    total: int = Field(..., description="总数")
    items: list[ScopeInfo] = Field(..., description="权限列表")


# ========== 关联相关 ==========
class UserGroupRelation(BaseModel):
    """用户-组关联"""

    user_id: int = Field(..., description="用户ID")
    group_id: int = Field(..., description="组ID")


class GroupScopeRelation(BaseModel):
    """组-权限关联"""

    group_id: int = Field(..., description="组ID")
    scope_id: int = Field(..., description="权限ID")


class BatchAddUserGroupRequest(BaseModel):
    """批量添加用户-组关联请求"""

    relations: list[UserGroupRelation] = Field(..., description="关联关系列表")


class BatchRemoveUserGroupRequest(BaseModel):
    """批量移除用户-组关联请求"""

    relations: list[UserGroupRelation] = Field(..., description="关联关系列表")


class BatchAddGroupScopeRequest(BaseModel):
    """批量添加组-权限关联请求"""

    relations: list[GroupScopeRelation] = Field(..., description="关联关系列表")


class BatchRemoveGroupScopeRequest(BaseModel):
    """批量移除组-权限关联请求"""

    relations: list[GroupScopeRelation] = Field(..., description="关联关系列表")
