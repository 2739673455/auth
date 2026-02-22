import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Menu,
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
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { adminUserApi } from '../../../api/admin';
import type { UserInfo } from '../../../types';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const response = await adminUserApi.listUsers({
        offset,
        limit: pageSize,
        keyword: keyword || undefined,
      });
      setUsers(response.data.items);
      setTotal(response.data.total);
    } catch (error: any) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, pageSize, keyword]);

  const handleCreate = async (values: any) => {
    try {
      await adminUserApi.createUser(values);
      message.success('创建成功');
      setIsModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (error: any) {
      const msg = error.response?.data?.detail || '创建失败';
      message.error(msg);
    }
  };

  const handleUpdate = async (values: any) => {
    if (!editingUser) return;
    try {
      await adminUserApi.updateUser({
        user_id: editingUser.id,
        ...values,
      });
      message.success('更新成功');
      setIsModalOpen(false);
      setEditingUser(null);
      form.resetFields();
      fetchUsers();
    } catch (error: any) {
      const msg = error.response?.data?.detail || '更新失败';
      message.error(msg);
    }
  };

  const handleDelete = async (userId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该用户吗？此操作不可恢复。',
      onOk: async () => {
        try {
          await adminUserApi.removeUser({ user_id: userId });
          message.success('删除成功');
          fetchUsers();
        } catch (error: any) {
          message.error('删除失败');
        }
      },
    });
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
    },
    {
      title: '状态',
      dataIndex: 'yn',
      render: (yn: number) => (
        <Tag color={yn === 1 ? 'green' : 'red'}>
          {yn === 1 ? '正常' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'create_at',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: UserInfo) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setEditingUser(record);
              form.setFieldsValue(record);
              setIsModalOpen(true);
            }}
          >
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const menuItems = [
    {
      key: 'users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
    {
      key: 'groups',
      icon: <TeamOutlined />,
      label: '组管理',
      onClick: () => navigate('/admin/groups'),
    },
    {
      key: 'scopes',
      icon: <SafetyOutlined />,
      label: '权限管理',
      onClick: () => navigate('/admin/scopes'),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={200}>
        <div style={{ padding: 16, textAlign: 'center' }}>
          <Title level={4}>管理后台</Title>
        </div>
        <Menu mode="inline" selectedKeys={['users']} items={menuItems} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/profile')}
            style={{ marginRight: 16 }}
          >
            返回
          </Button>
          <span>用户管理</span>
        </Header>
        <Content style={{ padding: 24 }}>
          <Card>
            <Space style={{ marginBottom: 16 }}>
              <Input
                placeholder="搜索用户"
                prefix={<SearchOutlined />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={() => setPage(1)}
                style={{ width: 250 }}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                setEditingUser(null);
                form.resetFields();
                setIsModalOpen(true);
              }}>
                新增用户
              </Button>
            </Space>

            <Table
              columns={columns}
              dataSource={users}
              rowKey="id"
              loading={loading}
              pagination={{
                current: page,
                pageSize,
                total,
                onChange: (p, s) => {
                  setPage(p);
                  if (s) setPageSize(s);
                },
              }}
            />
          </Card>
        </Content>
      </Layout>

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingUser(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingUser ? handleUpdate : handleCreate}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱' },
            ]}
          >
            <Input disabled={!!editingUser} />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
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
    </Layout>
  );
}
