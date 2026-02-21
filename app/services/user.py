"""用户管理"""

from pwdlib._hash import PasswordHash

from app.entities.auth import User

passwd_hash = PasswordHash.recommended()
HASHED_DUMMY_PASSWORD = passwd_hash.hash("dummy_password")


def verify_password(user: User, password: str) -> bool:
    """验证密码"""
    # 使用 dummy_password 避免时序攻击
    target_hash = user.password_hash if user else HASHED_DUMMY_PASSWORD
    return passwd_hash.verify(password, target_hash)
