import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Menu,
  Card,
  Form,
  Input,
  Button,
  message,
  Typography,
  Descriptions,
  Tag,
  Divider,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, hasScope, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [userForm] = Form.useForm();

  useEffect(() => {
    if (user) {
      userForm.setFieldsValue({ username: user.username });
    }
  }, [user, userForm]);

  const handleLogout = async () => {
    await logout();
    message.success('已登出');
    navigate('/login');
  };

  const updateUsername = async (values: { username: string }) => {
    setLoading(true);
    try {
      await authApi.updateUsername(values);
      message.success('用户名修改成功');
      // 刷新用户信息
      const response = await authApi.getMe();
      setUser(response.data);
    } catch (error: any) {
      const msg = error.response?.data?.detail || '修改失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      key: 'info',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账号设置',
    },
    ...(hasScope('*') || hasScope('admin')
      ? [
          {
            key: 'admin',
            icon: <TeamOutlined />,
            label: '管理后台',
            children: [
              { key: 'admin-users', label: '用户管理' },
              { key: 'admin-groups', label: '组管理' },
              { key: 'admin-scopes', label: '权限管理' },
            ],
          },
        ]
      : []),
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key.startsWith('admin-')) {
      const page = key.replace('admin-', '');
      navigate(`/admin/${page}`);
    } else {
      setActiveTab(key);
    }
  };

  const renderContent = () => {
    if (activeTab === 'info') {
      return (
        <Card title="个人信息">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="用户名">{user?.username}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{user?.email}</Descriptions.Item>
            <Descriptions.Item label="用户组">
              {user?.groups.map((group) => (
                <Tag key={group} color="blue">
                  {group}
                </Tag>
              ))}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      );
    }

    if (activeTab === 'settings') {
      return (
        <>
          <Card title="修改用户名" style={{ marginBottom: 24 }}>
            <Form form={userForm} onFinish={updateUsername} layout="vertical">
              <Form.Item
                name="username"
                label="新用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 1, max: 50, message: '用户名长度1-50个字符' },
                ]}
              >
                <Input placeholder="请输入新用户名" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Divider />

          <Card title="修改邮箱" style={{ marginBottom: 24 }}>
            <p style={{ color: '#999' }}>
              修改邮箱需要重新验证，修改后会重新登录
            </p>
          </Card>

          <Divider />

          <Card title="修改密码" style={{ marginBottom: 24 }}>
            <p style={{ color: '#999' }}>
              修改密码需要邮箱验证码，修改后会重新登录
            </p>
          </Card>
        </>
      );
    }

    return null;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={200}>
        <div style={{ padding: 16, textAlign: 'center' }}>
          <Title level={4}>用户中心</Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeTab]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', textAlign: 'right' }}>
          <span style={{ marginRight: 16 }}>欢迎, {user?.username}</span>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            登出
          </Button>
        </Header>
        <Content style={{ padding: 24 }}>{renderContent()}</Content>
      </Layout>
    </Layout>
  );
}
