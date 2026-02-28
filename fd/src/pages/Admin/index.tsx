import { AxiosError } from "axios";
import {
	AlertCircle,
	ArrowDownAz,
	ArrowUpAz,
	ArrowUpDown,
	Check,
	Edit,
	Loader2,
	Plus,
	Shield,
	Trash2,
	User,
	Users,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch as SwitchUI } from "@/components/ui/switch";
import { handleApiError } from "@/lib/error";
import {
	validateEmailWithError,
	validatePasswordWithError,
	validateUsernameWithError,
} from "@/lib/validation";
import {
	adminGroupApi,
	adminRelationApi,
	adminScopeApi,
	adminUserApi,
} from "../../api/admin";
import { useAuthStore } from "../../stores/authStore";
import type {
	CreateGroupRequest,
	CreateScopeRequest,
	CreateUserRequest,
	GroupDetailResponse,
	GroupInfo,
	ScopeDetailResponse,
	ScopeInfo,
	UpdateGroupRequest,
	UpdateScopeRequest,
	UpdateUserRequest,
	UserDetailResponse,
	UserInfo,
} from "../../types";
import { RelationEditor } from "./components/RelationEditor";

type SortField = "id" | "username" | "email" | "name";
type SortOrder = "asc" | "desc";

interface SortState {
	field: SortField;
	order: SortOrder;
}

interface FilterState {
	userId: number | null;
	groupId: number | null;
	scopeId: number | null;
}

