from pydantic import BaseModel, Field


class AccessTokenPayload(BaseModel):
    sub: int = Field(..., description="用户ID")
    exp: float = Field(..., description="过期时间戳")
    jti: str = Field(..., description="令牌唯一标识")
    scope: list[str] = Field(default=[], description="权限范围")
