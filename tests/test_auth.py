"""认证API测试"""

import asyncio
from datetime import datetime, timezone

import pytest
from faker import Faker
from sqlalchemy import and_, desc, select

from app.entities.auth import EmailCode
from app.utils import db
from tests.conftest import DB_DRIVER, db_mock

fake = Faker("zh_CN")


def gen_test_user() -> dict:
    """生成测试用户数据"""
    return {"username": fake.name(), "email": fake.email(), "password": fake.password()}


async def _get_latest_verification_code(email: str, code_type: str) -> str:
    """从数据库获取最新生成的验证码"""
    # 使用 get_db 创建新会话（解决事务隔离问题）
    async for db_session in db.get_db("test_auth", db_mock.db_url, DB_DRIVER)():
        stmt = (
            select(EmailCode)
            .where(
                and_(
                    EmailCode.email == email,
                    EmailCode.type == code_type,
                    EmailCode.used == 0,
                    EmailCode.expire_at > datetime.now(timezone.utc),
                )
            )
            .order_by(desc(EmailCode.create_at))
        )
        result = await db_session.execute(stmt)
        email_code = result.scalar_one_or_none()
        if not email_code:
            raise ValueError(f"未找到验证码: email={email}, type={code_type}")
        return email_code.code
    raise RuntimeError("无法获取数据库会话")


