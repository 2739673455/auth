from pydantic import BaseModel, Field


class AccessTokenPayload(BaseModel):
    sub: int = Field(..., description="用户ID")
    exp: float = Field(..., description="过期时间戳")
    scope: list[str] = Field(..., description="权限列表")
    typ: str = Field(..., description="令牌类型")


class RefreshTokenPayload(BaseModel):
    sub: int = Field(..., description="用户ID")
    exp: float = Field(..., description="过期时间戳")
    jti: str = Field(..., description="令牌唯一标识")
    typ: str = Field(..., description="令牌类型")
