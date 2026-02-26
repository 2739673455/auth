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
    suffix = uuid.uuid4().hex[:8]
    return {
        "username": f"{fake.name()}_{suffix}",
        "email": f"{fake.user_name()}_{suffix}@test.com",
        "password": fake.password(),
    }


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
async def admin_token(async_test_client: AsyncClient):
    """获取管理员token"""
    response = await async_test_client.post(
        "/api/login",
        json={"email": CFG.admin.email, "password": CFG.admin.password},
    )
    assert response.status_code == 200
    return response.cookies.get("access_token")


class TestAdminUserAPI:
    """用户管理API测试类"""

    @pytest.mark.asyncio
    async def test_create_user_success(self, async_test_client, admin_token):
        """测试创建用户成功"""
        user_data = gen_test_user()
        response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["username"] == user_data["username"]
        assert data["yn"] == 1
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_user_duplicate_email(self, async_test_client, admin_token):
        """测试创建用户重复邮箱"""
        user_data = gen_test_user()
        # 第一次创建
        await async_test_client.post("/api/admin/create_user", json=user_data)
        # 重复创建应失败
        response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_create_user_invalid_email(self, async_test_client, admin_token):
        """测试创建用户无效邮箱"""
        user_data = gen_test_user()
        user_data["email"] = "invalid_email"
        response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_user_invalid_username(self, async_test_client, admin_token):
        """测试创建用户无效用户名"""
        user_data = gen_test_user()
        user_data["username"] = "user@name"  # 用户名不能包含@
        response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_user_short_password(self, async_test_client, admin_token):
        """测试创建用户密码过短"""
        user_data = gen_test_user()
        user_data["password"] = "123"  # 密码少于6个字符
        response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_users(self, async_test_client, admin_token):
        """测试查询用户列表"""
        # 先创建几个用户
        for _ in range(3):
            user_data = gen_test_user()
            await async_test_client.post("/api/admin/create_user", json=user_data)

        response = await async_test_client.get("/api/admin/list_users")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert len(data["items"]) >= 3

    @pytest.mark.asyncio
    async def test_list_users_pagination(self, async_test_client, admin_token):
        """测试用户列表分页"""
        response = await async_test_client.get(
            "/api/admin/list_users?offset=0&limit=10"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 10

    @pytest.mark.asyncio
    async def test_list_users_search(self, async_test_client, admin_token):
        """测试用户列表搜索"""
        user_data = gen_test_user()
        await async_test_client.post("/api/admin/create_user", json=user_data)

        response = await async_test_client.get(
            f"/api/admin/list_users?keyword={user_data['username']}",
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_get_user_detail(self, async_test_client, admin_token):
        """测试查询用户详情"""
        user_data = gen_test_user()
        create_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        user_id = create_response.json()["id"]

        response = await async_test_client.get(f"/api/admin/user/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["username"] == user_data["username"]
        assert "groups" in data
        assert "scopes" in data

    @pytest.mark.asyncio
    async def test_get_user_detail_not_found(self, async_test_client, admin_token):
        """测试查询不存在的用户详情"""
        response = await async_test_client.get("/api/admin/user/999999")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_user_success(self, async_test_client, admin_token):
        """测试更新用户成功"""
        user_data = gen_test_user()
        create_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        user_id = create_response.json()["id"]

        new_username = fake.name()
        response = await async_test_client.post(
            "/api/admin/update_user",
            json={"user_id": user_id, "username": new_username},
        )
        assert response.status_code == 200

        # 验证更新成功
        get_response = await async_test_client.get(f"/api/admin/user/{user_id}")
        assert get_response.json()["username"] == new_username

    @pytest.mark.asyncio
    async def test_update_user_email(self, async_test_client, admin_token):
        """测试更新用户邮箱"""
        user_data = gen_test_user()
        create_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        user_id = create_response.json()["id"]

        new_email = fake.email()
        response = await async_test_client.post(
            "/api/admin/update_user",
            json={"user_id": user_id, "email": new_email},
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_user_duplicate_email(self, async_test_client, admin_token):
        """测试更新用户重复邮箱"""
        user_data1 = gen_test_user()
        user_data2 = gen_test_user()
        create_response1 = await async_test_client.post(
            "/api/admin/create_user", json=user_data1
        )
        await async_test_client.post("/api/admin/create_user", json=user_data2)
        user_id1 = create_response1.json()["id"]

        response = await async_test_client.post(
            "/api/admin/update_user",
            json={"user_id": user_id1, "email": user_data2["email"]},
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_update_user_not_found(self, async_test_client, admin_token):
        """测试更新不存在的用户"""
        response = await async_test_client.post(
            "/api/admin/update_user",
            json={"user_id": 999999, "username": fake.name()},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_user_disable(self, async_test_client, admin_token):
        """测试禁用用户"""
        user_data = gen_test_user()
        create_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        user_id = create_response.json()["id"]

        response = await async_test_client.post(
            "/api/admin/update_user",
            json={"user_id": user_id, "yn": 0},
        )
        assert response.status_code == 200

        get_response = await async_test_client.get(f"/api/admin/user/{user_id}")
        assert get_response.json()["yn"] == 0

    @pytest.mark.asyncio
    async def test_remove_user_success(self, async_test_client, admin_token):
        """测试删除用户成功"""
        user_data = gen_test_user()
        create_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        user_id = create_response.json()["id"]

        response = await async_test_client.post(
            "/api/admin/remove_user",
            json={"user_id": user_id},
        )
        assert response.status_code == 200

        # 验证用户已删除
        get_response = await async_test_client.get(f"/api/admin/user/{user_id}")
        assert get_response.status_code == 404


class TestAdminGroupAPI:
    """组管理API测试类"""

    @pytest.mark.asyncio
    async def test_create_group_success(self, async_test_client, admin_token):
        """测试创建组成功"""
        group_data = gen_test_group()
        response = await async_test_client.post(
            "/api/admin/create_group",
            json=group_data,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == group_data["name"]
        assert data["yn"] == 1
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_group_duplicate_name(self, async_test_client, admin_token):
        """测试创建组重复名称"""
        group_data = gen_test_group()
        await async_test_client.post("/api/admin/create_group", json=group_data)
        response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_create_group_invalid_name(self, async_test_client, admin_token):
        """测试创建组无效名称"""
        response = await async_test_client.post(
            "/api/admin/create_group",
            json={"name": ""},  # 空名称
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_groups(self, async_test_client, admin_token):
        """测试查询组列表"""
        # 先创建几个组
        for _ in range(3):
            group_data = gen_test_group()
            await async_test_client.post("/api/admin/create_group", json=group_data)

        response = await async_test_client.get("/api/admin/list_groups")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert len(data["items"]) >= 3

    @pytest.mark.asyncio
    async def test_list_groups_pagination(self, async_test_client, admin_token):
        """测试组列表分页"""
        response = await async_test_client.get(
            "/api/admin/list_groups?offset=0&limit=2"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 2

    @pytest.mark.asyncio
    async def test_list_groups_search(self, async_test_client, admin_token):
        """测试组列表搜索"""
        group_data = gen_test_group()
        await async_test_client.post("/api/admin/create_group", json=group_data)

        response = await async_test_client.get(
            f"/api/admin/list_groups?keyword={group_data['name']}",
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_get_group_detail(self, async_test_client, admin_token):
        """测试查询组详情"""
        group_data = gen_test_group()
        create_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        group_id = create_response.json()["id"]

        response = await async_test_client.get(f"/api/admin/group/{group_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == group_data["name"]
        assert "users" in data
        assert "scopes" in data

    @pytest.mark.asyncio
    async def test_get_group_detail_not_found(self, async_test_client, admin_token):
        """测试查询不存在的组详情"""
        response = await async_test_client.get("/api/admin/group/999999")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_group_success(self, async_test_client, admin_token):
        """测试更新组成功"""
        group_data = gen_test_group()
        create_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        group_id = create_response.json()["id"]

        new_name = fake.word() + "_group_new"
        response = await async_test_client.post(
            "/api/admin/update_group",
            json={"group_id": group_id, "name": new_name},
        )
        assert response.status_code == 200
        assert response.json()["name"] == new_name

    @pytest.mark.asyncio
    async def test_update_group_duplicate_name(self, async_test_client, admin_token):
        """测试更新组重复名称"""
        group_data1 = gen_test_group()
        group_data2 = gen_test_group()
        create_response1 = await async_test_client.post(
            "/api/admin/create_group", json=group_data1
        )
        await async_test_client.post("/api/admin/create_group", json=group_data2)
        group_id1 = create_response1.json()["id"]

        response = await async_test_client.post(
            "/api/admin/update_group",
            json={"group_id": group_id1, "name": group_data2["name"]},
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_update_group_not_found(self, async_test_client, admin_token):
        """测试更新不存在的组"""
        response = await async_test_client.post(
            "/api/admin/update_group",
            json={"group_id": 999999, "name": fake.word()},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_group_disable(self, async_test_client, admin_token):
        """测试禁用组"""
        group_data = gen_test_group()
        create_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        group_id = create_response.json()["id"]

        response = await async_test_client.post(
            "/api/admin/update_group",
            json={"group_id": group_id, "yn": 0},
        )
        assert response.status_code == 200
        assert response.json()["yn"] == 0

    @pytest.mark.asyncio
    async def test_remove_group_success(self, async_test_client, admin_token):
        """测试删除组成功"""
        group_data = gen_test_group()
        create_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        group_id = create_response.json()["id"]

        response = await async_test_client.post(
            "/api/admin/remove_group",
            json={"group_id": group_id},
        )
        assert response.status_code == 200

        # 验证组已删除
        get_response = await async_test_client.get(f"/api/admin/group/{group_id}")
        assert get_response.status_code == 404


class TestAdminScopeAPI:
    """权限管理API测试类"""

    @pytest.mark.asyncio
    async def test_create_scope_success(self, async_test_client, admin_token):
        """测试创建权限成功"""
        scope_data = gen_test_scope()
        response = await async_test_client.post(
            "/api/admin/create_scope",
            json=scope_data,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == scope_data["name"]
        assert data["description"] == scope_data["description"]
        assert data["yn"] == 1
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_scope_duplicate_name(self, async_test_client, admin_token):
        """测试创建权限重复名称"""
        scope_data = gen_test_scope()
        await async_test_client.post("/api/admin/create_scope", json=scope_data)
        response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_create_scope_invalid_name(self, async_test_client, admin_token):
        """测试创建权限无效名称"""
        response = await async_test_client.post(
            "/api/admin/create_scope",
            json={"name": ""},  # 空名称
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_scope_without_description(
        self, async_test_client, admin_token
    ):
        """测试创建权限不带描述"""
        response = await async_test_client.post(
            "/api/admin/create_scope",
            json={"name": fake.word() + "_scope"},
        )
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_list_scopes(self, async_test_client, admin_token):
        """测试查询权限列表"""
        # 先创建几个权限
        for _ in range(3):
            scope_data = gen_test_scope()
            await async_test_client.post("/api/admin/create_scope", json=scope_data)

        response = await async_test_client.get("/api/admin/list_scopes")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert len(data["items"]) >= 3

    @pytest.mark.asyncio
    async def test_list_scopes_pagination(self, async_test_client, admin_token):
        """测试权限列表分页"""
        response = await async_test_client.get(
            "/api/admin/list_scopes?offset=0&limit=2"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 2

    @pytest.mark.asyncio
    async def test_list_scopes_search(self, async_test_client, admin_token):
        """测试权限列表搜索"""
        scope_data = gen_test_scope()
        await async_test_client.post("/api/admin/create_scope", json=scope_data)

        response = await async_test_client.get(
            f"/api/admin/list_scopes?keyword={scope_data['name']}",
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_get_scope_detail(self, async_test_client, admin_token):
        """测试查询权限详情"""
        scope_data = gen_test_scope()
        create_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data
        )
        scope_id = create_response.json()["id"]

        response = await async_test_client.get(f"/api/admin/scope/{scope_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == scope_data["name"]
        assert "groups" in data
        assert "users" in data

    @pytest.mark.asyncio
    async def test_get_scope_detail_not_found(self, async_test_client, admin_token):
        """测试查询不存在的权限详情"""
        response = await async_test_client.get("/api/admin/scope/999999")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_scope_success(self, async_test_client, admin_token):
        """测试更新权限成功"""
        scope_data = gen_test_scope()
        create_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data
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
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == new_name
        assert data["description"] == new_description

    @pytest.mark.asyncio
    async def test_update_scope_duplicate_name(self, async_test_client, admin_token):
        """测试更新权限重复名称"""
        scope_data1 = gen_test_scope()
        scope_data2 = gen_test_scope()
        create_response1 = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data1
        )
        await async_test_client.post("/api/admin/create_scope", json=scope_data2)
        scope_id1 = create_response1.json()["id"]

        response = await async_test_client.post(
            "/api/admin/update_scope",
            json={"scope_id": scope_id1, "name": scope_data2["name"]},
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_update_scope_not_found(self, async_test_client, admin_token):
        """测试更新不存在的权限"""
        response = await async_test_client.post(
            "/api/admin/update_scope",
            json={"scope_id": 999999, "name": fake.word()},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_scope_disable(self, async_test_client, admin_token):
        """测试禁用权限"""
        scope_data = gen_test_scope()
        create_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data
        )
        scope_id = create_response.json()["id"]

        response = await async_test_client.post(
            "/api/admin/update_scope",
            json={"scope_id": scope_id, "yn": 0},
        )
        assert response.status_code == 200
        assert response.json()["yn"] == 0

    @pytest.mark.asyncio
    async def test_remove_scope_success(self, async_test_client, admin_token):
        """测试删除权限成功"""
        scope_data = gen_test_scope()
        create_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data
        )
        scope_id = create_response.json()["id"]

        response = await async_test_client.post(
            "/api/admin/remove_scope",
            json={"scope_id": scope_id},
        )
        assert response.status_code == 200

        # 验证权限已删除
        get_response = await async_test_client.get(f"/api/admin/scope/{scope_id}")
        assert get_response.status_code == 404


class TestAdminRelationAPI:
    """关联关系管理API测试类"""

    @pytest.mark.asyncio
    async def test_add_user_group_relation_success(
        self, async_test_client, admin_token
    ):
        """测试添加用户-组关联成功"""
        # 创建用户
        user_data = gen_test_user()
        user_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        user_id = user_response.json()["id"]

        # 创建组
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        group_id = group_response.json()["id"]

        # 添加关联
        response = await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": [{"user_id": user_id, "group_id": group_id}]},
        )
        assert response.status_code == 201

        # 验证关联成功
        user_detail = await async_test_client.get(f"/api/admin/user/{user_id}")
        groups = user_detail.json()["groups"]
        assert any(g["id"] == group_id for g in groups)

    @pytest.mark.asyncio
    async def test_add_user_group_multiple(self, async_test_client, admin_token):
        """测试批量添加用户-组关联"""
        # 创建多个用户
        user_ids = []
        for _ in range(2):
            user_data = gen_test_user()
            user_response = await async_test_client.post(
                "/api/admin/create_user", json=user_data
            )
            user_ids.append(user_response.json()["id"])

        # 创建多个组
        group_ids = []
        for _ in range(2):
            group_data = gen_test_group()
            group_response = await async_test_client.post(
                "/api/admin/create_group", json=group_data
            )
            group_ids.append(group_response.json()["id"])

        # 批量添加关联
        relations = [
            {"user_id": uid, "group_id": gid} for uid, gid in zip(user_ids, group_ids)
        ]
        response = await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": relations},
        )
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_remove_user_group_relation_success(
        self, async_test_client, admin_token
    ):
        """测试移除用户-组关联成功"""
        # 创建用户和组
        user_data = gen_test_user()
        user_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        user_id = user_response.json()["id"]

        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        group_id = group_response.json()["id"]

        # 添加关联
        await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": [{"user_id": user_id, "group_id": group_id}]},
        )

        # 移除关联
        response = await async_test_client.post(
            "/api/admin/user-group/remove",
            json={"relations": [{"user_id": user_id, "group_id": group_id}]},
        )
        assert response.status_code == 200

        # 验证关联已移除
        user_detail = await async_test_client.get(f"/api/admin/user/{user_id}")
        groups = user_detail.json()["groups"]
        assert not any(g["id"] == group_id for g in groups)

    @pytest.mark.asyncio
    async def test_add_group_scope_relation_success(
        self, async_test_client, admin_token
    ):
        """测试添加组-权限关联成功"""
        # 创建组
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        group_id = group_response.json()["id"]

        # 创建权限
        scope_data = gen_test_scope()
        scope_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data
        )
        scope_id = scope_response.json()["id"]

        # 添加关联
        response = await async_test_client.post(
            "/api/admin/group-scope/add",
            json={"relations": [{"group_id": group_id, "scope_id": scope_id}]},
        )
        assert response.status_code == 201

        # 验证关联成功
        group_detail = await async_test_client.get(f"/api/admin/group/{group_id}")
        scopes = group_detail.json()["scopes"]
        assert any(s["id"] == scope_id for s in scopes)

    @pytest.mark.asyncio
    async def test_add_group_scope_multiple(self, async_test_client, admin_token):
        """测试批量添加组-权限关联"""
        # 创建多个组
        group_ids = []
        for _ in range(2):
            group_data = gen_test_group()
            group_response = await async_test_client.post(
                "/api/admin/create_group", json=group_data
            )
            group_ids.append(group_response.json()["id"])

        # 创建多个权限
        scope_ids = []
        for _ in range(2):
            scope_data = gen_test_scope()
            scope_response = await async_test_client.post(
                "/api/admin/create_scope", json=scope_data
            )
            scope_ids.append(scope_response.json()["id"])

        # 批量添加关联
        relations = [
            {"group_id": gid, "scope_id": sid} for gid, sid in zip(group_ids, scope_ids)
        ]
        response = await async_test_client.post(
            "/api/admin/group-scope/add",
            json={"relations": relations},
        )
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_remove_group_scope_relation_success(
        self, async_test_client, admin_token
    ):
        """测试移除组-权限关联成功"""
        # 创建组和权限
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        group_id = group_response.json()["id"]

        scope_data = gen_test_scope()
        scope_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data
        )
        scope_id = scope_response.json()["id"]

        # 添加关联
        await async_test_client.post(
            "/api/admin/group-scope/add",
            json={"relations": [{"group_id": group_id, "scope_id": scope_id}]},
        )

        # 移除关联
        response = await async_test_client.post(
            "/api/admin/group-scope/remove",
            json={"relations": [{"group_id": group_id, "scope_id": scope_id}]},
        )
        assert response.status_code == 200

        # 验证关联已移除
        group_detail = await async_test_client.get(f"/api/admin/group/{group_id}")
        scopes = group_detail.json()["scopes"]
        assert not any(s["id"] == scope_id for s in scopes)


class TestAdminComplexScenario:
    """复杂场景测试类"""

    @pytest.mark.asyncio
    async def test_user_group_scope_chain(self, async_test_client, admin_token):
        """测试用户-组-权限链式关联"""
        # 创建用户
        user_data = gen_test_user()
        user_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        user_id = user_response.json()["id"]

        # 创建组
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        group_id = group_response.json()["id"]

        # 创建权限
        scope_data = gen_test_scope()
        scope_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data
        )
        scope_id = scope_response.json()["id"]

        # 用户-组关联
        await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": [{"user_id": user_id, "group_id": group_id}]},
        )

        # 组-权限关联
        await async_test_client.post(
            "/api/admin/group-scope/add",
            json={"relations": [{"group_id": group_id, "scope_id": scope_id}]},
        )

        # 验证用户拥有该权限
        user_detail = await async_test_client.get(f"/api/admin/user/{user_id}")
        user_data_detail = user_detail.json()
        assert any(g["id"] == group_id for g in user_data_detail["groups"])
        assert any(s["id"] == scope_id for s in user_data_detail["scopes"])

        # 验证组包含用户和权限
        group_detail = await async_test_client.get(f"/api/admin/group/{group_id}")
        group_data_detail = group_detail.json()
        assert any(u["id"] == user_id for u in group_data_detail["users"])
        assert any(s["id"] == scope_id for s in group_data_detail["scopes"])

        # 验证权限包含组和用户
        scope_detail = await async_test_client.get(f"/api/admin/scope/{scope_id}")
        scope_data_detail = scope_detail.json()
        assert any(g["id"] == group_id for g in scope_data_detail["groups"])
        assert any(u["id"] == user_id for u in scope_data_detail["users"])

    @pytest.mark.asyncio
    async def test_multiple_users_one_group(self, async_test_client, admin_token):
        """测试多个用户加入一个组"""
        # 创建组
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        group_id = group_response.json()["id"]

        # 创建多个用户并加入组
        user_ids = []
        for _ in range(5):
            user_data = gen_test_user()
            user_response = await async_test_client.post(
                "/api/admin/create_user", json=user_data
            )
            user_id = user_response.json()["id"]
            user_ids.append(user_id)

        # 批量添加用户到组
        relations = [{"user_id": uid, "group_id": group_id} for uid in user_ids]
        await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": relations},
        )

        # 验证组包含所有用户
        group_detail = await async_test_client.get(f"/api/admin/group/{group_id}")
        group_users = group_detail.json()["users"]
        assert len(group_users) == 5
        for user_id in user_ids:
            assert any(u["id"] == user_id for u in group_users)

    @pytest.mark.asyncio
    async def test_one_user_multiple_groups(self, async_test_client, admin_token):
        """测试一个用户加入多个组"""
        # 创建用户
        user_data = gen_test_user()
        user_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        user_id = user_response.json()["id"]

        # 创建多个组
        group_ids = []
        for _ in range(5):
            group_data = gen_test_group()
            group_response = await async_test_client.post(
                "/api/admin/create_group", json=group_data
            )
            group_id = group_response.json()["id"]
            group_ids.append(group_id)

        # 批量添加用户到组
        relations = [{"user_id": user_id, "group_id": gid} for gid in group_ids]
        await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": relations},
        )

        # 验证用户属于所有组
        user_detail = await async_test_client.get(f"/api/admin/user/{user_id}")
        user_groups = user_detail.json()["groups"]
        assert len(user_groups) == 5
        for group_id in group_ids:
            assert any(g["id"] == group_id for g in user_groups)

    @pytest.mark.asyncio
    async def test_full_user_lifecycle(self, async_test_client, admin_token):
        """测试用户完整生命周期"""
        # 1. 创建用户
        user_data = gen_test_user()
        user_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        assert user_response.status_code == 201
        user_id = user_response.json()["id"]

        # 2. 创建组和权限
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        group_id = group_response.json()["id"]

        scope_data = gen_test_scope()
        scope_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data
        )
        scope_id = scope_response.json()["id"]

        # 3. 添加用户到组
        await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": [{"user_id": user_id, "group_id": group_id}]},
        )

        # 4. 添加权限到组
        await async_test_client.post(
            "/api/admin/group-scope/add",
            json={"relations": [{"group_id": group_id, "scope_id": scope_id}]},
        )

        # 5. 更新用户信息
        new_username = fake.name()
        await async_test_client.post(
            "/api/admin/update_user",
            json={"user_id": user_id, "username": new_username},
        )

        # 6. 禁用用户
        await async_test_client.post(
            "/api/admin/update_user",
            json={"user_id": user_id, "yn": 0},
        )

        # 7. 验证最终状态
        user_detail = await async_test_client.get(f"/api/admin/user/{user_id}")
        user_info = user_detail.json()
        assert user_info["username"] == new_username
        assert user_info["yn"] == 0
        assert len(user_info["groups"]) == 1
        assert len(user_info["scopes"]) == 1

        # 8. 删除用户
        await async_test_client.post(
            "/api/admin/remove_user",
            json={"user_id": user_id},
        )

        # 9. 验证用户已删除
        get_response = await async_test_client.get(f"/api/admin/user/{user_id}")
        assert get_response.status_code == 404


class TestTokenScopeUpdate:
    """令牌权限更新测试类 - 验证组/权限变更后用户令牌权限是否正确更新"""

    @pytest_asyncio.fixture
    async def setup_user_with_scope(self, async_test_client: AsyncClient):
        """创建用户并关联组与权限，返回用户信息和登录凭证"""
        # 创建用户
        user_data = gen_test_user()
        user_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        user_id = user_response.json()["id"]

        # 创建组
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        group_id = group_response.json()["id"]
        group_name = group_data["name"]

        # 创建权限
        scope_data = gen_test_scope()
        scope_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data
        )
        scope_id = scope_response.json()["id"]
        scope_name = scope_data["name"]

        # 用户-组关联
        await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": [{"user_id": user_id, "group_id": group_id}]},
        )

        # 组-权限关联
        await async_test_client.post(
            "/api/admin/group-scope/add",
            json={"relations": [{"group_id": group_id, "scope_id": scope_id}]},
        )

        # 用户登录获取令牌
        login_response = await async_test_client.post(
            "/api/login",
            json={"email": user_data["email"], "password": user_data["password"]},
        )
        assert login_response.status_code == 200
        access_token = login_response.cookies.get("access_token")

        return {
            "user_id": user_id,
            "user_data": user_data,
            "group_id": group_id,
            "group_name": group_name,
            "scope_id": scope_id,
            "scope_name": scope_name,
            "access_token": access_token,
        }

    @pytest.mark.asyncio
    async def test_token_scope_after_disable_group(
        self, async_test_client, admin_token, setup_user_with_scope
    ):
        """测试禁用组后，用户令牌中的权限被移除"""
        setup = setup_user_with_scope

        # 验证初始状态：令牌包含权限（使用用户 token）
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert verify_response.status_code == 200
        assert setup["scope_name"] in verify_response.json()["scope"]

        # 恢复管理员 token
        async_test_client.cookies.set("access_token", admin_token)

        # 禁用组
        response = await async_test_client.post(
            "/api/admin/update_group",
            json={"group_id": setup["group_id"], "yn": 0},
        )
        assert response.status_code == 200

        # 验证令牌权限已更新：权限应被移除（使用用户 token）
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert verify_response.status_code == 200
        assert setup["scope_name"] not in verify_response.json()["scope"]

    @pytest.mark.asyncio
    async def test_token_scope_after_enable_group(
        self, async_test_client, admin_token, setup_user_with_scope
    ):
        """测试启用组后，用户令牌中的权限被恢复"""
        setup = setup_user_with_scope

        # 先禁用组（需要管理员权限）
        async_test_client.cookies.set("access_token", admin_token)
        await async_test_client.post(
            "/api/admin/update_group",
            json={"group_id": setup["group_id"], "yn": 0},
        )

        # 验证权限被移除
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert setup["scope_name"] not in verify_response.json()["scope"]

        # 恢复管理员 token
        async_test_client.cookies.set("access_token", admin_token)

        # 重新启用组
        response = await async_test_client.post(
            "/api/admin/update_group",
            json={"group_id": setup["group_id"], "yn": 1},
        )
        assert response.status_code == 200

        # 验证权限被恢复
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert verify_response.status_code == 200
        assert setup["scope_name"] in verify_response.json()["scope"]

    @pytest.mark.asyncio
    async def test_token_scope_after_disable_scope(
        self, async_test_client, admin_token, setup_user_with_scope
    ):
        """测试禁用权限后，用户令牌中的该权限被移除"""
        setup = setup_user_with_scope

        # 使用用户 token 验证初始状态：令牌包含权限
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert setup["scope_name"] in verify_response.json()["scope"]

        # 恢复管理员 token
        async_test_client.cookies.set("access_token", admin_token)

        # 禁用权限
        response = await async_test_client.post(
            "/api/admin/update_scope",
            json={"scope_id": setup["scope_id"], "yn": 0},
        )
        assert response.status_code == 200

        # 验证令牌权限已更新：权限应被移除
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert verify_response.status_code == 200
        assert setup["scope_name"] not in verify_response.json()["scope"]

    @pytest.mark.asyncio
    async def test_token_scope_after_enable_scope(
        self, async_test_client, admin_token, setup_user_with_scope
    ):
        """测试启用权限后，用户令牌中的该权限被恢复"""
        setup = setup_user_with_scope

        # 先禁用权限（需要管理员权限）
        async_test_client.cookies.set("access_token", admin_token)
        await async_test_client.post(
            "/api/admin/update_scope",
            json={"scope_id": setup["scope_id"], "yn": 0},
        )

        # 验证权限被移除
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert setup["scope_name"] not in verify_response.json()["scope"]

        # 恢复管理员 token
        async_test_client.cookies.set("access_token", admin_token)

        # 重新启用权限
        response = await async_test_client.post(
            "/api/admin/update_scope",
            json={"scope_id": setup["scope_id"], "yn": 1},
        )
        assert response.status_code == 200

        # 验证权限被恢复
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert verify_response.status_code == 200
        assert setup["scope_name"] in verify_response.json()["scope"]

    @pytest.mark.asyncio
    async def test_token_scope_after_add_scope_to_group(
        self, async_test_client, admin_token
    ):
        """测试给组添加权限后，组内用户令牌包含新权限"""
        # 创建用户
        user_data = gen_test_user()
        user_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        user_id = user_response.json()["id"]

        # 创建组
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        group_id = group_response.json()["id"]

        # 创建两个权限
        scope_data1 = gen_test_scope()
        scope_response1 = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data1
        )
        scope_id1 = scope_response1.json()["id"]
        scope_name1 = scope_data1["name"]

        scope_data2 = gen_test_scope()
        scope_response2 = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data2
        )
        scope_name2 = scope_data2["name"]

        # 用户-组关联
        await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": [{"user_id": user_id, "group_id": group_id}]},
        )

        # 组-权限关联（只添加第一个权限）
        await async_test_client.post(
            "/api/admin/group-scope/add",
            json={"relations": [{"group_id": group_id, "scope_id": scope_id1}]},
        )

        # 用户登录
        login_response = await async_test_client.post(
            "/api/login",
            json={"email": user_data["email"], "password": user_data["password"]},
        )
        assert login_response.status_code == 200
        access_token = login_response.cookies.get("access_token")

        # 验证初始状态：只有第一个权限
        async_test_client.cookies.set("access_token", access_token)
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert scope_name1 in verify_response.json()["scope"]
        assert scope_name2 not in verify_response.json()["scope"]

        # 恢复管理员 token
        async_test_client.cookies.set("access_token", admin_token)

        # 添加第二个权限到组
        await async_test_client.post(
            "/api/admin/group-scope/add",
            json={
                "relations": [
                    {"group_id": group_id, "scope_id": scope_response2.json()["id"]}
                ]
            },
        )

        # 验证令牌包含新权限
        async_test_client.cookies.set("access_token", access_token)
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert verify_response.status_code == 200
        assert scope_name1 in verify_response.json()["scope"]
        assert scope_name2 in verify_response.json()["scope"]

    @pytest.mark.asyncio
    async def test_token_scope_after_remove_scope_from_group(
        self, async_test_client, admin_token, setup_user_with_scope
    ):
        """测试从组移除权限后，用户令牌中该权限被移除"""
        setup = setup_user_with_scope

        # 验证初始状态：令牌包含权限
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert setup["scope_name"] in verify_response.json()["scope"]

        # 恢复管理员 token
        async_test_client.cookies.set("access_token", admin_token)

        # 从组移除权限
        response = await async_test_client.post(
            "/api/admin/group-scope/remove",
            json={
                "relations": [
                    {"group_id": setup["group_id"], "scope_id": setup["scope_id"]}
                ]
            },
        )
        assert response.status_code == 200

        # 验证令牌权限已更新：权限应被移除
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert verify_response.status_code == 200
        assert setup["scope_name"] not in verify_response.json()["scope"]

    @pytest.mark.asyncio
    async def test_token_scope_after_remove_user_from_group(
        self, async_test_client, admin_token, setup_user_with_scope
    ):
        """测试将用户从组移除后，用户令牌中该组的权限被移除"""
        setup = setup_user_with_scope

        # 验证初始状态：令牌包含权限
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert setup["scope_name"] in verify_response.json()["scope"]

        # 恢复管理员 token
        async_test_client.cookies.set("access_token", admin_token)

        # 将用户从组移除
        response = await async_test_client.post(
            "/api/admin/user-group/remove",
            json={
                "relations": [
                    {"user_id": setup["user_id"], "group_id": setup["group_id"]}
                ]
            },
        )
        assert response.status_code == 200

        # 验证令牌权限已更新：权限应被移除
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert verify_response.status_code == 200
        assert setup["scope_name"] not in verify_response.json()["scope"]

    @pytest.mark.asyncio
    async def test_token_scope_after_add_user_to_group(
        self, async_test_client, admin_token
    ):
        """测试将用户添加到组后，用户令牌获得该组的权限"""
        # 创建用户
        user_data = gen_test_user()
        user_response = await async_test_client.post(
            "/api/admin/create_user", json=user_data
        )
        user_id = user_response.json()["id"]

        # 创建组
        group_data = gen_test_group()
        group_response = await async_test_client.post(
            "/api/admin/create_group", json=group_data
        )
        group_id = group_response.json()["id"]

        # 创建权限
        scope_data = gen_test_scope()
        scope_response = await async_test_client.post(
            "/api/admin/create_scope", json=scope_data
        )
        scope_name = scope_data["name"]

        # 组-权限关联
        await async_test_client.post(
            "/api/admin/group-scope/add",
            json={
                "relations": [
                    {"group_id": group_id, "scope_id": scope_response.json()["id"]}
                ]
            },
        )

        # 用户登录
        login_response = await async_test_client.post(
            "/api/login",
            json={"email": user_data["email"], "password": user_data["password"]},
        )
        assert login_response.status_code == 200
        access_token = login_response.cookies.get("access_token")

        # 验证初始状态：没有权限
        async_test_client.cookies.set("access_token", access_token)
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert scope_name not in verify_response.json()["scope"]

        # 恢复管理员 token
        async_test_client.cookies.set("access_token", admin_token)

        # 将用户添加到组
        await async_test_client.post(
            "/api/admin/user-group/add",
            json={"relations": [{"user_id": user_id, "group_id": group_id}]},
        )

        # 验证令牌获得权限
        async_test_client.cookies.set("access_token", access_token)
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert verify_response.status_code == 200
        assert scope_name in verify_response.json()["scope"]

    @pytest.mark.asyncio
    async def test_token_scope_after_delete_scope(
        self, async_test_client, admin_token, setup_user_with_scope
    ):
        """测试删除权限后，用户令牌中该权限被移除"""
        setup = setup_user_with_scope

        # 验证初始状态：令牌包含权限
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert setup["scope_name"] in verify_response.json()["scope"]

        # 恢复管理员 token
        async_test_client.cookies.set("access_token", admin_token)

        # 删除权限
        response = await async_test_client.post(
            "/api/admin/remove_scope",
            json={"scope_id": setup["scope_id"]},
        )
        assert response.status_code == 200

        # 验证令牌权限已更新：权限应被移除
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert verify_response.status_code == 200
        assert setup["scope_name"] not in verify_response.json()["scope"]

    @pytest.mark.asyncio
    async def test_token_scope_after_delete_group(
        self, async_test_client, admin_token, setup_user_with_scope
    ):
        """测试删除组后，用户令牌中该组的权限被移除"""
        setup = setup_user_with_scope

        # 验证初始状态：令牌包含权限
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert setup["scope_name"] in verify_response.json()["scope"]

        # 恢复管理员 token
        async_test_client.cookies.set("access_token", admin_token)

        # 删除组
        response = await async_test_client.post(
            "/api/admin/remove_group",
            json={"group_id": setup["group_id"]},
        )
        assert response.status_code == 200

        # 验证令牌权限已更新：权限应被移除
        async_test_client.cookies.set("access_token", setup["access_token"])
        verify_response = await async_test_client.get("/api/verify_access_token")
        assert verify_response.status_code == 200
        assert setup["scope_name"] not in verify_response.json()["scope"]
