"""Admin管理API测试"""

import uuid

import pytest
import pytest_asyncio
from faker import Faker
from httpx import AsyncClient

from app.config import CFG

fake = Faker("zh_CN")


def gen_test_user() -> dict:
    """生成测试用户数据"""
    return {"username": fake.name(), "email": fake.email(), "password": fake.password()}


def gen_test_group() -> dict:
    """生成测试组数据"""
    return {"name": f"{fake.word()}_{uuid.uuid4().hex[:8]}_group"}


def gen_test_scope() -> dict:
    """生成测试权限数据"""
    return {
        "name": f"{fake.word()}_{uuid.uuid4().hex[:8]}_scope",
        "description": fake.sentence(),
    }


@pytest_asyncio.fixture
async def admin_token(async_test_client: AsyncClient) -> str:
    """获取管理员token"""
    response = await async_test_client.post(
        "/api/login",
        json={"email": CFG.admin.email, "password": CFG.admin.password},
    )
    assert response.status_code == 200
    return response.cookies["access_token"]


@pytest_asyncio.fixture
async def admin_headers(admin_token: str) -> dict:
    """获取管理员请求头"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestAdminUserAPI:
    """用户管理API测试类"""

    @pytest.mark.asyncio
    async def test_create_user_success(self, async_test_client, admin_headers):
        """测试创建用户成功"""
        user_data = gen_test_user()
        response = await async_test_client.post(
            "/api/admin/create_user",
            json=user_data,
            headers=admin_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["username"] == user_data["username"]
        assert data["yn"] == 1
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_user_duplicate_email(self, async_test_client, admin_headers):
        """测试创建用户重复邮箱"""
        user_data = gen_test_user()
        # 第一次创建
        await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        # 重复创建应失败
        response = await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_create_user_invalid_email(self, async_test_client, admin_headers):
        """测试创建用户无效邮箱"""
        user_data = gen_test_user()
        user_data["email"] = "invalid_email"
        response = await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_user_invalid_username(self, async_test_client, admin_headers):
        """测试创建用户无效用户名"""
        user_data = gen_test_user()
        user_data["username"] = "user@name"  # 用户名不能包含@
        response = await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_user_short_password(self, async_test_client, admin_headers):
        """测试创建用户密码过短"""
        user_data = gen_test_user()
        user_data["password"] = "123"  # 密码少于6个字符
        response = await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_users(self, async_test_client, admin_headers):
        """测试查询用户列表"""
        # 先创建几个用户
        for _ in range(3):
            user_data = gen_test_user()
            await async_test_client.post(
                "/api/admin/create_user", json=user_data, headers=admin_headers
            )

        response = await async_test_client.get(
            "/api/admin/list_users", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert len(data["items"]) >= 3

    @pytest.mark.asyncio
    async def test_list_users_pagination(self, async_test_client, admin_headers):
        """测试用户列表分页"""
        response = await async_test_client.get(
            "/api/admin/list_users?offset=0&limit=10", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 10

    @pytest.mark.asyncio
    async def test_list_users_search(self, async_test_client, admin_headers):
        """测试用户列表搜索"""
        user_data = gen_test_user()
        await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )

        response = await async_test_client.get(
            f"/api/admin/list_users?keyword={user_data['username']}",
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_get_user_detail(self, async_test_client, admin_headers):
        """测试查询用户详情"""
        user_data = gen_test_user()
        create_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        user_id = create_response.json()["id"]

        response = await async_test_client.get(
            f"/api/admin/user/{user_id}", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["username"] == user_data["username"]
        assert "groups" in data
        assert "scopes" in data

    @pytest.mark.asyncio
    async def test_get_user_detail_not_found(self, async_test_client, admin_headers):
        """测试查询不存在的用户详情"""
        response = await async_test_client.get(
            "/api/admin/user/999999", headers=admin_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_user_success(self, async_test_client, admin_headers):
        """测试更新用户成功"""
        user_data = gen_test_user()
        create_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        user_id = create_response.json()["id"]

        new_username = fake.name()
        response = await async_test_client.post(
            "/api/admin/update_user",
            json={"user_id": user_id, "username": new_username},
            headers=admin_headers,
        )
        assert response.status_code == 200

        # 验证更新成功
        get_response = await async_test_client.get(
            f"/api/admin/user/{user_id}", headers=admin_headers
        )
        assert get_response.json()["username"] == new_username

    @pytest.mark.asyncio
    async def test_update_user_email(self, async_test_client, admin_headers):
        """测试更新用户邮箱"""
        user_data = gen_test_user()
        create_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        user_id = create_response.json()["id"]

        new_email = fake.email()
        response = await async_test_client.post(
            "/api/admin/update_user",
            json={"user_id": user_id, "email": new_email},
            headers=admin_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_user_duplicate_email(self, async_test_client, admin_headers):
        """测试更新用户重复邮箱"""
        user_data1 = gen_test_user()
        user_data2 = gen_test_user()
        create_response1 = await async_test_client.post(
            "/api/admin/create_user", json=user_data1, headers=admin_headers
        )
        await async_test_client.post(
            "/api/admin/create_user", json=user_data2, headers=admin_headers
        )
        user_id1 = create_response1.json()["id"]

        response = await async_test_client.post(
            "/api/admin/update_user",
            json={"user_id": user_id1, "email": user_data2["email"]},
            headers=admin_headers,
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_update_user_not_found(self, async_test_client, admin_headers):
        """测试更新不存在的用户"""
        response = await async_test_client.post(
            "/api/admin/update_user",
            json={"user_id": 999999, "username": fake.name()},
            headers=admin_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_user_disable(self, async_test_client, admin_headers):
        """测试禁用用户"""
        user_data = gen_test_user()
        create_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        user_id = create_response.json()["id"]

        response = await async_test_client.post(
            "/api/admin/update_user",
            json={"user_id": user_id, "yn": 0},
            headers=admin_headers,
        )
        assert response.status_code == 200

        get_response = await async_test_client.get(
            f"/api/admin/user/{user_id}", headers=admin_headers
        )
        assert get_response.json()["yn"] == 0

    @pytest.mark.asyncio
    async def test_remove_user_success(self, async_test_client, admin_headers):
        """测试删除用户成功"""
        user_data = gen_test_user()
        create_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        user_id = create_response.json()["id"]

        response = await async_test_client.post(
            "/api/admin/remove_user",
            json={"user_id": user_id},
            headers=admin_headers,
        )
        assert response.status_code == 200

        # 验证用户已删除
        get_response = await async_test_client.get(
            f"/api/admin/user/{user_id}", headers=admin_headers
        )
        assert get_response.status_code == 404


class TestAdminGroupAPI:
    """组管理API测试类"""

    @pytest.mark.asyncio
    async def test_create_group_success(self, async_test_client, admin_headers):
        """测试创建组成功"""
        group_data = gen_test_group()
        response = await async_test_client.post(
            "/api/admin/create_group",
            json=group_data,
            headers=admin_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == group_data["name"]
        assert data["yn"] == 1
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_group_duplicate_name(self, async_test_client, admin_headers):
        """测试创建组重复名称"""
        group_data = gen_test_group()
        await async_test_client.post(
            "/api/admin/create_group", json=group_data, headers=admin_headers
        )
        response = await async_test_client.post(
            "/api/admin/create_group", json=group_data, headers=admin_headers
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_create_group_invalid_name(self, async_test_client, admin_headers):
        """测试创建组无效名称"""
        response = await async_test_client.post(
            "/api/admin/create_group",
            json={"name": ""},  # 空名称
            headers=admin_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_groups(self, async_test_client, admin_headers):
        """测试查询组列表"""
        # 先创建几个组
        for _ in range(3):
            group_data = gen_test_group()
            await async_test_client.post(
                "/api/admin/create_group", json=group_data, headers=admin_headers
            )

        response = await async_test_client.get(
            "/api/admin/list_groups", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert len(data["items"]) >= 3

    @pytest.mark.asyncio
    async def test_list_groups_pagination(self, async_test_client, admin_headers):
        """测试组列表分页"""
        response = await async_test_client.get(
            "/api/admin/list_groups?offset=0&limit=2", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 2

    @pytest.mark.asyncio
    async def test_list_groups_search(self, async_test_client, admin_headers):
        """测试组列表搜索"""
        group_data = gen_test_group()
        await async_test_client.post(
            "/api/admin/create_group", json=group_data, headers=admin_headers
        )

        response = await async_test_client.get(
            f"/api/admin/list_groups?keyword={group_data['name']}",
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_get_group_detail(self, async_test_client, admin_headers):
        """测试查询组详情"""
        group_data = gen_test_group()
        create_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data, headers=admin_headers
        )
        group_id = create_response.json()["id"]

        response = await async_test_client.get(
            f"/api/admin/group/{group_id}", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == group_data["name"]
        assert "users" in data
        assert "scopes" in data

    @pytest.mark.asyncio
    async def test_get_group_detail_not_found(self, async_test_client, admin_headers):
        """测试查询不存在的组详情"""
        response = await async_test_client.get(
            "/api/admin/group/999999", headers=admin_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_group_success(self, async_test_client, admin_headers):
        """测试更新组成功"""
        group_data = gen_test_group()
        create_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data, headers=admin_headers
        )
        group_id = create_response.json()["id"]

        new_name = fake.word() + "_group_new"
        response = await async_test_client.post(
            "/api/admin/update_group",
            json={"group_id": group_id, "name": new_name},
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert response.json()["name"] == new_name

    @pytest.mark.asyncio
    async def test_update_group_duplicate_name(self, async_test_client, admin_headers):
        """测试更新组重复名称"""
        group_data1 = gen_test_group()
        group_data2 = gen_test_group()
        create_response1 = await async_test_client.post(
            "/api/admin/create_group", json=group_data1, headers=admin_headers
        )
        await async_test_client.post(
            "/api/admin/create_group", json=group_data2, headers=admin_headers
        )
        group_id1 = create_response1.json()["id"]

        response = await async_test_client.post(
            "/api/admin/update_group",
            json={"group_id": group_id1, "name": group_data2["name"]},
            headers=admin_headers,
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_update_group_not_found(self, async_test_client, admin_headers):
        """测试更新不存在的组"""
        response = await async_test_client.post(
            "/api/admin/update_group",
            json={"group_id": 999999, "name": fake.word()},
            headers=admin_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_group_disable(self, async_test_client, admin_headers):
        """测试禁用组"""
        group_data = gen_test_group()
        create_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data, headers=admin_headers
        )
        group_id = create_response.json()["id"]

        response = await async_test_client.post(
            "/api/admin/update_group",
            json={"group_id": group_id, "yn": 0},
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert response.json()["yn"] == 0

    @pytest.mark.asyncio
    async def test_remove_group_success(self, async_test_client, admin_headers):
        """测试删除组成功"""
        group_data = gen_test_group()
        create_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data, headers=admin_headers
        )
        group_id = create_response.json()["id"]

        response = await async_test_client.post(
            "/api/admin/remove_group",
            json={"group_id": group_id},
            headers=admin_headers,
        )
        assert response.status_code == 200

        # 验证组已删除
        get_response = await async_test_client.get(
            f"/api/admin/group/{group_id}", headers=admin_headers
        )
        assert get_response.status_code == 404


class TestAdminScopeAPI:
    """权限管理API测试类"""

    @pytest.mark.asyncio
    async def test_create_scope_success(self, async_test_client, admin_headers):
        """测试创建权限成功"""
        scope_data = gen_test_scope()
        response = await async_test_client.post(
            "/api/admin/create_scope",
            json=scope_data,
            headers=admin_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == scope_data["name"]
        assert data["description"] == scope_data["description"]
        assert data["yn"] == 1
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_scope_duplicate_name(self, async_test_client, admin_headers):
        """测试创建权限重复名称"""
        scope_data = gen_test_scope()
        await async_test_client.post(
            "/api/admin/create_scope", json=scope_data, headers=admin_headers
        )
        response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data, headers=admin_headers
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_create_scope_invalid_name(self, async_test_client, admin_headers):
        """测试创建权限无效名称"""
        response = await async_test_client.post(
            "/api/admin/create_scope",
            json={"name": ""},  # 空名称
            headers=admin_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_scope_without_description(
        self, async_test_client, admin_headers
    ):
        """测试创建权限不带描述"""
        response = await async_test_client.post(
            "/api/admin/create_scope",
            json={"name": fake.word() + "_scope"},
            headers=admin_headers,
        )
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_list_scopes(self, async_test_client, admin_headers):
        """测试查询权限列表"""
        # 先创建几个权限
        for _ in range(3):
            scope_data = gen_test_scope()
            await async_test_client.post(
                "/api/admin/create_scope", json=scope_data, headers=admin_headers
            )

        response = await async_test_client.get(
            "/api/admin/list_scopes", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert len(data["items"]) >= 3

    @pytest.mark.asyncio
    async def test_list_scopes_pagination(self, async_test_client, admin_headers):
        """测试权限列表分页"""
        response = await async_test_client.get(
            "/api/admin/list_scopes?offset=0&limit=2", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 2

    @pytest.mark.asyncio
    async def test_list_scopes_search(self, async_test_client, admin_headers):
        """测试权限列表搜索"""
        scope_data = gen_test_scope()
        await async_test_client.post(
            "/api/admin/create_scope", json=scope_data, headers=admin_headers
        )

        response = await async_test_client.get(
            f"/api/admin/list_scopes?keyword={scope_data['name']}",
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_get_scope_detail(self, async_test_client, admin_headers):
        """测试查询权限详情"""
        scope_data = gen_test_scope()
        create_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data, headers=admin_headers
        )
        scope_id = create_response.json()["id"]

        response = await async_test_client.get(
            f"/api/admin/scope/{scope_id}", headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == scope_data["name"]
        assert "groups" in data
        assert "users" in data

    @pytest.mark.asyncio
    async def test_get_scope_detail_not_found(self, async_test_client, admin_headers):
        """测试查询不存在的权限详情"""
        response = await async_test_client.get(
            "/api/admin/scope/999999", headers=admin_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_scope_success(self, async_test_client, admin_headers):
        """测试更新权限成功"""
        scope_data = gen_test_scope()
        create_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data, headers=admin_headers
        )
        scope_id = create_response.json()["id"]

        new_name = fake.word() + "_scope_new"
        new_description = fake.sentence()
        response = await async_test_client.post(
            "/api/admin/update_scope",
            json={
                "scope_id": scope_id,
                "name": new_name,
                "description": new_description,
            },
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == new_name
        assert data["description"] == new_description

    @pytest.mark.asyncio
    async def test_update_scope_duplicate_name(self, async_test_client, admin_headers):
        """测试更新权限重复名称"""
        scope_data1 = gen_test_scope()
        scope_data2 = gen_test_scope()
        create_response1 = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data1, headers=admin_headers
        )
        await async_test_client.post(
            "/api/admin/create_scope", json=scope_data2, headers=admin_headers
        )
        scope_id1 = create_response1.json()["id"]

        response = await async_test_client.post(
            "/api/admin/update_scope",
            json={"scope_id": scope_id1, "name": scope_data2["name"]},
            headers=admin_headers,
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_update_scope_not_found(self, async_test_client, admin_headers):
        """测试更新不存在的权限"""
        response = await async_test_client.post(
            "/api/admin/update_scope",
            json={"scope_id": 999999, "name": fake.word()},
            headers=admin_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_scope_disable(self, async_test_client, admin_headers):
        """测试禁用权限"""
        scope_data = gen_test_scope()
        create_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data, headers=admin_headers
        )
        scope_id = create_response.json()["id"]

        response = await async_test_client.post(
            "/api/admin/update_scope",
            json={"scope_id": scope_id, "yn": 0},
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert response.json()["yn"] == 0

    @pytest.mark.asyncio
    async def test_remove_scope_success(self, async_test_client, admin_headers):
        """测试删除权限成功"""
        scope_data = gen_test_scope()
        create_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data, headers=admin_headers
        )
        scope_id = create_response.json()["id"]

        response = await async_test_client.post(
            "/api/admin/remove_scope",
            json={"scope_id": scope_id},
            headers=admin_headers,
        )
        assert response.status_code == 200

        # 验证权限已删除
        get_response = await async_test_client.get(
            f"/api/admin/scope/{scope_id}", headers=admin_headers
        )
        assert get_response.status_code == 404


class TestAdminRelationAPI:
    """关联关系管理API测试类"""

    @pytest.mark.asyncio
    async def test_add_user_group_relation_success(
        self, async_test_client, admin_headers
    ):
        """测试添加用户-组关联成功"""
        # 创建用户
        user_data = gen_test_user()
        user_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        user_id = user_response.json()["id"]

        # 创建组
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data, headers=admin_headers
        )
        group_id = group_response.json()["id"]

        # 添加关联
        response = await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": [{"user_id": user_id, "group_id": group_id}]},
            headers=admin_headers,
        )
        assert response.status_code == 201

        # 验证关联成功
        user_detail = await async_test_client.get(
            f"/api/admin/user/{user_id}", headers=admin_headers
        )
        groups = user_detail.json()["groups"]
        assert any(g["id"] == group_id for g in groups)

    @pytest.mark.asyncio
    async def test_add_user_group_multiple(self, async_test_client, admin_headers):
        """测试批量添加用户-组关联"""
        # 创建多个用户
        user_ids = []
        for _ in range(2):
            user_data = gen_test_user()
            user_response = await async_test_client.post(
                "/api/admin/create_user", json=user_data, headers=admin_headers
            )
            user_ids.append(user_response.json()["id"])

        # 创建多个组
        group_ids = []
        for _ in range(2):
            group_data = gen_test_group()
            group_response = await async_test_client.post(
                "/api/admin/create_group", json=group_data, headers=admin_headers
            )
            group_ids.append(group_response.json()["id"])

        # 批量添加关联
        relations = [
            {"user_id": uid, "group_id": gid} for uid, gid in zip(user_ids, group_ids)
        ]
        response = await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": relations},
            headers=admin_headers,
        )
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_remove_user_group_relation_success(
        self, async_test_client, admin_headers
    ):
        """测试移除用户-组关联成功"""
        # 创建用户和组
        user_data = gen_test_user()
        user_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        user_id = user_response.json()["id"]

        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data, headers=admin_headers
        )
        group_id = group_response.json()["id"]

        # 添加关联
        await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": [{"user_id": user_id, "group_id": group_id}]},
            headers=admin_headers,
        )

        # 移除关联
        response = await async_test_client.post(
            "/api/admin/user-group/remove",
            json={"relations": [{"user_id": user_id, "group_id": group_id}]},
            headers=admin_headers,
        )
        assert response.status_code == 200

        # 验证关联已移除
        user_detail = await async_test_client.get(
            f"/api/admin/user/{user_id}", headers=admin_headers
        )
        groups = user_detail.json()["groups"]
        assert not any(g["id"] == group_id for g in groups)

    @pytest.mark.asyncio
    async def test_add_group_scope_relation_success(
        self, async_test_client, admin_headers
    ):
        """测试添加组-权限关联成功"""
        # 创建组
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data, headers=admin_headers
        )
        group_id = group_response.json()["id"]

        # 创建权限
        scope_data = gen_test_scope()
        scope_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data, headers=admin_headers
        )
        scope_id = scope_response.json()["id"]

        # 添加关联
        response = await async_test_client.post(
            "/api/admin/group-scope/add",
            json={"relations": [{"group_id": group_id, "scope_id": scope_id}]},
            headers=admin_headers,
        )
        assert response.status_code == 201

        # 验证关联成功
        group_detail = await async_test_client.get(
            f"/api/admin/group/{group_id}", headers=admin_headers
        )
        scopes = group_detail.json()["scopes"]
        assert any(s["id"] == scope_id for s in scopes)

    @pytest.mark.asyncio
    async def test_add_group_scope_multiple(self, async_test_client, admin_headers):
        """测试批量添加组-权限关联"""
        # 创建多个组
        group_ids = []
        for _ in range(2):
            group_data = gen_test_group()
            group_response = await async_test_client.post(
                "/api/admin/create_group", json=group_data, headers=admin_headers
            )
            group_ids.append(group_response.json()["id"])

        # 创建多个权限
        scope_ids = []
        for _ in range(2):
            scope_data = gen_test_scope()
            scope_response = await async_test_client.post(
                "/api/admin/create_scope", json=scope_data, headers=admin_headers
            )
            scope_ids.append(scope_response.json()["id"])

        # 批量添加关联
        relations = [
            {"group_id": gid, "scope_id": sid} for gid, sid in zip(group_ids, scope_ids)
        ]
        response = await async_test_client.post(
            "/api/admin/group-scope/add",
            json={"relations": relations},
            headers=admin_headers,
        )
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_remove_group_scope_relation_success(
        self, async_test_client, admin_headers
    ):
        """测试移除组-权限关联成功"""
        # 创建组和权限
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data, headers=admin_headers
        )
        group_id = group_response.json()["id"]

        scope_data = gen_test_scope()
        scope_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data, headers=admin_headers
        )
        scope_id = scope_response.json()["id"]

        # 添加关联
        await async_test_client.post(
            "/api/admin/group-scope/add",
            json={"relations": [{"group_id": group_id, "scope_id": scope_id}]},
            headers=admin_headers,
        )

        # 移除关联
        response = await async_test_client.post(
            "/api/admin/group-scope/remove",
            json={"relations": [{"group_id": group_id, "scope_id": scope_id}]},
            headers=admin_headers,
        )
        assert response.status_code == 200

        # 验证关联已移除
        group_detail = await async_test_client.get(
            f"/api/admin/group/{group_id}", headers=admin_headers
        )
        scopes = group_detail.json()["scopes"]
        assert not any(s["id"] == scope_id for s in scopes)


class TestAdminComplexScenario:
    """复杂场景测试类"""

    @pytest.mark.asyncio
    async def test_user_group_scope_chain(self, async_test_client, admin_headers):
        """测试用户-组-权限链式关联"""
        # 创建用户
        user_data = gen_test_user()
        user_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        user_id = user_response.json()["id"]

        # 创建组
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data, headers=admin_headers
        )
        group_id = group_response.json()["id"]

        # 创建权限
        scope_data = gen_test_scope()
        scope_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data, headers=admin_headers
        )
        scope_id = scope_response.json()["id"]

        # 用户-组关联
        await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": [{"user_id": user_id, "group_id": group_id}]},
            headers=admin_headers,
        )

        # 组-权限关联
        await async_test_client.post(
            "/api/admin/group-scope/add",
            json={"relations": [{"group_id": group_id, "scope_id": scope_id}]},
            headers=admin_headers,
        )

        # 验证用户拥有该权限
        user_detail = await async_test_client.get(
            f"/api/admin/user/{user_id}", headers=admin_headers
        )
        user_data_detail = user_detail.json()
        assert any(g["id"] == group_id for g in user_data_detail["groups"])
        assert any(s["id"] == scope_id for s in user_data_detail["scopes"])

        # 验证组包含用户和权限
        group_detail = await async_test_client.get(
            f"/api/admin/group/{group_id}", headers=admin_headers
        )
        group_data_detail = group_detail.json()
        assert any(u["id"] == user_id for u in group_data_detail["users"])
        assert any(s["id"] == scope_id for s in group_data_detail["scopes"])

        # 验证权限包含组和用户
        scope_detail = await async_test_client.get(
            f"/api/admin/scope/{scope_id}", headers=admin_headers
        )
        scope_data_detail = scope_detail.json()
        assert any(g["id"] == group_id for g in scope_data_detail["groups"])
        assert any(u["id"] == user_id for u in scope_data_detail["users"])

    @pytest.mark.asyncio
    async def test_multiple_users_one_group(self, async_test_client, admin_headers):
        """测试多个用户加入一个组"""
        # 创建组
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data, headers=admin_headers
        )
        group_id = group_response.json()["id"]

        # 创建多个用户并加入组
        user_ids = []
        for _ in range(5):
            user_data = gen_test_user()
            user_response = await async_test_client.post(
                "/api/admin/create_user", json=user_data, headers=admin_headers
            )
            user_id = user_response.json()["id"]
            user_ids.append(user_id)

        # 批量添加用户到组
        relations = [{"user_id": uid, "group_id": group_id} for uid in user_ids]
        await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": relations},
            headers=admin_headers,
        )

        # 验证组包含所有用户
        group_detail = await async_test_client.get(
            f"/api/admin/group/{group_id}", headers=admin_headers
        )
        group_users = group_detail.json()["users"]
        assert len(group_users) == 5
        for user_id in user_ids:
            assert any(u["id"] == user_id for u in group_users)

    @pytest.mark.asyncio
    async def test_one_user_multiple_groups(self, async_test_client, admin_headers):
        """测试一个用户加入多个组"""
        # 创建用户
        user_data = gen_test_user()
        user_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        user_id = user_response.json()["id"]

        # 创建多个组
        group_ids = []
        for _ in range(5):
            group_data = gen_test_group()
            group_response = await async_test_client.post(
                "/api/admin/create_group", json=group_data, headers=admin_headers
            )
            group_id = group_response.json()["id"]
            group_ids.append(group_id)

        # 批量添加用户到组
        relations = [{"user_id": user_id, "group_id": gid} for gid in group_ids]
        await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": relations},
            headers=admin_headers,
        )

        # 验证用户属于所有组
        user_detail = await async_test_client.get(
            f"/api/admin/user/{user_id}", headers=admin_headers
        )
        user_groups = user_detail.json()["groups"]
        assert len(user_groups) == 5
        for group_id in group_ids:
            assert any(g["id"] == group_id for g in user_groups)

    @pytest.mark.asyncio
    async def test_full_user_lifecycle(self, async_test_client, admin_headers):
        """测试用户完整生命周期"""
        # 1. 创建用户
        user_data = gen_test_user()
        user_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data, headers=admin_headers
        )
        assert user_response.status_code == 201
        user_id = user_response.json()["id"]

        # 2. 创建组和权限
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data, headers=admin_headers
        )
        group_id = group_response.json()["id"]

        scope_data = gen_test_scope()
        scope_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data, headers=admin_headers
        )
        scope_id = scope_response.json()["id"]

        # 3. 添加用户到组
        await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": [{"user_id": user_id, "group_id": group_id}]},
            headers=admin_headers,
        )

        # 4. 添加权限到组
        await async_test_client.post(
            "/api/admin/group-scope/add",
            json={"relations": [{"group_id": group_id, "scope_id": scope_id}]},
            headers=admin_headers,
        )

        # 5. 更新用户信息
        new_username = fake.name()
        await async_test_client.post(
            "/api/admin/update_user",
            json={"user_id": user_id, "username": new_username},
            headers=admin_headers,
        )

        # 6. 禁用用户
        await async_test_client.post(
            "/api/admin/update_user",
            json={"user_id": user_id, "yn": 0},
            headers=admin_headers,
        )

        # 7. 验证最终状态
        user_detail = await async_test_client.get(
            f"/api/admin/user/{user_id}", headers=admin_headers
        )
        user_info = user_detail.json()
        assert user_info["username"] == new_username
        assert user_info["yn"] == 0
        assert len(user_info["groups"]) == 1
        assert len(user_info["scopes"]) == 1

        # 8. 删除用户
        await async_test_client.post(
            "/api/admin/remove_user",
            json={"user_id": user_id},
            headers=admin_headers,
        )

        # 9. 验证用户已删除
        get_response = await async_test_client.get(
            f"/api/admin/user/{user_id}", headers=admin_headers
        )
        assert get_response.status_code == 404
