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
import { adminScopeApi } from '../../../api/admin';
import type { ScopeInfo } from '../../../types';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function AdminScopes() {
  const navigate = useNavigate();
  const [scopes, setScopes] = useState<ScopeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScope, setEditingScope] = useState<ScopeInfo | null>(null);
  const [form] = Form.useForm();

  const fetchScopes = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const response = await adminScopeApi.listScopes({
        offset,
        limit: pageSize,
        keyword: keyword || undefined,
      });
      setScopes(response.data.items);
      setTotal(response.data.total);
    } catch (error: any) {
      message.error('获取权限列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScopes();
  }, [page, pageSize, keyword]);

  const handleCreate = async (values: any) => {
    try {
      await adminScopeApi.createScope(values);
      message.success('创建成功');
      setIsModalOpen(false);
      form.resetFields();
      fetchScopes();
    } catch (error: any) {
      const msg = error.response?.data?.detail || '创建失败';
      message.error(msg);
    }
  };

  const handleUpdate = async (values: any) => {
    if (!editingScope) return;
    try {
      await adminScopeApi.updateScope({
        scope_id: editingScope.id,
        ...values,
      });
      message.success('更新成功');
      setIsModalOpen(false);
      setEditingScope(null);
      form.resetFields();
      fetchScopes();
    } catch (error: any) {
      const msg = error.response?.data?.detail || '更新失败';
      message.error(msg);
    }
  };

  const handleDelete = async (scopeId: number) => {
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

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '权限名',
      dataIndex: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
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
      title: '操作',
      key: 'action',
      render: (_: any, record: ScopeInfo) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setEditingScope(record);
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
      onClick: () => navigate('/admin/users'),
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
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={200}>
        <div style={{ padding: 16, textAlign: 'center' }}>
          <Title level={4}>管理后台</Title>
        </div>
        <Menu mode="inline" selectedKeys={['scopes']} items={menuItems} />
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
          <span>权限管理</span>
        </Header>
        <Content style={{ padding: 24 }}>
          <Card>
            <Space style={{ marginBottom: 16 }}>
              <Input
                placeholder="搜索权限"
                prefix={<SearchOutlined />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={() => setPage(1)}
                style={{ width: 250 }}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                setEditingScope(null);
                form.resetFields();
                setIsModalOpen(true);
              }}>
                新增权限
              </Button>
            </Space>

            <Table
              columns={columns}
              dataSource={scopes}
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
        title={editingScope ? '编辑权限' : '新增权限'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingScope(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingScope ? handleUpdate : handleCreate}
        >
          <Form.Item
            name="name"
            label="权限名"
            rules={[{ required: true, message: '请输入权限名' }]}
          >
            <Input disabled={!!editingScope} />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <Input.TextArea />
          </Form.Item>
          {editingScope && (
            <Form.Item name="yn" label="状态" valuePropName="checked">
              <Switch checkedChildren="正常" unCheckedChildren="禁用" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Layout>
  );
}