class TestAuthAPIBasic:
    """基础认证API测试类"""

    @pytest.mark.asyncio
    async def test_health_check(self, async_test_client):
        """测试健康检查接口"""
        response = await async_test_client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}

    # ==================== 发送验证码 ====================
    @pytest.mark.asyncio
    async def test_send_code_success(self, async_test_client):
        """测试发送验证码成功"""
        response = await async_test_client.post(
            "/api/send_email_code",
            json={"email": fake.email(), "type": "register"},
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_send_code_invalid_email(self, async_test_client):
        """测试发送验证码无效邮箱"""
        response = await async_test_client.post(
            "/api/send_email_code",
            json={"email": "invalid_email", "type": "register"},
        )
        assert response.status_code == 422

    # ==================== 注册相关 ====================
    @pytest.mark.asyncio
    async def test_register_success(self, async_test_client):
        """测试注册成功"""
        user_data = gen_test_user()

        # 发送验证码
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )

        # 获取验证码
        code = await _get_latest_verification_code(user_data["email"], "register")

        # 注册用户
        response = await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_register_wrong_code(self, async_test_client):
        """测试注册验证码错误"""
        user_data = gen_test_user()

        # 发送验证码
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )

        # 使用错误验证码注册
        response = await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": "000000",
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, async_test_client):
        """测试注册重复邮箱"""
        user_data = gen_test_user()

        # 注册用户
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )
        code = await _get_latest_verification_code(user_data["email"], "register")

        await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )

        # 重复发送注册验证码应返回 409
        response = await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )
        assert response.status_code == 409

    # ==================== 登录相关 ====================
    @pytest.mark.asyncio
    async def test_login_success(self, async_test_client):
        """测试登录成功"""
        user_data = gen_test_user()

        # 准备：注册用户
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )
        code = await _get_latest_verification_code(user_data["email"], "register")

        await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )

        # 登录
        response = await async_test_client.post(
            "/api/login",
            json={"email": user_data["email"], "password": user_data["password"]},
        )
        assert response.status_code == 200
        assert "access_token" in response.json()

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, async_test_client):
        """测试登录不存在的用户"""
        response = await async_test_client.post(
            "/api/login", json={"email": fake.email(), "password": fake.password()}
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, async_test_client):
        """测试登录密码错误"""
        user_data = gen_test_user()

        # 准备：注册用户
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )
        code = await _get_latest_verification_code(user_data["email"], "register")

        await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )

        # 使用错误密码登录
        response = await async_test_client.post(
            "/api/login",
            json={"email": user_data["email"], "password": "wrongpassword"},
        )
        assert response.status_code == 401

    # ==================== 修改用户名 ====================
    @pytest.mark.asyncio
    async def test_update_username(self, async_test_client):
        """测试修改用户名"""
        user_data = gen_test_user()

        # 准备：注册用户
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )
        code = await _get_latest_verification_code(user_data["email"], "register")

        register_response = await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )
        access_token = register_response.json()["access_token"]

        # 修改用户名
        new_username = fake.name()
        headers = {"Authorization": f"Bearer {access_token}"}
        response = await async_test_client.post(
            "/api/me/username", json={"username": new_username}, headers=headers
        )
        assert response.status_code == 202

    @pytest.mark.asyncio
    async def test_update_username_same(self, async_test_client):
        """测试修改为相同用户名"""
        user_data = gen_test_user()

        # 准备：注册用户
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )
        code = await _get_latest_verification_code(user_data["email"], "register")

        register_response = await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )
        access_token = register_response.json()["access_token"]

        # 修改为相同用户名应失败
        headers = {"Authorization": f"Bearer {access_token}"}
        response = await async_test_client.post(
            "/api/me/username",
            json={"username": user_data["username"]},
            headers=headers,
        )
        assert response.status_code == 400

    # ==================== 修改邮箱 ====================
    @pytest.mark.asyncio
    async def test_update_email(self, async_test_client):
        """测试修改邮箱"""
        user_data = gen_test_user()

        # 准备：注册用户
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )
        code = await _get_latest_verification_code(user_data["email"], "register")

        register_response = await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )
        refresh_token = register_response.json()["refresh_token"]

        # 准备：发送修改邮箱验证码
        new_email = fake.email()
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": new_email, "type": "reset_email"},
        )
        reset_email_code = await _get_latest_verification_code(new_email, "reset_email")

        # 修改邮箱
        async_test_client.cookies.set("refresh_token", refresh_token)
        response = await async_test_client.post(
            "/api/me/email", json={"email": new_email, "code": reset_email_code}
        )
        assert response.status_code == 202
        assert "access_token" in response.json()

    # ==================== 修改密码 ====================
    @pytest.mark.asyncio
    async def test_update_password(self, async_test_client):
        """测试修改密码"""
        user_data = gen_test_user()

        # 准备：注册用户
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )
        code = await _get_latest_verification_code(user_data["email"], "register")

        register_response = await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )
        refresh_token = register_response.json()["refresh_token"]

        # 准备：发送修改密码验证码
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "reset_password"},
        )
        reset_code = await _get_latest_verification_code(
            user_data["email"], "reset_password"
        )

        # 修改密码
        new_password = fake.password()
        async_test_client.cookies.set("refresh_token", refresh_token)
        response = await async_test_client.post(
            "/api/me/password", json={"password": new_password, "code": reset_code}
        )
        assert response.status_code == 202

        # 验证：使用新密码登录
        login_response = await async_test_client.post(
            "/api/login", json={"email": user_data["email"], "password": new_password}
        )
        assert login_response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_password_same(self, async_test_client):
        """测试修改为相同密码"""
        user_data = gen_test_user()

        # 准备：注册用户
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )
        code = await _get_latest_verification_code(user_data["email"], "register")

        register_response = await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )
        refresh_token = register_response.json()["refresh_token"]

        # 准备：发送修改密码验证码
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "reset_password"},
        )
        reset_code = await _get_latest_verification_code(
            user_data["email"], "reset_password"
        )

        # 修改为相同密码应失败
        async_test_client.cookies.set("refresh_token", refresh_token)
        response = await async_test_client.post(
            "/api/me/password",
            json={"password": user_data["password"], "code": reset_code},
        )
        assert response.status_code == 400

    # ==================== 获取用户信息 ====================
    @pytest.mark.asyncio
    async def test_get_user_info(self, async_test_client):
        """测试获取用户信息"""
        user_data = gen_test_user()

        # 准备：注册用户
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )
        code = await _get_latest_verification_code(user_data["email"], "register")

        register_response = await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )
        access_token = register_response.json()["access_token"]

        # 获取用户信息
        headers = {"Authorization": f"Bearer {access_token}"}
        response = await async_test_client.get("/api/me", headers=headers)
        assert response.status_code == 200
        assert response.json()["email"] == user_data["email"]

    # ==================== 刷新令牌 ====================
    @pytest.mark.asyncio
    async def test_refresh_token(self, async_test_client):
        """测试刷新令牌"""
        user_data = gen_test_user()

        # 准备：注册用户
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )
        code = await _get_latest_verification_code(user_data["email"], "register")

        register_response = await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )
        refresh_token = register_response.json()["refresh_token"]

        # 刷新令牌
        async_test_client.cookies.set("refresh_token", refresh_token)
        response = await async_test_client.post("/api/refresh")
        assert response.status_code == 200
        assert "access_token" in response.json()

    # ==================== 登出 ====================
    @pytest.mark.asyncio
    async def test_logout(self, async_test_client):
        """测试登出"""
        user_data = gen_test_user()

        # 准备：注册用户
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )
        code = await _get_latest_verification_code(user_data["email"], "register")

        register_response = await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )
        refresh_token = register_response.json()["refresh_token"]

        # 登出
        async_test_client.cookies.set("refresh_token", refresh_token)
        response = await async_test_client.post("/api/logout")
        assert response.status_code == 200


class TestAuthAPIConcurrent:
    """并发认证API测试类"""

    @pytest.mark.asyncio
    async def test_concurrent_login(self, async_test_client):
        """测试并发登录"""
        user_data = gen_test_user()

        # 准备：注册用户
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
        )
        code = await _get_latest_verification_code(user_data["email"], "register")

        await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )

        # 并发登录
        async def login():
            return await async_test_client.post(
                "/api/login",
                json={"email": user_data["email"], "password": user_data["password"]},
            )

        responses = await asyncio.gather(*[login() for _ in range(10)])
        tokens = [r.json()["access_token"] for r in responses]
        assert len(set(tokens)) == 10
