"""认证API测试"""

import asyncio
import uuid

import pytest
from faker import Faker

from app.repositories import email_code as email_code_repo

fake = Faker("zh_CN")


def gen_test_user() -> dict:
    """生成测试用户数据"""
    suffix = uuid.uuid4().hex[:8]
    return {
        "username": f"{fake.name()}_{suffix}",
        "email": f"{fake.user_name()}_{suffix}@test.com",
        "password": fake.password(),
    }


async def _get_latest_verification_code(email: str, code_type: str) -> str:
    """从 Redis 获取验证码"""
    code = await email_code_repo.get(email, code_type)
    if not code:
        raise ValueError(f"未找到验证码: email={email}, type={code_type}")
    return code


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
        user_data = gen_test_user()
        response = await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "register"},
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
        assert "access_token" in response.cookies

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
        assert "access_token" in response.cookies

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, async_test_client):
        """测试登录不存在的用户"""
        user_data = gen_test_user()
        response = await async_test_client.post(
            "/api/login",
            json={"email": user_data["email"], "password": user_data["password"]},
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
        assert response.status_code == 400

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

        await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )

        # 修改用户名
        new_username = gen_test_user()["username"]
        response = await async_test_client.post(
            "/api/update_username", json={"username": new_username}
        )
        assert response.status_code == 200

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

        await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )

        # 修改为相同用户名应失败
        response = await async_test_client.post(
            "/api/update_username",
            json={"username": user_data["username"]},
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

        await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )

        # 准备：发送修改邮箱验证码
        new_user = gen_test_user()
        new_email = new_user["email"]
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": new_email, "type": "reset_email"},
        )
        reset_email_code = await _get_latest_verification_code(new_email, "reset_email")

        # 修改邮箱
        response = await async_test_client.post(
            "/api/update_email", json={"email": new_email, "code": reset_email_code}
        )
        assert response.status_code == 200
        assert "access_token" in response.cookies

    @pytest.mark.asyncio
    async def test_update_email_send_code_to_same_email(self, async_test_client):
        """测试发送验证码到当前邮箱（相同邮箱）"""
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

        # 发送修改邮箱验证码到当前邮箱应失败（邮箱已注册）
        response = await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "reset_email"},
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_update_email_send_code_to_duplicate(self, async_test_client):
        """测试发送验证码到已注册的邮箱"""
        user_data1 = gen_test_user()
        user_data2 = gen_test_user()

        # 准备：注册两个用户
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data1["email"], "type": "register"},
        )
        code1 = await _get_latest_verification_code(user_data1["email"], "register")
        await async_test_client.post(
            "/api/register",
            json={
                "email": user_data1["email"],
                "code": code1,
                "username": user_data1["username"],
                "password": user_data1["password"],
            },
        )

        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data2["email"], "type": "register"},
        )
        code2 = await _get_latest_verification_code(user_data2["email"], "register")
        await async_test_client.post(
            "/api/register",
            json={
                "email": user_data2["email"],
                "code": code2,
                "username": user_data2["username"],
                "password": user_data2["password"],
            },
        )

        # 用户2尝试发送修改邮箱验证码到用户1的邮箱应失败
        response = await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data1["email"], "type": "reset_email"},
        )
        assert response.status_code == 409

    # ==================== 修改密码 ====================
    @pytest.mark.asyncio
    async def test_update_password(self, async_test_client):
        """测试通过邮箱验证码修改密码"""
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

        # 准备：发送修改密码验证码
        await async_test_client.post(
            "/api/send_email_code",
            json={"email": user_data["email"], "type": "reset_password"},
        )
        reset_code = await _get_latest_verification_code(
            user_data["email"], "reset_password"
        )

        # 修改密码（无需登录）
        new_user = gen_test_user()
        new_password = new_user["password"]
        response = await async_test_client.post(
            "/api/update_password",
            json={
                "email": user_data["email"],
                "code": reset_code,
                "password": new_password,
            },
        )
        assert response.status_code == 200

        # 验证：使用新密码登录
        login_response = await async_test_client.post(
            "/api/login", json={"email": user_data["email"], "password": new_password}
        )
        assert login_response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_password_invalid_code(self, async_test_client):
        """测试使用错误验证码修改密码"""
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

        # 使用错误验证码修改密码应失败
        response = await async_test_client.post(
            "/api/update_password",
            json={
                "email": user_data["email"],
                "code": "000000",
                "password": gen_test_user()["password"],
            },
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_update_password_nonexistent_email(self, async_test_client):
        """测试使用不存在邮箱修改密码"""
        user_data = gen_test_user()
        response = await async_test_client.post(
            "/api/update_password",
            json={
                "email": user_data["email"],
                "code": "000000",
                "password": user_data["password"],
            },
        )
        assert response.status_code == 404

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

        await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )

        # 获取用户信息
        response = await async_test_client.get("/api/me")
        assert response.status_code == 200
        assert response.json()["email"] == user_data["email"]

    @pytest.mark.asyncio
    async def test_get_user_info_no_token(self, async_test_client):
        """测试获取用户信息时未携带令牌"""
        # 清除所有 cookie
        async_test_client.cookies.clear()

        # 获取用户信息应失败（未授权）
        response = await async_test_client.get("/api/me")
        assert response.status_code == 401

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

        await async_test_client.post(
            "/api/register",
            json={
                "email": user_data["email"],
                "code": code,
                "username": user_data["username"],
                "password": user_data["password"],
            },
        )

        # 登出
        response = await async_test_client.post("/api/logout")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_verify_access_token(self, async_test_client):
        """测试验证访问令牌"""
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

        # 验证访问令牌
        response = await async_test_client.get("/api/verify_access_token")
        assert response.status_code == 200
        data = response.json()
        assert "sub" in data
        assert "scope" in data
        assert "exp" in data


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
        tokens = [r.cookies["access_token"] for r in responses]
        assert len(set(tokens)) == 10
