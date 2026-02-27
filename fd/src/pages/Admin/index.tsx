import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  message,
  Typography,
  Switch,
  Transfer,
  Divider,
  Tooltip,
  Badge,
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { adminUserApi, adminGroupApi, adminScopeApi, adminRelationApi } from '../../api/admin';
import type { UserInfo, GroupInfo, ScopeInfo } from '../../types';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// 筛选状态类型
interface FilterState {
  userId: number | null;
  groupId: number | null;
  scopeId: number | null;
}

// 排序类型
interface SortState {
  field: string;
  order: 'ascend' | 'descend' | null;
}

export default function AdminPanel() {
  const navigate = useNavigate();

  // ========== 数据状态 ==========
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [scopes, setScopes] = useState<ScopeInfo[]>([]);

  // 原始关联数据（用于筛选逻辑）
  const [userGroups, setUserGroups] = useState<GroupInfo[]>([]);
  const [userScopes, setUserScopes] = useState<ScopeInfo[]>([]);
  const [groupUsers, setGroupUsers] = useState<UserInfo[]>([]);
  const [groupScopes, setGroupScopes] = useState<ScopeInfo[]>([]);
  const [scopeUsers, setScopeUsers] = useState<UserInfo[]>([]);
  const [scopeGroups, setScopeGroups] = useState<GroupInfo[]>([]);

  // ========== 加载状态 ==========
  const [usersLoading, setUsersLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [scopesLoading, setScopesLoading] = useState(false);

  // ========== 分页 ==========
  const [userPage, setUserPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);
  const [scopePage, setScopePage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [groupsTotal, setGroupsTotal] = useState(0);
  const [scopesTotal, setScopesTotal] = useState(0);
  const pageSize = 10;

  // ========== 搜索关键词 ==========
  const [userKeyword, setUserKeyword] = useState('');
  const [groupKeyword, setGroupKeyword] = useState('');
  const [scopeKeyword, setScopeKeyword] = useState('');

  // ========== 排序状态 ==========
  const [userSort, setUserSort] = useState<SortState>({ field: 'id', order: 'ascend' });
  const [groupSort, setGroupSort] = useState<SortState>({ field: 'id', order: 'ascend' });
  const [scopeSort, setScopeSort] = useState<SortState>({ field: 'id', order: 'ascend' });

  // ========== 当前筛选状态 ==========
  const [filter, setFilter] = useState<FilterState>({
    userId: null,
    groupId: null,
    scopeId: null,
  });

  // ========== 弹窗状态 ==========
  // 用户编辑弹窗
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [userForm] = Form.useForm();
  const [userRelationModalOpen, setUserRelationModalOpen] = useState(false);
  const [userTargetGroups, setUserTargetGroups] = useState<string[]>([]);

  // 组编辑弹窗
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupInfo | null>(null);
  const [groupForm] = Form.useForm();
  const [groupScopeRelationModalOpen, setGroupScopeRelationModalOpen] = useState(false);
  const [groupTargetScopes, setGroupTargetScopes] = useState<string[]>([]);
  const [groupUserRelationModalOpen, setGroupUserRelationModalOpen] = useState(false);
  const [groupTargetUsers, setGroupTargetUsers] = useState<string[]>([]);

  // 权限编辑弹窗
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [editingScope, setEditingScope] = useState<ScopeInfo | null>(null);
  const [scopeForm] = Form.useForm();
  const [scopeGroupRelationModalOpen, setScopeGroupRelationModalOpen] = useState(false);
  const [scopeTargetGroups, setScopeTargetGroups] = useState<string[]>([]);

  // ========== 排序函数 ==========
  const sortData = <T extends Record<string, any>>(
    data: T[],
    sort: SortState
  ): T[] => {
    if (!sort.order) return data;

    return [...data].sort((a, b) => {
      let aValue = a[sort.field];
      let bValue = b[sort.field];

      // 处理字符串比较
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (aValue < bValue) return sort.order === 'ascend' ? -1 : 1;
      if (aValue > bValue) return sort.order === 'ascend' ? 1 : -1;
      return 0;
    });
  };

  // ========== 获取显示数据（考虑筛选、搜索和排序）==========
  const displayUsers = useMemo(() => {
    let result = users;
    // 如果有组筛选，显示该组的用户
    if (filter.groupId !== null) {
      result = result.filter(u => groupUsers.some(gu => gu.id === u.id));
    }
    // 如果有权限筛选，显示该权限的用户
    if (filter.scopeId !== null) {
      result = result.filter(u => scopeUsers.some(su => su.id === u.id));
    }
    // 应用排序
    return sortData(result, userSort);
  }, [users, filter.groupId, filter.scopeId, groupUsers, scopeUsers, userSort]);

  const displayGroups = useMemo(() => {
    let result = groups;
    // 如果有用户筛选，显示该用户的组
    if (filter.userId !== null) {
      result = result.filter(g => userGroups.some(ug => ug.id === g.id));
    }
    // 如果有权限筛选，显示该权限的组
    if (filter.scopeId !== null) {
      result = result.filter(g => scopeGroups.some(sg => sg.id === g.id));
    }
    // 应用排序
    return sortData(result, groupSort);
  }, [groups, filter.userId, filter.scopeId, userGroups, scopeGroups, groupSort]);

  const displayScopes = useMemo(() => {
    let result = scopes;
    // 如果有用户筛选，显示该用户的权限
    if (filter.userId !== null) {
      result = result.filter(s => userScopes.some(us => us.id === s.id));
    }
    // 如果有组筛选，显示该组的权限
    if (filter.groupId !== null) {
      result = result.filter(s => groupScopes.some(gs => gs.id === s.id));
    }
    // 应用排序
    return sortData(result, scopeSort);
  }, [scopes, filter.userId, filter.groupId, userScopes, groupScopes, scopeSort]);

  // ========== 加载全部数据 ==========
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const offset = (userPage - 1) * pageSize;
      const response = await adminUserApi.listUsers({
        offset,
        limit: pageSize,
        keyword: userKeyword || undefined,
      });
      setUsers(response.data.items);
      setUsersTotal(response.data.total);
    } catch (error: any) {
      message.error('获取用户列表失败');
    } finally {
      setUsersLoading(false);
    }
  }, [userPage, userKeyword]);

  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const offset = (groupPage - 1) * pageSize;
      const response = await adminGroupApi.listGroups({
        offset,
        limit: pageSize,
        keyword: groupKeyword || undefined,
      });
      setGroups(response.data.items);
      setGroupsTotal(response.data.total);
    } catch (error: any) {
      message.error('获取组列表失败');
    } finally {
      setGroupsLoading(false);
    }
  }, [groupPage, groupKeyword]);

  const fetchScopes = useCallback(async () => {
    setScopesLoading(true);
    try {
      const offset = (scopePage - 1) * pageSize;
      const response = await adminScopeApi.listScopes({
        offset,
        limit: pageSize,
        keyword: scopeKeyword || undefined,
      });
      setScopes(response.data.items);
      setScopesTotal(response.data.total);
    } catch (error: any) {
      message.error('获取权限列表失败');
    } finally {
      setScopesLoading(false);
    }
  }, [scopePage, scopeKeyword]);

  // ========== 加载关联数据 ==========
  const fetchUserRelations = async (userId: number) => {
    try {
      const response = await adminUserApi.getUser(userId);
      setUserGroups(response.data.groups);
      setUserScopes(response.data.scopes);
    } catch (error) {
      message.error('获取用户关联数据失败');
    }
  };

  const fetchGroupRelations = async (groupId: number) => {
    try {
      const response = await adminGroupApi.getGroup(groupId);
      setGroupUsers(response.data.users);
      setGroupScopes(response.data.scopes);
    } catch (error) {
      message.error('获取组关联数据失败');
    }
  };

  const fetchScopeRelations = async (scopeId: number) => {
    try {
      const response = await adminScopeApi.getScope(scopeId);
      setScopeUsers(response.data.users);
      setScopeGroups(response.data.groups);
    } catch (error) {
      message.error('获取权限关联数据失败');
    }
  };

  // ========== 初始化加载 ==========
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    fetchScopes();
  }, [fetchScopes]);

  // ========== 点击元素 ==========
  const handleUserClick = async (user: UserInfo) => {
    if (filter.userId === user.id) {
      // 取消选中
      setFilter(prev => ({ ...prev, userId: null }));
      setUserGroups([]);
      setUserScopes([]);
    } else {
      // 选中新用户
      setFilter(prev => ({ ...prev, userId: user.id }));
      await fetchUserRelations(user.id);
    }
  };

  const handleGroupClick = async (group: GroupInfo) => {
    if (filter.groupId === group.id) {
      // 取消选中
      setFilter(prev => ({ ...prev, groupId: null }));
      setGroupUsers([]);
      setGroupScopes([]);
    } else {
      // 选中新组
      setFilter(prev => ({ ...prev, groupId: group.id }));
      await fetchGroupRelations(group.id);
    }
  };

  const handleScopeClick = async (scope: ScopeInfo) => {
    if (filter.scopeId === scope.id) {
      // 取消选中
      setFilter(prev => ({ ...prev, scopeId: null }));
      setScopeUsers([]);
      setScopeGroups([]);
    } else {
      // 选中新权限
      setFilter(prev => ({ ...prev, scopeId: scope.id }));
      await fetchScopeRelations(scope.id);
    }
  };

  // ========== 清除筛选 ==========
  const clearAllFilters = () => {
    setFilter({ userId: null, groupId: null, scopeId: null });
    setUserGroups([]);
    setUserScopes([]);
    setGroupUsers([]);
    setGroupScopes([]);
    setScopeUsers([]);
    setScopeGroups([]);
  };

  // ========== 获取筛选状态标签 ==========
  const getFilterTags = () => {
    const tags = [];
    if (filter.userId !== null) {
      const user = users.find(u => u.id === filter.userId);
      tags.push({ type: 'user', label: `用户: ${user?.username || filter.userId}`, clear: () => handleUserClick(user!) });
    }
    if (filter.groupId !== null) {
      const group = groups.find(g => g.id === filter.groupId);
      tags.push({ type: 'group', label: `组: ${group?.name || filter.groupId}`, clear: () => handleGroupClick(group!) });
    }
    if (filter.scopeId !== null) {
      const scope = scopes.find(s => s.id === filter.scopeId);
      tags.push({ type: 'scope', label: `权限: ${scope?.name || filter.scopeId}`, clear: () => handleScopeClick(scope!) });
    }
    return tags;
  };

  // ========== 用户操作 ==========
  const handleCreateUser = async (values: any) => {
    try {
      await adminUserApi.createUser(values);
      message.success('创建成功');
      setUserModalOpen(false);
      userForm.resetFields();
      fetchUsers();
    } catch (error: any) {
      const msg = error.response?.data?.detail || '创建失败';
      message.error(msg);
    }
  };

  const handleUpdateUser = async (values: any) => {
    if (!editingUser) return;
    try {
      await adminUserApi.updateUser({
        user_id: editingUser.id,
        ...values,
        yn: values.yn ? 1 : 0,
      });
      message.success('更新成功');
      setUserModalOpen(false);
      setEditingUser(null);
      userForm.resetFields();
      fetchUsers();
    } catch (error: any) {
      const msg = error.response?.data?.detail || '更新失败';
      message.error(msg);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该用户吗？此操作不可恢复。',
      onOk: async () => {
        try {
          await adminUserApi.removeUser({ user_id: userId });
          message.success('删除成功');
          fetchUsers();
          if (filter.userId === userId) {
            setFilter(prev => ({ ...prev, userId: null }));
          }
        } catch (error: any) {
          message.error('删除失败');
        }
      },
    });
  };

  // ========== 组操作 ==========
  const handleCreateGroup = async (values: any) => {
    try {
      await adminGroupApi.createGroup(values);
      message.success('创建成功');
      setGroupModalOpen(false);
      groupForm.resetFields();
      fetchGroups();
    } catch (error: any) {
      const msg = error.response?.data?.detail || '创建失败';
      message.error(msg);
    }
  };

  const handleUpdateGroup = async (values: any) => {
    if (!editingGroup) return;
    try {
      await adminGroupApi.updateGroup({
        group_id: editingGroup.id,
        ...values,
        yn: values.yn ? 1 : 0,
      });
      message.success('更新成功');
      setGroupModalOpen(false);
      setEditingGroup(null);
      groupForm.resetFields();
      fetchGroups();
    } catch (error: any) {
      const msg = error.response?.data?.detail || '更新失败';
      message.error(msg);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该组吗？此操作不可恢复。',
      onOk: async () => {
        try {
          await adminGroupApi.removeGroup({ group_id: groupId });
          message.success('删除成功');
          fetchGroups();
          if (filter.groupId === groupId) {
            setFilter(prev => ({ ...prev, groupId: null }));
          }
        } catch (error: any) {
          message.error('删除失败');
        }
      },
    });
  };

  // ========== 权限操作 ==========
  const handleCreateScope = async (values: any) => {
    try {
      await adminScopeApi.createScope(values);
      message.success('创建成功');
      setScopeModalOpen(false);
      scopeForm.resetFields();
      fetchScopes();
    } catch (error: any) {
      const msg = error.response?.data?.detail || '创建失败';
      message.error(msg);
    }
  };

  const handleUpdateScope = async (values: any) => {
    if (!editingScope) return;
    try {
      await adminScopeApi.updateScope({
        scope_id: editingScope.id,
        ...values,
        yn: values.yn ? 1 : 0,
      });
      message.success('更新成功');
      setScopeModalOpen(false);
      setEditingScope(null);
      scopeForm.resetFields();
      fetchScopes();
    } catch (error: any) {
      const msg = error.response?.data?.detail || '更新失败';
      message.error(msg);
    }
  };

  const handleDeleteScope = async (scopeId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该权限吗？此操作不可恢复。',
      onOk: async () => {
        try {
          await adminScopeApi.removeScope({ scope_id: scopeId });
          message.success('删除成功');
          fetchScopes();
          if (filter.scopeId === scopeId) {
            setFilter(prev => ({ ...prev, scopeId: null }));
          }
        } catch (error: any) {
          message.error('删除失败');
        }
      },
    });
  };

  // ========== 关联管理 ==========
  // 打开用户关联管理
  const openUserRelationModal = (user: UserInfo) => {
    setEditingUser(user);
    // 获取用户当前已关联的组
    adminUserApi.getUser(user.id).then(response => {
      setUserTargetGroups(response.data.groups.map(g => g.id.toString()));
      setUserRelationModalOpen(true);
    });
  };

  // 打开组权限关联管理
  const openGroupScopeRelationModal = (group: GroupInfo) => {
    setEditingGroup(group);
    // 获取组当前已关联的权限
    adminGroupApi.getGroup(group.id).then(response => {
      setGroupTargetScopes(response.data.scopes.map(s => s.id.toString()));
      setGroupScopeRelationModalOpen(true);
    });
  };

  // 打开组用户关联管理
  const openGroupUserRelationModal = (group: GroupInfo) => {
    setEditingGroup(group);
    // 获取组当前已关联的用户
    adminGroupApi.getGroup(group.id).then(response => {
      setGroupTargetUsers(response.data.users.map(u => u.id.toString()));
      setGroupUserRelationModalOpen(true);
    });
  };

  // 打开权限组关联管理
  const openScopeGroupRelationModal = (scope: ScopeInfo) => {
    setEditingScope(scope);
    // 获取权限当前已关联的组
    adminScopeApi.getScope(scope.id).then(response => {
      setScopeTargetGroups(response.data.groups.map(g => g.id.toString()));
      setScopeGroupRelationModalOpen(true);
    });
  };

  // 处理用户-组关联变更
  const handleUserGroupChange = async (newTargetKeys: React.Key[]) => {
    if (!editingUser) return;

    const keys = newTargetKeys.map(k => k.toString());
    const oldKeys = userTargetGroups;
    const addKeys = keys.filter(k => !oldKeys.includes(k));
    const removeKeys = oldKeys.filter(k => !keys.includes(k));

    try {
      // 添加关联
      if (addKeys.length > 0) {
        await adminRelationApi.addUserGroup({
          relations: addKeys.map(gid => ({
            user_id: editingUser.id,
            group_id: parseInt(gid),
          })),
        });
      }
      // 移除关联
      if (removeKeys.length > 0) {
        await adminRelationApi.removeUserGroup({
          relations: removeKeys.map(gid => ({
            user_id: editingUser.id,
            group_id: parseInt(gid),
          })),
        });
      }
      message.success('用户组关联更新成功');
      setUserTargetGroups(keys);

      // 如果当前筛选的是该用户，刷新关联数据
      if (filter.userId === editingUser.id) {
        await fetchUserRelations(editingUser.id);
      }
    } catch (error) {
      message.error('更新关联失败');
    }
  };

  // 处理组-权限关联变更
  const handleGroupScopeChange = async (newTargetKeys: React.Key[]) => {
    if (!editingGroup) return;

    const keys = newTargetKeys.map(k => k.toString());
    const oldKeys = groupTargetScopes;
    const addKeys = keys.filter(k => !oldKeys.includes(k));
    const removeKeys = oldKeys.filter(k => !keys.includes(k));

    try {
      // 添加关联
      if (addKeys.length > 0) {
        await adminRelationApi.addGroupScope({
          relations: addKeys.map(sid => ({
            group_id: editingGroup.id,
            scope_id: parseInt(sid),
          })),
        });
      }
      // 移除关联
      if (removeKeys.length > 0) {
        await adminRelationApi.removeGroupScope({
          relations: removeKeys.map(sid => ({
            group_id: editingGroup.id,
            scope_id: parseInt(sid),
          })),
        });
      }
      message.success('组权限关联更新成功');
      setGroupTargetScopes(keys);

      // 如果当前筛选的是该组，刷新关联数据
      if (filter.groupId === editingGroup.id) {
        await fetchGroupRelations(editingGroup.id);
      }
    } catch (error) {
      message.error('更新关联失败');
    }
  };

  // 处理组-用户关联变更
  const handleGroupUserChange = async (newTargetKeys: React.Key[]) => {
    if (!editingGroup) return;

    const keys = newTargetKeys.map(k => k.toString());
    const oldKeys = groupTargetUsers;
    const addKeys = keys.filter(k => !oldKeys.includes(k));
    const removeKeys = oldKeys.filter(k => !keys.includes(k));

    try {
      // 添加关联
      if (addKeys.length > 0) {
        await adminRelationApi.addUserGroup({
          relations: addKeys.map(uid => ({
            user_id: parseInt(uid),
            group_id: editingGroup.id,
          })),
        });
      }
      // 移除关联
      if (removeKeys.length > 0) {
        await adminRelationApi.removeUserGroup({
          relations: removeKeys.map(uid => ({
            user_id: parseInt(uid),
            group_id: editingGroup.id,
          })),
        });
      }
      message.success('组用户关联更新成功');
      setGroupTargetUsers(keys);

      // 如果当前筛选的是该组，刷新关联数据
      if (filter.groupId === editingGroup.id) {
        await fetchGroupRelations(editingGroup.id);
      }
    } catch (error) {
      message.error('更新关联失败');
    }
  };

  // 处理权限-组关联变更
  const handleScopeGroupChange = async (newTargetKeys: React.Key[]) => {
    if (!editingScope) return;

    const keys = newTargetKeys.map(k => k.toString());
    const oldKeys = scopeTargetGroups;
    const addKeys = keys.filter(k => !oldKeys.includes(k));
    const removeKeys = oldKeys.filter(k => !keys.includes(k));

    try {
      // 添加关联
      if (addKeys.length > 0) {
        await adminRelationApi.addGroupScope({
          relations: addKeys.map(gid => ({
            group_id: parseInt(gid),
            scope_id: editingScope.id,
          })),
        });
      }
      // 移除关联
      if (removeKeys.length > 0) {
        await adminRelationApi.removeGroupScope({
          relations: removeKeys.map(gid => ({
            group_id: parseInt(gid),
            scope_id: editingScope.id,
          })),
        });
      }
      message.success('权限组关联更新成功');
      setScopeTargetGroups(keys);

      // 如果当前筛选的是该权限，刷新关联数据
      if (filter.scopeId === editingScope.id) {
        await fetchScopeRelations(editingScope.id);
      }
    } catch (error) {
      message.error('更新关联失败');
    }
  };

  // ========== 表格列定义 ==========
  const userColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      sorter: true,
      sortOrder: userSort.field === 'id' ? userSort.order : null,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      sorter: true,
      sortOrder: userSort.field === 'username' ? userSort.order : null,
      render: (text: string, record: UserInfo) => (
        <span style={{ opacity: record.yn === 0 ? 0.5 : 1 }}>{text}</span>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      sorter: true,
      sortOrder: userSort.field === 'email' ? userSort.order : null,
      render: (text: string, record: UserInfo) => (
        <span style={{ opacity: record.yn === 0 ? 0.5 : 1 }}>{text}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: UserInfo) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setEditingUser(record);
                userForm.setFieldsValue({
                  ...record,
                  yn: record.yn === 1,
                });
                setUserModalOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteUser(record.id);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const groupColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      sorter: true,
      sortOrder: groupSort.field === 'id' ? groupSort.order : null,
    },
    {
      title: '名称',
      dataIndex: 'name',
      sorter: true,
      sortOrder: groupSort.field === 'name' ? groupSort.order : null,
      render: (text: string, record: GroupInfo) => (
        <span style={{ opacity: record.yn === 0 ? 0.5 : 1 }}>{text}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: GroupInfo) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setEditingGroup(record);
                groupForm.setFieldsValue({
                  ...record,
                  yn: record.yn === 1,
                });
                setGroupModalOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteGroup(record.id);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const scopeColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      sorter: true,
      sortOrder: scopeSort.field === 'id' ? scopeSort.order : null,
    },
    {
      title: '名称',
      dataIndex: 'name',
      sorter: true,
      sortOrder: scopeSort.field === 'name' ? scopeSort.order : null,
      render: (text: string, record: ScopeInfo) => (
        <span style={{ opacity: record.yn === 0 ? 0.5 : 1 }}>{text}</span>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      render: (desc: string | null, record: ScopeInfo) => (
        <span style={{ opacity: record.yn === 0 ? 0.5 : 1 }}>{desc || '-'}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: ScopeInfo) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setEditingScope(record);
                scopeForm.setFieldsValue({
                  ...record,
                  yn: record.yn === 1,
                });
                setScopeModalOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteScope(record.id);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 获取空状态提示文本
  const getEmptyText = () => '空';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/profile')} style={{ marginRight: 16 }}>
          返回
        </Button>
        <Title level={4} style={{ margin: 0, flex: 1 }}>管理面板</Title>
      </Header>

      {/* 筛选状态栏 */}
      {(filter.userId !== null || filter.groupId !== null || filter.scopeId !== null) && (
        <div style={{ background: '#f0f2f5', padding: '12px 24px', borderBottom: '1px solid #e8e8e8' }}>
          <Space align="center">
            <Text type="secondary">当前筛选:</Text>
            {getFilterTags().map((tag, index) => (
              <Tag
                key={index}
                color={tag.type === 'user' ? 'blue' : tag.type === 'group' ? 'green' : 'orange'}
                closable
                onClose={tag.clear}
                style={{ fontSize: 13 }}
              >
                {tag.label}
              </Tag>
            ))}
            <Button type="link" size="small" icon={<ClearOutlined />} onClick={clearAllFilters}>
              清除全部
            </Button>
          </Space>
        </div>
      )}

      <Content style={{ padding: 16, display: 'flex', gap: 16 }}>
        {/* 用户栏 */}
        <Card
          title={
            <Space>
              <UserOutlined />
              <span>用户</span>
              {filter.userId !== null && <Badge status="processing" />}
            </Space>
          }
          style={{ flex: 1, minWidth: 0 }}
          extra={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingUser(null);
                userForm.resetFields();
                setUserModalOpen(true);
              }}
            >
              新建
            </Button>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Input
              placeholder="搜索用户"
              prefix={<SearchOutlined />}
              value={userKeyword}
              onChange={(e) => { setUserKeyword(e.target.value); setUserPage(1); }}
              onPressEnter={() => setUserPage(1)}
              suffix={<Button type="link" size="small" icon={<ReloadOutlined />} onClick={fetchUsers} />}
              allowClear
            />
            <Table
              size="small"
              columns={userColumns}
              dataSource={displayUsers}
              rowKey="id"
              loading={usersLoading}
              pagination={{
                current: userPage,
                pageSize,
                total: filter.userId === null ? usersTotal : displayUsers.length,
                onChange: (p) => setUserPage(p),
                showSizeChanger: false,
                simple: true,
              }}
              scroll={{ y: 350 }}
              locale={{ emptyText: getEmptyText() }}
              rowClassName={(record) => {
                const isSelected = filter.userId === record.id;
                const isDisabled = record.yn === 0;
                return `${isSelected ? 'ant-table-row-selected' : ''} ${isDisabled ? 'row-disabled' : ''}`;
              }}
              onRow={(record) => ({
                onClick: () => handleUserClick(record),
                style: {
                  cursor: 'pointer',
                  backgroundColor: filter.userId === record.id ? '#e6f7ff' : undefined,
                },
              })}
              onChange={(_, __, sorter: any) => {
                // 处理 Ant Design 的多级排序格式
                const sorterArray = Array.isArray(sorter) ? sorter : [sorter];
                const activeSorter = sorterArray.find((s: any) => s && s.field) || sorterArray[0];

                if (activeSorter && activeSorter.field) {
                  // 获取当前字段的排序状态
                  const currentOrder = userSort.field === activeSorter.field ? userSort.order : null;
                  // 循环切换: 升序 -> 降序 -> 升序
                  let newOrder: 'ascend' | 'descend';
                  if (currentOrder === 'ascend') {
                    newOrder = 'descend';
                  } else {
                    newOrder = 'ascend';
                  }
                  setUserSort({
                    field: activeSorter.field,
                    order: newOrder,
                  });
                }
              }}
            />
          </Space>
        </Card>

        {/* 组栏 */}
        <Card
          title={
            <Space>
              <TeamOutlined />
              <span>组</span>
              {filter.groupId !== null && <Badge status="processing" />}
            </Space>
          }
          style={{ flex: 1, minWidth: 0 }}
          extra={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingGroup(null);
                groupForm.resetFields();
                setGroupModalOpen(true);
              }}
            >
              新建
            </Button>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Input
              placeholder="搜索组"
              prefix={<SearchOutlined />}
              value={groupKeyword}
              onChange={(e) => { setGroupKeyword(e.target.value); setGroupPage(1); }}
              onPressEnter={() => setGroupPage(1)}
              suffix={<Button type="link" size="small" icon={<ReloadOutlined />} onClick={fetchGroups} />}
              allowClear
            />
            <Table
              size="small"
              columns={groupColumns}
              dataSource={displayGroups}
              rowKey="id"
              loading={groupsLoading}
              pagination={{
                current: groupPage,
                pageSize,
                total: filter.groupId === null ? groupsTotal : displayGroups.length,
                onChange: (p) => setGroupPage(p),
                showSizeChanger: false,
                simple: true,
              }}
              scroll={{ y: 350 }}
              locale={{ emptyText: getEmptyText() }}
              rowClassName={(record) => {
                const isSelected = filter.groupId === record.id;
                const isDisabled = record.yn === 0;
                return `${isSelected ? 'ant-table-row-selected' : ''} ${isDisabled ? 'row-disabled' : ''}`;
              }}
              onRow={(record) => ({
                onClick: () => handleGroupClick(record),
                style: {
                  cursor: 'pointer',
                  backgroundColor: filter.groupId === record.id ? '#e6f7ff' : undefined,
                },
              })}
              onChange={(_, __, sorter: any) => {
                // 处理 Ant Design 的多级排序格式
                const sorterArray = Array.isArray(sorter) ? sorter : [sorter];
                const activeSorter = sorterArray.find((s: any) => s && s.field) || sorterArray[0];

                if (activeSorter && activeSorter.field) {
                  // 获取当前字段的排序状态
                  const currentOrder = groupSort.field === activeSorter.field ? groupSort.order : null;
                  // 循环切换: 升序 -> 降序 -> 升序
                  let newOrder: 'ascend' | 'descend';
                  if (currentOrder === 'ascend') {
                    newOrder = 'descend';
                  } else {
                    newOrder = 'ascend';
                  }
                  setGroupSort({
                    field: activeSorter.field,
                    order: newOrder,
                  });
                }
              }}
            />
          </Space>
        </Card>

        {/* 权限栏 */}
        <Card
          title={
            <Space>
              <SafetyOutlined />
              <span>权限</span>
              {filter.scopeId !== null && <Badge status="processing" />}
            </Space>
          }
          style={{ flex: 1, minWidth: 0 }}
          extra={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingScope(null);
                scopeForm.resetFields();
                setScopeModalOpen(true);
              }}
            >
              新建
            </Button>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Input
              placeholder="搜索权限"
              prefix={<SearchOutlined />}
              value={scopeKeyword}
              onChange={(e) => { setScopeKeyword(e.target.value); setScopePage(1); }}
              onPressEnter={() => setScopePage(1)}
              suffix={<Button type="link" size="small" icon={<ReloadOutlined />} onClick={fetchScopes} />}
              allowClear
            />
            <Table
              size="small"
              columns={scopeColumns}
              dataSource={displayScopes}
              rowKey="id"
              loading={scopesLoading}
              pagination={{
                current: scopePage,
                pageSize,
                total: filter.scopeId === null ? scopesTotal : displayScopes.length,
                onChange: (p) => setScopePage(p),
                showSizeChanger: false,
                simple: true,
              }}
              scroll={{ y: 350 }}
              locale={{ emptyText: getEmptyText() }}
              rowClassName={(record) => {
                const isSelected = filter.scopeId === record.id;
                const isDisabled = record.yn === 0;
                return `${isSelected ? 'ant-table-row-selected' : ''} ${isDisabled ? 'row-disabled' : ''}`;
              }}
              onRow={(record) => ({
                onClick: () => handleScopeClick(record),
                style: {
                  cursor: 'pointer',
                  backgroundColor: filter.scopeId === record.id ? '#e6f7ff' : undefined,
                },
              })}
              onChange={(_, __, sorter: any) => {
                // 处理 Ant Design 的多级排序格式
                const sorterArray = Array.isArray(sorter) ? sorter : [sorter];
                const activeSorter = sorterArray.find((s: any) => s && s.field) || sorterArray[0];

                if (activeSorter && activeSorter.field) {
                  // 获取当前字段的排序状态
                  const currentOrder = scopeSort.field === activeSorter.field ? scopeSort.order : null;
                  // 循环切换: 升序 -> 降序 -> 升序
                  let newOrder: 'ascend' | 'descend';
                  if (currentOrder === 'ascend') {
                    newOrder = 'descend';
                  } else {
                    newOrder = 'ascend';
                  }
                  setScopeSort({
                    field: activeSorter.field,
                    order: newOrder,
                  });
                }
              }}
            />
          </Space>
        </Card>
      </Content>

      {/* 用户编辑弹窗 */}
      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={userModalOpen}
        onCancel={() => {
          setUserModalOpen(false);
          setEditingUser(null);
          userForm.resetFields();
        }}
        onOk={() => userForm.submit()}
        destroyOnClose
      >
        <Form form={userForm} layout="vertical" onFinish={editingUser ? handleUpdateUser : handleCreateUser}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱' }
            ]}
          >
            <Input />
          </Form.Item>
          {!editingUser && (
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password />
            </Form.Item>
          )}
          {editingUser && (
            <>
              <Form.Item name="yn" label="状态" valuePropName="checked">
                <Switch checkedChildren="正常" unCheckedChildren="禁用" />
              </Form.Item>
              <Divider />
              <Form.Item>
                <Button
                  type="dashed"
                  block
                  icon={<LinkOutlined />}
                  onClick={() => {
                    setUserModalOpen(false);
                    openUserRelationModal(editingUser);
                  }}
                >
                  管理组关联
                </Button>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* 用户组关联管理弹窗 */}
      <Modal
        title={`管理用户组关联 - ${editingUser?.username}`}
        open={userRelationModalOpen}
        onCancel={() => {
          setUserRelationModalOpen(false);
          setEditingUser(null);
          setUserTargetGroups([]);
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Transfer
          dataSource={groups.map(g => ({ key: g.id.toString(), title: g.name }))}
          titles={['可选组', '已关联']}
          targetKeys={userTargetGroups}
          onChange={handleUserGroupChange}
          render={item => item.title}
          listStyle={{ width: 250, height: 350 }}
          showSearch
          filterOption={(inputValue, item) =>
            (item?.title as string)?.toLowerCase().includes(inputValue.toLowerCase())
          }
        />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button onClick={() => setUserRelationModalOpen(false)}>关闭</Button>
        </div>
      </Modal>

      {/* 组编辑弹窗 */}
      <Modal
        title={editingGroup ? '编辑组' : '新建组'}
        open={groupModalOpen}
        onCancel={() => {
          setGroupModalOpen(false);
          setEditingGroup(null);
          groupForm.resetFields();
        }}
        onOk={() => groupForm.submit()}
        destroyOnClose
      >
        <Form form={groupForm} layout="vertical" onFinish={editingGroup ? handleUpdateGroup : handleCreateGroup}>
          <Form.Item name="name" label="组名" rules={[{ required: true, message: '请输入组名' }]}>
            <Input />
          </Form.Item>
          {editingGroup && (
            <>
              <Form.Item name="yn" label="状态" valuePropName="checked">
                <Switch checkedChildren="正常" unCheckedChildren="禁用" />
              </Form.Item>
              <Divider />
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="dashed"
                  block
                  icon={<LinkOutlined />}
                  onClick={() => {
                    setGroupModalOpen(false);
                    openGroupUserRelationModal(editingGroup);
                  }}
                >
                  管理用户关联
                </Button>
                <Button
                  type="dashed"
                  block
                  icon={<LinkOutlined />}
                  onClick={() => {
                    setGroupModalOpen(false);
                    openGroupScopeRelationModal(editingGroup);
                  }}
                >
                  管理权限关联
                </Button>
              </Space>
            </>
          )}
        </Form>
      </Modal>

      {/* 组用户关联管理弹窗 */}
      <Modal
        title={`管理组用户关联 - ${editingGroup?.name}`}
        open={groupUserRelationModalOpen}
        onCancel={() => {
          setGroupUserRelationModalOpen(false);
          setEditingGroup(null);
          setGroupTargetUsers([]);
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Transfer
          dataSource={users.map(u => ({ key: u.id.toString(), title: u.username, description: u.email }))}
          titles={['可选用户', '已关联']}
          targetKeys={groupTargetUsers}
          onChange={handleGroupUserChange}
          render={item => (
            <Tooltip title={item.description}>
              <span>{item.title}</span>
            </Tooltip>
          )}
          listStyle={{ width: 250, height: 350 }}
          showSearch
          filterOption={(inputValue, item) =>
            (item?.title as string)?.toLowerCase().includes(inputValue.toLowerCase()) ||
            (item?.description as string)?.toLowerCase().includes(inputValue.toLowerCase())
          }
        />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button onClick={() => setGroupUserRelationModalOpen(false)}>关闭</Button>
        </div>
      </Modal>

      {/* 组权限关联管理弹窗 */}
      <Modal
        title={`管理组权限关联 - ${editingGroup?.name}`}
        open={groupScopeRelationModalOpen}
        onCancel={() => {
          setGroupScopeRelationModalOpen(false);
          setEditingGroup(null);
          setGroupTargetScopes([]);
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Transfer
          dataSource={scopes.map(s => ({ key: s.id.toString(), title: s.name, description: s.description || '' }))}
          titles={['可选权限', '已关联']}
          targetKeys={groupTargetScopes}
          onChange={handleGroupScopeChange}
          render={item => (
            <Tooltip title={item.description}>
              <span>{item.title}</span>
            </Tooltip>
          )}
          listStyle={{ width: 250, height: 350 }}
          showSearch
          filterOption={(inputValue, item) =>
            (item?.title as string)?.toLowerCase().includes(inputValue.toLowerCase()) ||
            (item?.description as string)?.toLowerCase().includes(inputValue.toLowerCase())
          }
        />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button onClick={() => setGroupScopeRelationModalOpen(false)}>关闭</Button>
        </div>
      </Modal>

      {/* 权限编辑弹窗 */}
      <Modal
        title={editingScope ? '编辑权限' : '新建权限'}
        open={scopeModalOpen}
        onCancel={() => {
          setScopeModalOpen(false);
          setEditingScope(null);
          scopeForm.resetFields();
        }}
        onOk={() => scopeForm.submit()}
        destroyOnClose
      >
        <Form form={scopeForm} layout="vertical" onFinish={editingScope ? handleUpdateScope : handleCreateScope}>
          <Form.Item name="name" label="权限名" rules={[{ required: true, message: '请输入权限名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          {editingScope && (
            <>
              <Form.Item name="yn" label="状态" valuePropName="checked">
                <Switch checkedChildren="正常" unCheckedChildren="禁用" />
              </Form.Item>
              <Divider />
              <Button
                type="dashed"
                block
                icon={<LinkOutlined />}
                onClick={() => {
                  setScopeModalOpen(false);
                  openScopeGroupRelationModal(editingScope);
                }}
              >
                管理组关联
              </Button>
            </>
          )}
        </Form>
      </Modal>

      {/* 权限组关联管理弹窗 */}
      <Modal
        title={`管理权限组关联 - ${editingScope?.name}`}
        open={scopeGroupRelationModalOpen}
        onCancel={() => {
          setScopeGroupRelationModalOpen(false);
          setEditingScope(null);
          setScopeTargetGroups([]);
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Transfer
          dataSource={groups.map(g => ({ key: g.id.toString(), title: g.name }))}
          titles={['可选组', '已关联']}
          targetKeys={scopeTargetGroups}
          onChange={handleScopeGroupChange}
          render={item => item.title}
          listStyle={{ width: 250, height: 350 }}
          showSearch
          filterOption={(inputValue, item) =>
            (item?.title as string)?.toLowerCase().includes(inputValue.toLowerCase())
          }
        />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button onClick={() => setScopeGroupRelationModalOpen(false)}>关闭</Button>
        </div>
      </Modal>
    </Layout>
  );
}