export default function AdminPanel() {
	const navigate = useNavigate();
	const { logout } = useAuthStore();

	// 数据
	const [users, setUsers] = useState<UserInfo[]>([]);
	const [groups, setGroups] = useState<GroupInfo[]>([]);
	const [scopes, setScopes] = useState<ScopeInfo[]>([]);
	const [userDetail, setUserDetail] = useState<UserDetailResponse | null>(null);
	const [groupDetail, setGroupDetail] = useState<GroupDetailResponse | null>(
		null,
	);
	const [scopeDetail, setScopeDetail] = useState<ScopeDetailResponse | null>(
		null,
	);

	// 加载状态
	const [loading, setLoading] = useState(true);

	// 排序状态
	const [userSort, setUserSort] = useState<SortState>({
		field: "id",
		order: "asc",
	});
	const [groupSort, setGroupSort] = useState<SortState>({
		field: "id",
		order: "asc",
	});
	const [scopeSort, setScopeSort] = useState<SortState>({
		field: "id",
		order: "asc",
	});

	// 筛选状态
	const [filter, setFilter] = useState<FilterState>({
		userId: null,
		groupId: null,
		scopeId: null,
	});

	// 搜索状态
	const [userSearch, setUserSearch] = useState("");
	const [groupSearch, setGroupSearch] = useState("");
	const [scopeSearch, setScopeSearch] = useState("");

	// 弹窗状态
	const [createUserOpen, setCreateUserOpen] = useState(false);
	const [editUserOpen, setEditUserOpen] = useState(false);
	const [createGroupOpen, setCreateGroupOpen] = useState(false);
	const [editGroupOpen, setEditGroupOpen] = useState(false);
	const [createScopeOpen, setCreateScopeOpen] = useState(false);
	const [editScopeOpen, setEditScopeOpen] = useState(false);

	// 表单状态 - 创建用户
	const [newUserEmail, setNewUserEmail] = useState("");
	const [newUserUsername, setNewUserUsername] = useState("");
	const [newUserPassword, setNewUserPassword] = useState("");
	const [createUserLoading, setCreateUserLoading] = useState(false);

	// 表单状态 - 编辑用户
	const [editUserId, setEditUserId] = useState<number | null>(null);
	const [editUserUsernameVal, setEditUserUsernameVal] = useState("");
	const [editUserEmailVal, setEditUserEmailVal] = useState("");
	const [editUserPasswordVal, setEditUserPasswordVal] = useState("");
	const [editUserYn, setEditUserYn] = useState(1);
	const [editUserLoading, setEditUserLoading] = useState(false);
	const [editUserGroups, setEditUserGroups] = useState<number[]>([]);
	const [originalUserGroups, setOriginalUserGroups] = useState<number[]>([]);
	const [editUserRelationOpen, setEditUserRelationOpen] = useState(false);

	// 表单状态 - 创建组
	const [newGroupName, setNewGroupName] = useState("");
	const [createGroupLoading, setCreateGroupLoading] = useState(false);

	// 表单状态 - 编辑组
	const [editGroupId, setEditGroupId] = useState<number | null>(null);
	const [editGroupNameVal, setEditGroupNameVal] = useState("");
	const [editGroupYn, setEditGroupYn] = useState(1);
	const [editGroupLoading, setEditGroupLoading] = useState(false);
	const [editGroupUsers, setEditGroupUsers] = useState<number[]>([]);
	const [originalGroupUsers, setOriginalGroupUsers] = useState<number[]>([]);
	const [editGroupScopes, setEditGroupScopes] = useState<number[]>([]);
	const [originalGroupScopes, setOriginalGroupScopes] = useState<number[]>([]);
	const [editGroupRelationOpen, setEditGroupRelationOpen] = useState(false);
	const [editGroupRelationTab, setEditGroupRelationTab] = useState<
		"users" | "scopes"
	>("users");

	// 表单状态 - 创建权限
	const [newScopeName, setNewScopeName] = useState("");
	const [newScopeDesc, setNewScopeDesc] = useState("");
	const [createScopeLoading, setCreateScopeLoading] = useState(false);

	// 表单状态 - 编辑权限
	const [editScopeId, setEditScopeId] = useState<number | null>(null);
	const [editScopeNameVal, setEditScopeNameVal] = useState("");
	const [editScopeDescVal, setEditScopeDescVal] = useState("");
	const [editScopeYn, setEditScopeYn] = useState(1);
	const [editScopeLoading, setEditScopeLoading] = useState(false);
	const [editScopeGroups, setEditScopeGroups] = useState<number[]>([]);
	const [originalScopeGroups, setOriginalScopeGroups] = useState<number[]>([]);
	const [editScopeRelationOpen, setEditScopeRelationOpen] = useState(false);

	// 编辑组弹窗标签页状态
	const [editGroupTab, setEditGroupTab] = useState<"users" | "scopes">("users");

	// 获取基础数据
	const fetchBaseData = useCallback(async () => {
		setLoading(true);
		try {
			const [usersRes, groupsRes, scopesRes] = await Promise.all([
				adminUserApi.listUsers({ all: true }),
				adminGroupApi.listGroups({ all: true }),
				adminScopeApi.listScopes({ all: true }),
			]);
			setUsers(usersRes.data.items);
			setGroups(groupsRes.data.items);
			setScopes(scopesRes.data.items);
		} catch (error: unknown) {
			if (error instanceof AxiosError && error.response?.status === 401) {
				await logout();
				navigate("/login");
			} else {
				handleApiError(error, "获取数据失败");
			}
		} finally {
			setLoading(false);
		}
	}, [logout, navigate]);

	// 获取详情数据
	const fetchDetail = useCallback(async () => {
		try {
			const promises: Promise<void>[] = [];
			if (filter.userId) {
				promises.push(
					adminUserApi
						.getUser(filter.userId)
						.then((res) => setUserDetail(res.data)),
				);
			} else {
				setUserDetail(null);
			}
			if (filter.groupId) {
				promises.push(
					adminGroupApi
						.getGroup(filter.groupId)
						.then((res) => setGroupDetail(res.data)),
				);
			} else {
				setGroupDetail(null);
			}
			if (filter.scopeId) {
				promises.push(
					adminScopeApi
						.getScope(filter.scopeId)
						.then((res) => setScopeDetail(res.data)),
				);
			} else {
				setScopeDetail(null);
			}
			await Promise.all(promises);
		} catch (error: unknown) {
			handleApiError(error, "获取详情失败");
		}
	}, [filter]);

	useEffect(() => {
		fetchBaseData();
	}, [fetchBaseData]);

	useEffect(() => {
		if (filter.userId || filter.groupId || filter.scopeId) {
			fetchDetail();
		}
	}, [filter, fetchDetail]);

	// 筛选后的数据
	const filteredUsers = useMemo(() => {
		let result = users;
		// 搜索过滤
		if (userSearch) {
			const search = userSearch.toLowerCase();
			result = result.filter(
				(u) =>
					u.username.toLowerCase().includes(search) ||
					u.email.toLowerCase().includes(search),
			);
		}
		if (filter.groupId && groupDetail) {
			result = result.filter((u) =>
				groupDetail.users.some((gu) => gu.id === u.id),
			);
		}
		if (filter.scopeId && scopeDetail) {
			result = result.filter((u) =>
				scopeDetail.users.some((su) => su.id === u.id),
			);
		}
		return result;
	}, [
		users,
		userSearch,
		filter.groupId,
		filter.scopeId,
		groupDetail,
		scopeDetail,
	]);

	const filteredGroups = useMemo(() => {
		let result = groups;
		// 搜索过滤
		if (groupSearch) {
			const search = groupSearch.toLowerCase();
			result = result.filter((g) => g.name.toLowerCase().includes(search));
		}
		if (filter.userId && userDetail) {
			result = result.filter((g) =>
				userDetail.groups.some((ug) => ug.id === g.id),
			);
		}
		if (filter.scopeId && scopeDetail) {
			result = result.filter((g) =>
				scopeDetail.groups.some((sg) => sg.id === g.id),
			);
		}
		return result;
	}, [
		groups,
		groupSearch,
		filter.userId,
		filter.scopeId,
		userDetail,
		scopeDetail,
	]);

	const filteredScopes = useMemo(() => {
		let result = scopes;
		// 搜索过滤
		if (scopeSearch) {
			const search = scopeSearch.toLowerCase();
			result = result.filter(
				(s) =>
					s.name.toLowerCase().includes(search) ||
					s.description?.toLowerCase().includes(search),
			);
		}
		if (filter.userId && userDetail) {
			result = result.filter((s) =>
				userDetail.scopes.some((us) => us.id === s.id),
			);
		}
		if (filter.groupId && groupDetail) {
			result = result.filter((s) =>
				groupDetail.scopes.some((gs) => gs.id === s.id),
			);
		}
		return result;
	}, [
		scopes,
		scopeSearch,
		filter.userId,
		filter.groupId,
		userDetail,
		groupDetail,
	]);

	// 排序后的数据
	const sortedUsers = useMemo(() => {
		const sorted = [...filteredUsers];
		sorted.sort((a, b) => {
			let cmp = 0;
			if (userSort.field === "id") {
				cmp = a.id - b.id;
			} else if (userSort.field === "username") {
				cmp = a.username.localeCompare(b.username);
			} else if (userSort.field === "email") {
				cmp = a.email.localeCompare(b.email);
			}
			return userSort.order === "asc" ? cmp : -cmp;
		});
		return sorted;
	}, [filteredUsers, userSort]);

	const sortedGroups = useMemo(() => {
		const sorted = [...filteredGroups];
		sorted.sort((a, b) => {
			let cmp = 0;
			if (groupSort.field === "id") {
				cmp = a.id - b.id;
			} else if (groupSort.field === "name") {
				cmp = a.name.localeCompare(b.name);
			}
			return groupSort.order === "asc" ? cmp : -cmp;
		});
		return sorted;
	}, [filteredGroups, groupSort]);

	const sortedScopes = useMemo(() => {
		const sorted = [...filteredScopes];
		sorted.sort((a, b) => {
			let cmp = 0;
			if (scopeSort.field === "id") {
				cmp = a.id - b.id;
			} else if (scopeSort.field === "name") {
				cmp = a.name.localeCompare(b.name);
			}
			return scopeSort.order === "asc" ? cmp : -cmp;
		});
		return sorted;
	}, [filteredScopes, scopeSort]);

	// 点击筛选逻辑
	const handleUserClick = (user: UserInfo) => {
		if (filter.userId === user.id) {
			setFilter((f) => ({ ...f, userId: null }));
		} else {
			setFilter((f) => ({ ...f, userId: user.id }));
		}
	};

	const handleGroupClick = (group: GroupInfo) => {
		if (filter.groupId === group.id) {
			setFilter((f) => ({ ...f, groupId: null }));
		} else {
			setFilter((f) => ({ ...f, groupId: group.id }));
		}
	};

	const handleScopeClick = (scope: ScopeInfo) => {
		if (filter.scopeId === scope.id) {
			setFilter((f) => ({ ...f, scopeId: null }));
		} else {
			setFilter((f) => ({ ...f, scopeId: scope.id }));
		}
	};

	// 清除筛选
	const clearFilter = () => {
		setFilter({ userId: null, groupId: null, scopeId: null });
	};

	// 切换排序
	const toggleUserSort = (field: SortField) => {
		if (userSort.field === field) {
			setUserSort((s) => ({ ...s, order: s.order === "asc" ? "desc" : "asc" }));
		} else {
			setUserSort({ field, order: "asc" });
		}
	};

	const toggleGroupSort = (field: SortField) => {
		if (groupSort.field === field) {
			setGroupSort((s) => ({
				...s,
				order: s.order === "asc" ? "desc" : "asc",
			}));
		} else {
			setGroupSort({ field, order: "asc" });
		}
	};

	const toggleScopeSort = (field: SortField) => {
		if (scopeSort.field === field) {
			setScopeSort((s) => ({
				...s,
				order: s.order === "asc" ? "desc" : "asc",
			}));
		} else {
			setScopeSort({ field, order: "asc" });
		}
	};

	// 创建用户
	const handleCreateUser: React.SubmitEventHandler<HTMLFormElement> = async (
		e,
	) => {
		e.preventDefault();
		const emailResult = validateEmailWithError(newUserEmail);
		if (!emailResult.valid) {
			toast.error(emailResult.error);
			return;
		}
		const usernameResult = validateUsernameWithError(newUserUsername);
		if (!usernameResult.valid) {
			toast.error(usernameResult.error);
			return;
		}
		const passwordResult = validatePasswordWithError(newUserPassword);
		if (!passwordResult.valid) {
			toast.error(passwordResult.error);
			return;
		}
		setCreateUserLoading(true);
		try {
			const data: CreateUserRequest = {
				email: newUserEmail,
				username: newUserUsername,
				password: newUserPassword,
			};
			await adminUserApi.createUser(data);
			toast.success("用户创建成功");
			setCreateUserOpen(false);
			setNewUserEmail("");
			setNewUserUsername("");
			setNewUserPassword("");
			fetchBaseData();
		} catch (error: unknown) {
			handleApiError(error, "创建失败");
		} finally {
			setCreateUserLoading(false);
		}
	};

	// 打开编辑用户弹窗
	const openEditUser = async (user: UserInfo) => {
		setEditUserId(user.id);
		setEditUserUsernameVal(user.username);
		setEditUserEmailVal(user.email);
		setEditUserPasswordVal("");
		setEditUserYn(user.yn);
		try {
			const res = await adminUserApi.getUser(user.id);
			const groupIds = res.data.groups.map((g) => g.id);
			setEditUserGroups(groupIds);
			setOriginalUserGroups(groupIds);
		} catch {
			setEditUserGroups([]);
			setOriginalUserGroups([]);
		}
		setEditUserOpen(true);
	};

	// 编辑用户
	const handleEditUser: React.SubmitEventHandler<HTMLFormElement> = async (
		e,
	) => {
		e.preventDefault();
		if (!editUserId) return;
		setEditUserLoading(true);
		try {
			const data: UpdateUserRequest = {
				user_id: editUserId,
				username: editUserUsernameVal || undefined,
				email: editUserEmailVal || undefined,
				password: editUserPasswordVal || undefined,
				yn: editUserYn,
			};
			await adminUserApi.updateUser(data);
			// 更新关联
			const currentGroups = editUserGroups;
			const originalGroups = userDetail?.groups.map((g) => g.id) || [];
			const toAdd = currentGroups.filter((id) => !originalGroups.includes(id));
			const toRemove = originalGroups.filter(
				(id) => !currentGroups.includes(id),
			);
			if (toAdd.length > 0) {
				await adminRelationApi.addUserGroup({
					relations: toAdd.map((groupId) => ({
						user_id: editUserId,
						group_id: groupId,
					})),
				});
			}
			if (toRemove.length > 0) {
				await adminRelationApi.removeUserGroup({
					relations: toRemove.map((groupId) => ({
						user_id: editUserId,
						group_id: groupId,
					})),
				});
			}
			toast.success("用户更新成功");
			setEditUserOpen(false);
			fetchBaseData();
			if (filter.userId === editUserId) {
				fetchDetail();
			}
		} catch (error: unknown) {
			handleApiError(error, "更新失败");
		} finally {
			setEditUserLoading(false);
		}
	};

	// 删除用户
	const handleDeleteUser = async (id: number) => {
		if (!confirm("确定删除该用户？")) return;
		try {
			await adminUserApi.removeUser({ user_id: id });
			toast.success("删除成功");
			if (filter.userId === id) {
				setFilter((f) => ({ ...f, userId: null }));
			}
			fetchBaseData();
		} catch (error: unknown) {
			handleApiError(error, "删除失败");
		}
	};

	// 创建组
	const handleCreateGroup: React.SubmitEventHandler<HTMLFormElement> = async (
		e,
	) => {
		e.preventDefault();
		if (!newGroupName.trim()) {
			toast.error("组名不能为空");
			return;
		}
		setCreateGroupLoading(true);
		try {
			const data: CreateGroupRequest = { name: newGroupName };
			await adminGroupApi.createGroup(data);
			toast.success("组创建成功");
			setCreateGroupOpen(false);
			setNewGroupName("");
			fetchBaseData();
		} catch (error: unknown) {
			handleApiError(error, "创建失败");
		} finally {
			setCreateGroupLoading(false);
		}
	};

	// 打开编辑组弹窗
	const openEditGroup = async (group: GroupInfo) => {
		setEditGroupId(group.id);
		setEditGroupNameVal(group.name);
		setEditGroupYn(group.yn);
		try {
			const res = await adminGroupApi.getGroup(group.id);
			const userIds = res.data.users.map((u) => u.id);
			const scopeIds = res.data.scopes.map((s) => s.id);
			setEditGroupUsers(userIds);
			setOriginalGroupUsers(userIds);
			setEditGroupScopes(scopeIds);
			setOriginalGroupScopes(scopeIds);
		} catch {
			setEditGroupUsers([]);
			setOriginalGroupUsers([]);
			setEditGroupScopes([]);
			setOriginalGroupScopes([]);
		}
		setEditGroupOpen(true);
	};

	// 编辑组
	const handleEditGroup: React.SubmitEventHandler<HTMLFormElement> = async (
		e,
	) => {
		e.preventDefault();
		if (!editGroupId) return;
		setEditGroupLoading(true);
		try {
			const data: UpdateGroupRequest = {
				group_id: editGroupId,
				name: editGroupNameVal || undefined,
				yn: editGroupYn,
			};
			await adminGroupApi.updateGroup(data);
			// 更新用户关联
			const currentUsers = editGroupUsers;
			const originalUsers = groupDetail?.users.map((u) => u.id) || [];
			const toAddUsers = currentUsers.filter(
				(id) => !originalUsers.includes(id),
			);
			const toRemoveUsers = originalUsers.filter(
				(id) => !currentUsers.includes(id),
			);
			if (toAddUsers.length > 0) {
				await adminRelationApi.addUserGroup({
					relations: toAddUsers.map((userId) => ({
						user_id: userId,
						group_id: editGroupId,
					})),
				});
			}
			if (toRemoveUsers.length > 0) {
				await adminRelationApi.removeUserGroup({
					relations: toRemoveUsers.map((userId) => ({
						user_id: userId,
						group_id: editGroupId,
					})),
				});
			}
			// 更新权限关联
			const currentScopes = editGroupScopes;
			const originalScopes = groupDetail?.scopes.map((s) => s.id) || [];
			const toAddScopes = currentScopes.filter(
				(id) => !originalScopes.includes(id),
			);
			const toRemoveScopes = originalScopes.filter(
				(id) => !currentScopes.includes(id),
			);
			if (toAddScopes.length > 0) {
				await adminRelationApi.addGroupScope({
					relations: toAddScopes.map((scopeId) => ({
						group_id: editGroupId,
						scope_id: scopeId,
					})),
				});
			}
			if (toRemoveScopes.length > 0) {
				await adminRelationApi.removeGroupScope({
					relations: toRemoveScopes.map((scopeId) => ({
						group_id: editGroupId,
						scope_id: scopeId,
					})),
				});
			}
			toast.success("组更新成功");
			setEditGroupOpen(false);
			fetchBaseData();
			if (filter.groupId === editGroupId) {
				fetchDetail();
			}
		} catch (error: unknown) {
			handleApiError(error, "更新失败");
		} finally {
			setEditGroupLoading(false);
		}
	};

	// 删除组
	const handleDeleteGroup = async (id: number) => {
		if (!confirm("确定删除该组？")) return;
		try {
			await adminGroupApi.removeGroup({ group_id: id });
			toast.success("删除成功");
			if (filter.groupId === id) {
				setFilter((f) => ({ ...f, groupId: null }));
			}
			fetchBaseData();
		} catch (error: unknown) {
			handleApiError(error, "删除失败");
		}
	};

	// 创建权限
	const handleCreateScope: React.SubmitEventHandler<HTMLFormElement> = async (
		e,
	) => {
		e.preventDefault();
		if (!newScopeName.trim()) {
			toast.error("权限名不能为空");
			return;
		}
		setCreateScopeLoading(true);
		try {
			const data: CreateScopeRequest = {
				name: newScopeName,
				description: newScopeDesc || undefined,
			};
			await adminScopeApi.createScope(data);
			toast.success("权限创建成功");
			setCreateScopeOpen(false);
			setNewScopeName("");
			setNewScopeDesc("");
			fetchBaseData();
		} catch (error: unknown) {
			handleApiError(error, "创建失败");
		} finally {
			setCreateScopeLoading(false);
		}
	};

	// 打开编辑权限弹窗
	const openEditScope = async (scope: ScopeInfo) => {
		setEditScopeId(scope.id);
		setEditScopeNameVal(scope.name);
		setEditScopeDescVal(scope.description || "");
		setEditScopeYn(scope.yn);
		try {
			const res = await adminScopeApi.getScope(scope.id);
			const groupIds = res.data.groups.map((g) => g.id);
			setEditScopeGroups(groupIds);
			setOriginalScopeGroups(groupIds);
		} catch {
			setEditScopeGroups([]);
			setOriginalScopeGroups([]);
		}
		setEditScopeOpen(true);
	};

	// 编辑权限
	const handleEditScope: React.SubmitEventHandler<HTMLFormElement> = async (
		e,
	) => {
		e.preventDefault();
		if (!editScopeId) return;
		setEditScopeLoading(true);
		try {
			const data: UpdateScopeRequest = {
				scope_id: editScopeId,
				name: editScopeNameVal || undefined,
				description: editScopeDescVal || undefined,
				yn: editScopeYn,
			};
			await adminScopeApi.updateScope(data);
			// 更新组关联
			const currentGroups = editScopeGroups;
			const originalGroups = scopeDetail?.groups.map((g) => g.id) || [];
			const toAdd = currentGroups.filter((id) => !originalGroups.includes(id));
			const toRemove = originalGroups.filter(
				(id) => !currentGroups.includes(id),
			);
			if (toAdd.length > 0) {
				await adminRelationApi.addGroupScope({
					relations: toAdd.map((groupId) => ({
						group_id: groupId,
						scope_id: editScopeId,
					})),
				});
			}
			if (toRemove.length > 0) {
				await adminRelationApi.removeGroupScope({
					relations: toRemove.map((groupId) => ({
						group_id: groupId,
						scope_id: editScopeId,
					})),
				});
			}
			toast.success("权限更新成功");
			setEditScopeOpen(false);
			fetchBaseData();
			if (filter.scopeId === editScopeId) {
				fetchDetail();
			}
		} catch (error: unknown) {
			handleApiError(error, "更新失败");
		} finally {
			setEditScopeLoading(false);
		}
	};

	// 删除权限
	const handleDeleteScope = async (id: number) => {
		if (!confirm("确定删除该权限？")) return;
		try {
			await adminScopeApi.removeScope({ scope_id: id });
			toast.success("删除成功");
			if (filter.scopeId === id) {
				setFilter((f) => ({ ...f, scopeId: null }));
			}
			fetchBaseData();
		} catch (error: unknown) {
			handleApiError(error, "删除失败");
		}
	};

	// 渲染排序按钮
	const renderSortButton = (
		field: SortField,
		currentSort: SortState,
		onClick: () => void,
		label: string,
	) => (
		<button
			type="button"
			onClick={onClick}
			className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
				currentSort.field === field
					? "bg-stone-600 text-white"
					: "text-stone-500 hover:bg-stone-200/50"
			}`}
		>
			{label}
			{currentSort.field === field ? (
				currentSort.order === "asc" ? (
					<ArrowUpAz className="h-3 w-3" />
				) : (
					<ArrowDownAz className="h-3 w-3" />
				)
			) : (
				<ArrowUpDown className="h-3 w-3" />
			)}
		</button>
	);

	// 渲染列表项
	const renderListItem = (
		displayContent: React.ReactNode,
		isSelected: boolean,
		isDisabled: boolean,
		onEdit: () => void,
		onDelete: () => void,
		onClick: () => void,
	) => (
		<button
			type="button"
			onClick={onClick}
			className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors w-full text-left ${
				isSelected
					? "bg-stone-600 text-white"
					: isDisabled
						? "opacity-50 hover:bg-stone-200/50"
						: "hover:bg-stone-200/50"
			}`}
		>
			{displayContent}
			<div className="flex items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={`h-7 w-7 ${
						isSelected
							? "text-white hover:bg-white/20"
							: "hover:bg-stone-300/50"
					}`}
					onClick={(e) => {
						e.stopPropagation();
						onEdit();
					}}
				>
					<Edit className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={`h-7 w-7 ${
						isSelected
							? "text-white hover:bg-white/20"
							: "hover:bg-stone-300/50 text-red-500"
					}`}
					onClick={(e) => {
						e.stopPropagation();
						onDelete();
					}}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</button>
	);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#e8e4df]">
				<Loader2 className="h-8 w-8 animate-spin text-stone-500" />
			</div>
		);
	}

	return (
		<div className="h-screen bg-[#e8e4df] p-6 overflow-hidden">
			<div className="grid grid-cols-3 gap-6 h-full min-h-0">
				{/* 用户栏 */}
				<div className="bg-[#f0ece6] rounded-2xl border border-stone-300/60 flex flex-col overflow-hidden">
					<div className="p-4 border-b border-stone-300/60">
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<User className="h-5 w-5 text-stone-600" />
								<span className="font-semibold text-stone-700">用户</span>
								{filter.userId && (
									<Badge className="bg-amber-500 text-white text-xs">
										筛选中
									</Badge>
								)}
							</div>
							<Button
								size="sm"
								onClick={() => setCreateUserOpen(true)}
								className="bg-stone-600 hover:bg-stone-700 rounded-xl"
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
						<div className="mb-3 relative">
							<Input
								placeholder="搜索用户名或邮箱"
								value={userSearch}
								onChange={(e) => setUserSearch(e.target.value)}
								className="bg-white border-stone-300/60 rounded-xl text-sm h-8 pr-8"
							/>
							{userSearch && (
								<button
									type="button"
									onClick={() => setUserSearch("")}
									className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</div>
						<div className="flex gap-1">
							{renderSortButton(
								"id",
								userSort,
								() => toggleUserSort("id"),
								"ID",
							)}
							{renderSortButton(
								"username",
								userSort,
								() => toggleUserSort("username"),
								"用户名",
							)}
							{renderSortButton(
								"email",
								userSort,
								() => toggleUserSort("email"),
								"邮箱",
							)}
						</div>
					</div>
					<div
						className="overflow-y-auto p-2 space-y-1"
						style={{ height: "calc(100% - 140px)" }}
					>
						{sortedUsers.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-stone-400">
								<AlertCircle className="h-8 w-8 mb-2" />
								<span>空</span>
							</div>
						) : (
							sortedUsers.map((user) =>
								renderListItem(
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<span className="text-xs opacity-60">#{user.id}</span>
											<span className="font-medium truncate">
												{user.username}
											</span>
										</div>
										<div className="text-xs opacity-60 truncate">
											{user.email}
										</div>
									</div>,
									filter.userId === user.id,
									user.yn === 0,
									() => openEditUser(user),
									() => handleDeleteUser(user.id),
									() => handleUserClick(user),
								),
							)
						)}
					</div>
				</div>

				{/* 组栏 */}
				<div className="bg-[#f0ece6] rounded-2xl border border-stone-300/60 flex flex-col overflow-hidden">
					<div className="p-4 border-b border-stone-300/60">
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<Users className="h-5 w-5 text-stone-600" />
								<span className="font-semibold text-stone-700">组</span>
								{filter.groupId && (
									<Badge className="bg-amber-500 text-white text-xs">
										筛选中
									</Badge>
								)}
							</div>
							<Button
								size="sm"
								onClick={() => setCreateGroupOpen(true)}
								className="bg-stone-600 hover:bg-stone-700 rounded-xl"
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
						<div className="mb-3 relative">
							<Input
								placeholder="搜索组名"
								value={groupSearch}
								onChange={(e) => setGroupSearch(e.target.value)}
								className="bg-white border-stone-300/60 rounded-xl text-sm h-8 pr-8"
							/>
							{groupSearch && (
								<button
									type="button"
									onClick={() => setGroupSearch("")}
									className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</div>
						<div className="flex gap-1">
							{renderSortButton(
								"id",
								groupSort,
								() => toggleGroupSort("id"),
								"ID",
							)}
							{renderSortButton(
								"name",
								groupSort,
								() => toggleGroupSort("name"),
								"名称",
							)}
						</div>
					</div>
					<div
						className="overflow-y-auto p-2 space-y-1"
						style={{ height: "calc(100% - 140px)" }}
					>
						{sortedGroups.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-stone-400">
								<AlertCircle className="h-8 w-8 mb-2" />
								<span>空</span>
							</div>
						) : (
							sortedGroups.map((group) =>
								renderListItem(
									<div className="flex items-center gap-2">
										<span className="text-xs opacity-60">#{group.id}</span>
										<span className="font-medium">{group.name}</span>
									</div>,
									filter.groupId === group.id,
									group.yn === 0,
									() => openEditGroup(group),
									() => handleDeleteGroup(group.id),
									() => handleGroupClick(group),
								),
							)
						)}
					</div>
				</div>

				{/* 权限栏 */}
				<div className="bg-[#f0ece6] rounded-2xl border border-stone-300/60 flex flex-col overflow-hidden">
					<div className="p-4 border-b border-stone-300/60">
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<Shield className="h-5 w-5 text-stone-600" />
								<span className="font-semibold text-stone-700">权限</span>
								{filter.scopeId && (
									<Badge className="bg-amber-500 text-white text-xs">
										筛选中
									</Badge>
								)}
							</div>
							<Button
								size="sm"
								onClick={() => setCreateScopeOpen(true)}
								className="bg-stone-600 hover:bg-stone-700 rounded-xl"
							>
								<Plus className="h-4 w-4" />
							</Button>
						</div>
						<div className="mb-3 relative">
							<Input
								placeholder="搜索权限名或描述"
								value={scopeSearch}
								onChange={(e) => setScopeSearch(e.target.value)}
								className="bg-white border-stone-300/60 rounded-xl text-sm h-8 pr-8"
							/>
							{scopeSearch && (
								<button
									type="button"
									onClick={() => setScopeSearch("")}
									className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</div>
						<div className="flex gap-1">
							{renderSortButton(
								"id",
								scopeSort,
								() => toggleScopeSort("id"),
								"ID",
							)}
							{renderSortButton(
								"name",
								scopeSort,
								() => toggleScopeSort("name"),
								"名称",
							)}
						</div>
					</div>
					<div
						className="overflow-y-auto p-2 space-y-1"
						style={{ height: "calc(100% - 140px)" }}
					>
						{sortedScopes.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-stone-400">
								<AlertCircle className="h-8 w-8 mb-2" />
								<span>空</span>
							</div>
						) : (
							sortedScopes.map((scope) =>
								renderListItem(
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<span className="text-xs opacity-60">#{scope.id}</span>
											<span className="font-medium truncate">{scope.name}</span>
										</div>
										{scope.description && (
											<div className="text-xs opacity-60 truncate">
												{scope.description}
											</div>
										)}
									</div>,
									filter.scopeId === scope.id,
									scope.yn === 0,
									() => openEditScope(scope),
									() => handleDeleteScope(scope.id),
									() => handleScopeClick(scope),
								),
							)
						)}
					</div>
				</div>

				{/* 筛选状态栏 */}
				{(filter.userId || filter.groupId || filter.scopeId) && (
					<div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#f0ece6] border border-stone-300/60 rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
						<span className="text-sm text-stone-500">当前筛选:</span>
						{filter.userId && (
							<button
								type="button"
								onClick={() => setFilter((f) => ({ ...f, userId: null }))}
								className="bg-stone-600 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 hover:bg-stone-700 transition-colors"
							>
								用户: {users.find((u) => u.id === filter.userId)?.username}
								<X className="h-3 w-3" />
							</button>
						)}
						{filter.groupId && (
							<button
								type="button"
								onClick={() => setFilter((f) => ({ ...f, groupId: null }))}
								className="bg-stone-600 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 hover:bg-stone-700 transition-colors"
							>
								组: {groups.find((g) => g.id === filter.groupId)?.name}
								<X className="h-3 w-3" />
							</button>
						)}
						{filter.scopeId && (
							<button
								type="button"
								onClick={() => setFilter((f) => ({ ...f, scopeId: null }))}
								className="bg-stone-600 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 hover:bg-stone-700 transition-colors"
							>
								权限: {scopes.find((s) => s.id === filter.scopeId)?.name}
								<X className="h-3 w-3" />
							</button>
						)}
						<Button
							variant="ghost"
							size="sm"
							onClick={clearFilter}
							className="rounded-full"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				)}

				{/* 创建用户弹窗 */}
				<Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
					<DialogContent className="bg-[#f0ece6] border-stone-300/60 rounded-2xl">
						<DialogHeader>
							<DialogTitle className="text-stone-700">新建用户</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleCreateUser} className="space-y-4">
							<div className="space-y-2">
								<Label className="text-stone-600">邮箱</Label>
								<Input
									type="email"
									value={newUserEmail}
									onChange={(e) => setNewUserEmail(e.target.value)}
									className="bg-white border-stone-300/60 rounded-xl"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-stone-600">用户名</Label>
								<Input
									value={newUserUsername}
									onChange={(e) => setNewUserUsername(e.target.value)}
									className="bg-white border-stone-300/60 rounded-xl"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-stone-600">密码</Label>
								<Input
									type="password"
									value={newUserPassword}
									onChange={(e) => setNewUserPassword(e.target.value)}
									className="bg-white border-stone-300/60 rounded-xl"
									required
								/>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setCreateUserOpen(false)}
									className="bg-white border-stone-300/60 rounded-xl"
								>
									取消
								</Button>
								<Button
									type="submit"
									disabled={createUserLoading}
									className="bg-stone-600 hover:bg-stone-700 rounded-xl"
								>
									{createUserLoading && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									创建
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>

				{/* 编辑用户弹窗 */}
				<Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
					<DialogContent className="bg-[#f0ece6] border-stone-300/60 rounded-2xl max-w-md">
						<DialogHeader>
							<DialogTitle className="text-stone-700">编辑用户</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleEditUser} className="space-y-4">
							<div className="space-y-2">
								<Label className="text-stone-600">用户名</Label>
								<Input
									value={editUserUsernameVal}
									onChange={(e) => setEditUserUsernameVal(e.target.value)}
									className="bg-white border-stone-300/60 rounded-xl"
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-stone-600">邮箱</Label>
								<Input
									type="email"
									value={editUserEmailVal}
									onChange={(e) => setEditUserEmailVal(e.target.value)}
									className="bg-white border-stone-300/60 rounded-xl"
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-stone-600">密码（留空不修改）</Label>
								<Input
									type="password"
									value={editUserPasswordVal}
									onChange={(e) => setEditUserPasswordVal(e.target.value)}
									className="bg-white border-stone-300/60 rounded-xl"
									placeholder="留空则不修改"
								/>
							</div>
							<div className="flex items-center justify-between">
								<Label className="text-stone-600">启用状态</Label>
								<SwitchUI
									checked={editUserYn === 1}
									onCheckedChange={(checked) => setEditUserYn(checked ? 1 : 0)}
								/>
							</div>
							<div className="pt-2 border-t border-stone-300/60">
								<Button
									type="button"
									variant="outline"
									onClick={() => setEditUserRelationOpen(true)}
									className="w-full bg-white border-stone-300/60 rounded-xl relative"
								>
									编辑关联关系
									{(() => {
										const current = [...editUserGroups].sort((a, b) => a - b);
										const original = [...originalUserGroups].sort(
											(a, b) => a - b,
										);
										const hasChanges =
											current.length !== original.length ||
											current.some((id, i) => id !== original[i]);
										return hasChanges ? (
											<span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
										) : null;
									})()}
								</Button>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setEditUserOpen(false)}
									className="bg-white border-stone-300/60 rounded-xl"
								>
									取消
								</Button>
								<Button
									type="submit"
									disabled={editUserLoading}
									className="bg-stone-600 hover:bg-stone-700 rounded-xl"
								>
									{editUserLoading && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									保存
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>

				{/* 创建组弹窗 */}
				<Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
					<DialogContent className="bg-[#f0ece6] border-stone-300/60 rounded-2xl">
						<DialogHeader>
							<DialogTitle className="text-stone-700">新建组</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleCreateGroup} className="space-y-4">
							<div className="space-y-2">
								<Label className="text-stone-600">组名</Label>
								<Input
									value={newGroupName}
									onChange={(e) => setNewGroupName(e.target.value)}
									className="bg-white border-stone-300/60 rounded-xl"
									required
								/>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setCreateGroupOpen(false)}
									className="bg-white border-stone-300/60 rounded-xl"
								>
									取消
								</Button>
								<Button
									type="submit"
									disabled={createGroupLoading}
									className="bg-stone-600 hover:bg-stone-700 rounded-xl"
								>
									{createGroupLoading && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									创建
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>

				{/* 编辑组弹窗 */}
				<Dialog open={editGroupOpen} onOpenChange={setEditGroupOpen}>
					<DialogContent className="bg-[#f0ece6] border-stone-300/60 rounded-2xl max-w-md">
						<DialogHeader>
							<DialogTitle className="text-stone-700">编辑组</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleEditGroup} className="space-y-4">
							<div className="space-y-2">
								<Label className="text-stone-600">组名</Label>
								<Input
									value={editGroupNameVal}
									onChange={(e) => setEditGroupNameVal(e.target.value)}
									className="bg-white border-stone-300/60 rounded-xl"
								/>
							</div>
							<div className="flex items-center justify-between">
								<Label className="text-stone-600">启用状态</Label>
								<SwitchUI
									checked={editGroupYn === 1}
									onCheckedChange={(checked) => setEditGroupYn(checked ? 1 : 0)}
								/>
							</div>
							<div className="pt-2 border-t border-stone-300/60 space-y-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setEditGroupRelationTab("users");
										setEditGroupRelationOpen(true);
									}}
									className="w-full bg-white border-stone-300/60 rounded-xl relative"
								>
									编辑成员用户关联
									{(() => {
										const current = [...editGroupUsers].sort((a, b) => a - b);
										const original = [...originalGroupUsers].sort(
											(a, b) => a - b,
										);
										const hasChanges =
											current.length !== original.length ||
											current.some((id, i) => id !== original[i]);
										return hasChanges ? (
											<span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
										) : null;
									})()}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setEditGroupRelationTab("scopes");
										setEditGroupRelationOpen(true);
									}}
									className="w-full bg-white border-stone-300/60 rounded-xl relative"
								>
									编辑包含权限关联
									{(() => {
										const current = [...editGroupScopes].sort((a, b) => a - b);
										const original = [...originalGroupScopes].sort(
											(a, b) => a - b,
										);
										const hasChanges =
											current.length !== original.length ||
											current.some((id, i) => id !== original[i]);
										return hasChanges ? (
											<span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
										) : null;
									})()}
								</Button>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setEditGroupOpen(false)}
									className="bg-white border-stone-300/60 rounded-xl"
								>
									取消
								</Button>
								<Button
									type="submit"
									disabled={editGroupLoading}
									className="bg-stone-600 hover:bg-stone-700 rounded-xl"
								>
									{editGroupLoading && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									保存
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>

				{/* 创建权限弹窗 */}
				<Dialog open={createScopeOpen} onOpenChange={setCreateScopeOpen}>
					<DialogContent className="bg-[#f0ece6] border-stone-300/60 rounded-2xl">
						<DialogHeader>
							<DialogTitle className="text-stone-700">新建权限</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleCreateScope} className="space-y-4">
							<div className="space-y-2">
								<Label className="text-stone-600">权限名</Label>
								<Input
									value={newScopeName}
									onChange={(e) => setNewScopeName(e.target.value)}
									className="bg-white border-stone-300/60 rounded-xl"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-stone-600">描述</Label>
								<Input
									value={newScopeDesc}
									onChange={(e) => setNewScopeDesc(e.target.value)}
									className="bg-white border-stone-300/60 rounded-xl"
								/>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setCreateScopeOpen(false)}
									className="bg-white border-stone-300/60 rounded-xl"
								>
									取消
								</Button>
								<Button
									type="submit"
									disabled={createScopeLoading}
									className="bg-stone-600 hover:bg-stone-700 rounded-xl"
								>
									{createScopeLoading && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									创建
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>

				{/* 编辑权限弹窗 */}
				<Dialog open={editScopeOpen} onOpenChange={setEditScopeOpen}>
					<DialogContent className="bg-[#f0ece6] border-stone-300/60 rounded-2xl max-w-md">
						<DialogHeader>
							<DialogTitle className="text-stone-700">编辑权限</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleEditScope} className="space-y-4">
							<div className="space-y-2">
								<Label className="text-stone-600">权限名</Label>
								<Input
									value={editScopeNameVal}
									onChange={(e) => setEditScopeNameVal(e.target.value)}
									className="bg-white border-stone-300/60 rounded-xl"
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-stone-600">描述</Label>
								<Input
									value={editScopeDescVal}
									onChange={(e) => setEditScopeDescVal(e.target.value)}
									className="bg-white border-stone-300/60 rounded-xl"
								/>
							</div>
							<div className="flex items-center justify-between">
								<Label className="text-stone-600">启用状态</Label>
								<SwitchUI
									checked={editScopeYn === 1}
									onCheckedChange={(checked) => setEditScopeYn(checked ? 1 : 0)}
								/>
							</div>
							<div className="pt-2 border-t border-stone-300/60">
								<Button
									type="button"
									variant="outline"
									onClick={() => setEditScopeRelationOpen(true)}
									className="w-full bg-white border-stone-300/60 rounded-xl relative"
								>
									编辑关联关系
									{(() => {
										const current = [...editScopeGroups].sort((a, b) => a - b);
										const original = [...originalScopeGroups].sort(
											(a, b) => a - b,
										);
										const hasChanges =
											current.length !== original.length ||
											current.some((id, i) => id !== original[i]);
										return hasChanges ? (
											<span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
										) : null;
									})()}
								</Button>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setEditScopeOpen(false)}
									className="bg-white border-stone-300/60 rounded-xl"
								>
									取消
								</Button>
								<Button
									type="submit"
									disabled={editScopeLoading}
									className="bg-stone-600 hover:bg-stone-700 rounded-xl"
								>
									{editScopeLoading && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									保存
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>

				{/* 用户关联关系编辑弹窗 */}
				<Dialog
					open={editUserRelationOpen}
					onOpenChange={setEditUserRelationOpen}
				>
					<DialogContent className="bg-[#f0ece6] border-stone-300/60 rounded-2xl max-w-6xl w-[90vw]">
						<DialogHeader>
							<DialogTitle className="text-stone-700">
								编辑用户-组关联关系
							</DialogTitle>
						</DialogHeader>
						<RelationEditor
							title="组"
							allItems={groups.map((g) => ({
								id: g.id,
								name: g.name,
								description: undefined,
							}))}
							selectedIds={editUserGroups}
							onChange={setEditUserGroups}
						/>
						<DialogFooter className="mt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditUserRelationOpen(false)}
								className="bg-white border-stone-300/60 rounded-xl"
							>
								取消
							</Button>
							<Button
								type="button"
								onClick={() => setEditUserRelationOpen(false)}
								className="bg-stone-600 hover:bg-stone-700 rounded-xl"
							>
								确定
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* 组关联关系编辑弹窗 */}
				<Dialog
					open={editGroupRelationOpen}
					onOpenChange={setEditGroupRelationOpen}
				>
					<DialogContent className="bg-[#f0ece6] border-stone-300/60 rounded-2xl max-w-6xl w-[90vw]">
						<DialogHeader>
							<DialogTitle className="text-stone-700">
								{editGroupRelationTab === "users"
									? "编辑组-用户关联关系"
									: "编辑组-权限关联关系"}
							</DialogTitle>
						</DialogHeader>
						{editGroupRelationTab === "users" ? (
							<RelationEditor
								title="用户"
								allItems={users.map((u) => ({
									id: u.id,
									name: u.username,
									description: u.email,
								}))}
								selectedIds={editGroupUsers}
								onChange={setEditGroupUsers}
							/>
						) : (
							<RelationEditor
								title="权限"
								allItems={scopes.map((s) => ({
									id: s.id,
									name: s.name,
									description: s.description,
								}))}
								selectedIds={editGroupScopes}
								onChange={setEditGroupScopes}
							/>
						)}
						<DialogFooter className="mt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditGroupRelationOpen(false)}
								className="bg-white border-stone-300/60 rounded-xl"
							>
								取消
							</Button>
							<Button
								type="button"
								onClick={() => setEditGroupRelationOpen(false)}
								className="bg-stone-600 hover:bg-stone-700 rounded-xl"
							>
								确定
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* 权限关联关系编辑弹窗 */}
				<Dialog
					open={editScopeRelationOpen}
					onOpenChange={setEditScopeRelationOpen}
				>
					<DialogContent className="bg-[#f0ece6] border-stone-300/60 rounded-2xl max-w-6xl w-[90vw]">
						<DialogHeader>
							<DialogTitle className="text-stone-700">
								编辑权限-组关联关系
							</DialogTitle>
						</DialogHeader>
						<RelationEditor
							title="组"
							allItems={groups.map((g) => ({
								id: g.id,
								name: g.name,
								description: undefined,
							}))}
							selectedIds={editScopeGroups}
							onChange={setEditScopeGroups}
						/>
						<DialogFooter className="mt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditScopeRelationOpen(false)}
								className="bg-white border-stone-300/60 rounded-xl"
							>
								取消
							</Button>
							<Button
								type="button"
								onClick={() => setEditScopeRelationOpen(false)}
								className="bg-stone-600 hover:bg-stone-700 rounded-xl"
							>
								确定
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
