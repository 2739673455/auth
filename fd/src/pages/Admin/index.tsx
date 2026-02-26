import { useState, useEffect, useCallback } from 'react';
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
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { adminUserApi, adminGroupApi, adminScopeApi, adminRelationApi } from '../../api/admin';
import type { UserInfo, GroupInfo, ScopeInfo } from '../../types';

const { Header, Content } = Layout;
const { Title } = Typography;

interface SelectedUser extends UserInfo {
  groups?: GroupInfo[];
  scopes?: ScopeInfo[];
}

interface SelectedGroup extends GroupInfo {
  scopes?: ScopeInfo[];
}

export default function AdminPanel() {
  const navigate = useNavigate();
  
  // 全部数据
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [allGroups, setAllGroups] = useState<GroupInfo[]>([]);
  const [allScopes, setAllScopes] = useState<ScopeInfo[]>([]);
  
  // 加载状态
  const [usersLoading, setUsersLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [scopesLoading, setScopesLoading] = useState(false);
  
  // 分页
  const [usersTotal, setUsersTotal] = useState(0);
  const [groupsTotal, setGroupsTotal] = useState(0);
  const [scopesTotal, setScopesTotal] = useState(0);
  
  // 搜索关键词
  const [userKeyword, setUserKeyword] = useState('');
  const [groupKeyword, setGroupKeyword] = useState('');
  const [scopeKeyword, setScopeKeyword] = useState('');
  
  // 当前页码
  const [userPage, setUserPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);
  const [scopePage, setScopePage] = useState(1);
  
  const pageSize = 10;
  
  // 选中的数据
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup | null>(null);
  
  // 用户模态框
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [userForm] = Form.useForm();
  
  // 组模态框
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupInfo | null>(null);
  const [groupForm] = Form.useForm();
  
  // 权限模态框
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [editingScope, setEditingScope] = useState<ScopeInfo | null>(null);
  const [scopeForm] = Form.useForm();
  
  // 关联模态框
  const [relationModalOpen, setRelationModalOpen] = useState(false);
  const [relationType, setRelationType] = useState<'user-group' | 'group-scope'>('user-group');
  
  // 当前用户/组的组/权限列表（用于Transfer组件）
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  
  // 加载全部用户
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
  
  // 加载全部组
  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const offset = (groupPage - 1) * pageSize;
      const response = await adminGroupApi.listGroups({
        offset,
        limit: pageSize,
        keyword: groupKeyword || undefined,
      });
      setAllGroups(response.data.items);
      setGroupsTotal(response.data.total);
    } catch (error: any) {
      message.error('获取组列表失败');
    } finally {
      setGroupsLoading(false);
    }
  }, [groupPage, groupKeyword]);
  
  // 加载全部权限
  const fetchScopes = useCallback(async () => {
    setScopesLoading(true);
    try {
      const offset = (scopePage - 1) * pageSize;
      const response = await adminScopeApi.listScopes({
        offset,
        limit: pageSize,
        keyword: scopeKeyword || undefined,
      });
      setAllScopes(response.data.items);
      setScopesTotal(response.data.total);
    } catch (error: any) {
      message.error('获取权限列表失败');
    } finally {
      setScopesLoading(false);
    }
  }, [scopePage, scopeKeyword]);
  
  // 初始化加载
  useEffect(() => {
    fetchUsers();
    fetchGroups();
    fetchScopes();
  }, [fetchUsers, fetchGroups, fetchScopes]);
  
  // 点击用户：显示该用户的组和权限
  const handleUserClick = async (user: UserInfo) => {
    try {
      const response = await adminUserApi.getUser(user.id);
      setSelectedUser({
        ...user,
        groups: response.data.groups,
        scopes: response.data.scopes,
      });
      setSelectedGroup(null); // 清除选中的组
    } catch (error: any) {
      message.error('获取用户详情失败');
    }
  };
  
  // 点击组：显示该组的权限
  const handleGroupClick = async (group: GroupInfo) => {
    try {
      const response = await adminGroupApi.getGroup(group.id);
      setSelectedGroup({
        ...group,
        scopes: response.data.scopes,
      });
    } catch (error: any) {
      message.error('获取组详情失败');
    }
  };
  
  // 清除用户选择
  const clearUserSelection = () => {
    setSelectedUser(null);
    setSelectedGroup(null);
  };
  
  // 清除组选择
  const clearGroupSelection = () => {
    setSelectedGroup(null);
  };
  
  // 获取当前应显示的组列表
  const getDisplayGroups = (): GroupInfo[] => {
    if (selectedUser) {
      return selectedUser.groups || [];
    }
    return allGroups;
  };
  
  // 获取当前应显示的权限列表
  const getDisplayScopes = (): ScopeInfo[] => {
    if (selectedGroup) {
      return selectedGroup.scopes || [];
    }
    if (selectedUser) {
      return selectedUser.scopes || [];
    }
    return allScopes;
  };
  
  // 获取当前组列表的总页数
  const getGroupsTotal = (): number => {
    if (selectedUser) {
      return selectedUser.groups?.length || 0;
    }
    return groupsTotal;
  };
  
  // 获取当前权限列表的总页数
  const getScopesTotal = (): number => {
    if (selectedGroup) {
      return selectedGroup.scopes?.length || 0;
    }
    if (selectedUser) {
      return selectedUser.scopes?.length || 0;
    }
    return scopesTotal;
  };
  
  // 用户操作
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
      });
      message.success('更新成功');
      setUserModalOpen(false);
      setEditingUser(null);
      userForm.resetFields();
      fetchUsers();
      if (selectedUser && selectedUser.id === editingUser.id) {
        handleUserClick({ ...editingUser, ...values });
      }
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
          if (selectedUser?.id === userId) {
            clearUserSelection();
          }
        } catch (error: any) {
          message.error('删除失败');
        }
      },
    });
  };
  
  // 组操作
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
      });
      message.success('更新成功');
      setGroupModalOpen(false);
      setEditingGroup(null);
      groupForm.resetFields();
      fetchGroups();
      if (selectedGroup && selectedGroup.id === editingGroup.id) {
        handleGroupClick({ ...editingGroup, ...values });
      }
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
          if (selectedGroup?.id === groupId) {
            clearGroupSelection();
          }
        } catch (error: any) {
          message.error('删除失败');
        }
      },
    });
  };
  
  // 权限操作
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
        } catch (error: any) {
          message.error('删除失败');
        }
      },
    });
  };
  
  // 打开关联模态框
  const openRelationModal = (type: 'user-group' | 'group-scope') => {
    setRelationType(type);
    if (type === 'user-group') {
      // 获取用户已有的组
      if (selectedUser) {
        const keys = selectedUser.groups?.map(g => g.id.toString()) || [];
        setTargetKeys(keys);
      }
    } else {
      // 获取组已有的权限
      if (selectedGroup) {
        const keys = selectedGroup.scopes?.map(s => s.id.toString()) || [];
        setTargetKeys(keys);
      } else if (selectedUser) {
        const keys = selectedUser.scopes?.map(s => s.id.toString()) || [];
        setTargetKeys(keys);
      }
    }
    setRelationModalOpen(true);
  };
  
  // 处理关联转移
  const handleRelationChange = async (newTargetKeys: React.Key[]) => {
    const keys = newTargetKeys.map(k => k.toString());
    const oldKeys = targetKeys;
    const addKeys = keys.filter(k => !oldKeys.includes(k));
    const removeKeys = oldKeys.filter(k => !keys.includes(k));
    
    try {
      if (relationType === 'user-group') {
        if (!selectedUser) return;
        
        // 添加关联
        if (addKeys.length > 0) {
          await adminRelationApi.addUserGroup({
            relations: addKeys.map(gid => ({
              user_id: selectedUser.id,
              group_id: parseInt(gid),
            })),
          });
        }
        // 移除关联
        if (removeKeys.length > 0) {
          await adminRelationApi.removeUserGroup({
            relations: removeKeys.map(gid => ({
              user_id: selectedUser.id,
              group_id: parseInt(gid),
            })),
          });
        }
        message.success('用户组更新成功');
        // 刷新用户信息
        handleUserClick(selectedUser);
      } else {
        if (!selectedGroup && !selectedUser) return;
        
        if (selectedGroup) {
          // 添加关联
          if (addKeys.length > 0) {
            await adminRelationApi.addGroupScope({
              relations: addKeys.map(sid => ({
                group_id: selectedGroup.id,
                scope_id: parseInt(sid),
              })),
            });
          }
          // 移除关联
          if (removeKeys.length > 0) {
            await adminRelationApi.removeGroupScope({
              relations: removeKeys.map(sid => ({
                group_id: selectedGroup.id,
                scope_id: parseInt(sid),
              })),
            });
          }
          message.success('组权限更新成功');
          handleGroupClick(selectedGroup);
        } else if (selectedUser) {
          // 用户直接关联权限（通过组间接获得）
          message.info('请通过组来管理用户权限');
        }
      }
    } catch (error: any) {
      message.error('更新关联失败');
    }
    setRelationModalOpen(false);
  };
  
  // 用户列表列
  const userColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username' },
    { title: '邮箱', dataIndex: 'email' },
    { title: '状态', dataIndex: 'yn', render: (yn: number) => (
      <Tag color={yn === 1 ? 'green' : 'red'}>{yn === 1 ? '正常' : '禁用'}</Tag>
    )},
    { title: '操作', key: 'action', render: (_: any, record: UserInfo) => (
      <Space>
        <Button type="link" size="small" onClick={() => {
          setEditingUser(record);
          userForm.setFieldsValue(record);
          setUserModalOpen(true);
        }}>编辑</Button>
        <Button type="link" size="small" danger onClick={() => handleDeleteUser(record.id)}>删除</Button>
      </Space>
    )},
  ];
  
  // 组列表列
  const groupColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '组名', dataIndex: 'name' },
    { title: '状态', dataIndex: 'yn', render: (yn: number) => (
      <Tag color={yn === 1 ? 'green' : 'red'}>{yn === 1 ? '正常' : '禁用'}</Tag>
    )},
    { title: '操作', key: 'action', render: (_: any, record: GroupInfo) => (
      <Space>
        <Button type="link" size="small" onClick={() => {
          setEditingGroup(record);
          groupForm.setFieldsValue(record);
          setGroupModalOpen(true);
        }}>编辑</Button>
        <Button type="link" size="small" danger onClick={() => handleDeleteGroup(record.id)}>删除</Button>
      </Space>
    )},
  ];
  
  // 权限列表列
  const scopeColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '权限名', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', render: (desc: string | null) => desc || '-' },
    { title: '状态', dataIndex: 'yn', render: (yn: number) => (
      <Tag color={yn === 1 ? 'green' : 'red'}>{yn === 1 ? '正常' : '禁用'}</Tag>
    )},
    { title: '操作', key: 'action', render: (_: any, record: ScopeInfo) => (
      <Space>
        <Button type="link" size="small" onClick={() => {
          setEditingScope(record);
          scopeForm.setFieldsValue(record);
          setScopeModalOpen(true);
        }}>编辑</Button>
        <Button type="link" size="small" danger onClick={() => handleDeleteScope(record.id)}>删除</Button>
      </Space>
    )},
  ];
  
  // Transfer 数据源
  const getTransferData = () => {
    if (relationType === 'user-group') {
      return allGroups.map(g => ({ key: g.id.toString(), title: g.name, description: g.name }));
    } else {
      return allScopes.map(s => ({ key: s.id.toString(), title: s.name, description: s.description || s.name }));
    }
  };
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/profile')} style={{ marginRight: 16 }}>
          返回
        </Button>
        <Title level={4} style={{ margin: 0 }}>管理面板</Title>
      </Header>
      <Content style={{ padding: 16, display: 'flex', gap: 16 }}>
        {/* 用户栏 */}
        <Card 
          title={<span><UserOutlined /> 用户栏</span>}
          style={{ flex: 1 }}
          extra={
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => {
              setEditingUser(null);
              userForm.resetFields();
              setUserModalOpen(true);
            }}>
              新增
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
            />
            <Table
              size="small"
              columns={userColumns}
              dataSource={users}
              rowKey="id"
              loading={usersLoading}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: selectedUser ? [selectedUser.id] : [],
                onChange: (_, selected) => {
                  if (selected.length > 0) {
                    handleUserClick(selected[0]);
                  }
                },
              }}
              pagination={{
                current: userPage,
                pageSize,
                total: usersTotal,
                onChange: (p) => setUserPage(p),
                showSizeChanger: false,
              }}
              scroll={{ y: 400 }}
            />
          </Space>
        </Card>
        
        {/* 组栏 */}
        <Card 
          title={<span><TeamOutlined /> 组栏</span>}
          style={{ flex: 1 }}
          extra={
            <Space>
              {selectedUser && (
                <Button size="small" onClick={() => openRelationModal('user-group')}>
                  分配组
                </Button>
              )}
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => {
                setEditingGroup(null);
                groupForm.resetFields();
                setGroupModalOpen(true);
              }}>
                新增
              </Button>
            </Space>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {selectedUser && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tag color="blue">已选择用户: {selectedUser.username}</Tag>
                <Button type="link" size="small" onClick={clearUserSelection}>清除</Button>
              </div>
            )}
            {!selectedUser && (
              <Input
                placeholder="搜索组"
                prefix={<SearchOutlined />}
                value={groupKeyword}
                onChange={(e) => { setGroupKeyword(e.target.value); setGroupPage(1); }}
                onPressEnter={() => setGroupPage(1)}
                suffix={<Button type="link" size="small" icon={<ReloadOutlined />} onClick={fetchGroups} />}
              />
            )}
            {selectedUser && (
              <div style={{ fontSize: 12, color: '#999' }}>
                {selectedUser.groups?.length || 0} 个组
              </div>
            )}
            <Table
              size="small"
              columns={groupColumns}
              dataSource={getDisplayGroups()}
              rowKey="id"
              loading={groupsLoading}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: selectedGroup ? [selectedGroup.id] : [],
                onChange: (_, selected) => {
                  if (selected.length > 0) {
                    handleGroupClick(selected[0]);
                  }
                },
              }}
              pagination={{
                current: groupPage,
                pageSize,
                total: getGroupsTotal(),
                onChange: (p) => setGroupPage(p),
                showSizeChanger: false,
              }}
              scroll={{ y: selectedUser ? 350 : 400 }}
              locale={{ emptyText: selectedUser ? '该用户暂无组' : '暂无数据' }}
            />
          </Space>
        </Card>
        
        {/* 权限栏 */}
        <Card 
          title={<span><SafetyOutlined /> 权限栏</span>}
          style={{ flex: 1 }}
          extra={
            <Space>
              {(selectedUser || selectedGroup) && (
                <Button size="small" onClick={() => openRelationModal('group-scope')} disabled={!selectedGroup && !!selectedUser}>
                  分配权限
                </Button>
              )}
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => {
                setEditingScope(null);
                scopeForm.resetFields();
                setScopeModalOpen(true);
              }}>
                新增
              </Button>
            </Space>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {(selectedUser || selectedGroup) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tag color="blue">
                  {selectedGroup ? `组: ${selectedGroup.name}` : `用户: ${selectedUser?.username}`}
                </Tag>
                <Button type="link" size="small" onClick={clearGroupSelection}>清除</Button>
              </div>
            )}
            {!selectedUser && !selectedGroup && (
              <Input
                placeholder="搜索权限"
                prefix={<SearchOutlined />}
                value={scopeKeyword}
                onChange={(e) => { setScopeKeyword(e.target.value); setScopePage(1); }}
                onPressEnter={() => setScopePage(1)}
                suffix={<Button type="link" size="small" icon={<ReloadOutlined />} onClick={fetchScopes} />}
              />
            )}
            {(selectedUser || selectedGroup) && (
              <div style={{ fontSize: 12, color: '#999' }}>
                {getDisplayScopes().length} 个权限
              </div>
            )}
            <Table
              size="small"
              columns={scopeColumns}
              dataSource={getDisplayScopes()}
              rowKey="id"
              loading={scopesLoading}
              pagination={{
                current: scopePage,
                pageSize,
                total: getScopesTotal(),
                onChange: (p) => setScopePage(p),
                showSizeChanger: false,
              }}
              scroll={{ y: (selectedUser || selectedGroup) ? 350 : 400 }}
              locale={{ emptyText: (selectedUser || selectedGroup) ? '暂无权限' : '暂无数据' }}
            />
          </Space>
        </Card>
      </Content>
      
      {/* 用户模态框 */}
      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={userModalOpen}
        onCancel={() => { setUserModalOpen(false); setEditingUser(null); userForm.resetFields(); }}
        onOk={() => userForm.submit()}
        destroyOnClose
      >
        <Form form={userForm} layout="vertical" onFinish={editingUser ? handleUpdateUser : handleCreateUser}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效的邮箱' }]}>
            <Input disabled={!!editingUser} />
          </Form.Item>
          {!editingUser && (
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password />
            </Form.Item>
          )}
          {editingUser && (
            <Form.Item name="yn" label="状态" valuePropName="checked">
              <Switch checkedChildren="正常" unCheckedChildren="禁用" />
            </Form.Item>
          )}
        </Form>
      </Modal>
      
      {/* 组模态框 */}
      <Modal
        title={editingGroup ? '编辑组' : '新增组'}
        open={groupModalOpen}
        onCancel={() => { setGroupModalOpen(false); setEditingGroup(null); groupForm.resetFields(); }}
        onOk={() => groupForm.submit()}
        destroyOnClose
      >
        <Form form={groupForm} layout="vertical" onFinish={editingGroup ? handleUpdateGroup : handleCreateGroup}>
          <Form.Item name="name" label="组名" rules={[{ required: true, message: '请输入组名' }]}>
            <Input disabled={!!editingGroup} />
          </Form.Item>
          {editingGroup && (
            <Form.Item name="yn" label="状态" valuePropName="checked">
              <Switch checkedChildren="正常" unCheckedChildren="禁用" />
            </Form.Item>
          )}
        </Form>
      </Modal>
      
      {/* 权限模态框 */}
      <Modal
        title={editingScope ? '编辑权限' : '新增权限'}
        open={scopeModalOpen}
        onCancel={() => { setScopeModalOpen(false); setEditingScope(null); scopeForm.resetFields(); }}
        onOk={() => scopeForm.submit()}
        destroyOnClose
      >
        <Form form={scopeForm} layout="vertical" onFinish={editingScope ? handleUpdateScope : handleCreateScope}>
          <Form.Item name="name" label="权限名" rules={[{ required: true, message: '请输入权限名' }]}>
            <Input disabled={!!editingScope} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          {editingScope && (
            <Form.Item name="yn" label="状态" valuePropName="checked">
              <Switch checkedChildren="正常" unCheckedChildren="禁用" />
            </Form.Item>
          )}
        </Form>
      </Modal>
      
      {/* 关联模态框 */}
      <Modal
        title={relationType === 'user-group' ? '分配用户组' : '分配组权限'}
        open={relationModalOpen}
        onCancel={() => setRelationModalOpen(false)}
        footer={null}
        width={500}
      >
        <Transfer
          dataSource={getTransferData()}
          titles={['可选', '已选']}
          targetKeys={targetKeys}
          onChange={handleRelationChange}
          render={item => item.title}
          listStyle={{ width: 200, height: 300 }}
        />
      </Modal>
    </Layout>
  );
}
