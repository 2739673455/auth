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
  Statistic,
} from 'antd';
import type { StatisticProps } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
  SettingOutlined,
  MailOutlined,
  LockOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { userApi } from '../../api/user';
import { useAuthStore } from '../../stores/authStore';
import type { UpdateEmailRequest, SendCodeRequest, UpdatePasswordRequest } from '../../types';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;
const { Countdown } = Statistic;

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, hasScope, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [userForm] = Form.useForm();

  // 修改邮箱相关
  const [emailForm] = Form.useForm();
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState<number | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // 修改密码相关
  const [passwordForm] = Form.useForm();
  const [sendingPasswordCode, setSendingPasswordCode] = useState(false);
  const [passwordCountdown, setPasswordCountdown] = useState<number | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

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
      await userApi.updateUsername(values);
      message.success('用户名修改成功');
      // 刷新用户信息
      const response = await userApi.getMe();
      setUser(response.data);
    } catch (error: any) {
      const msg = error.response?.data?.detail || '修改失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 发送修改邮箱验证码
  const sendEmailCode = async () => {
    const email = emailForm.getFieldValue('email');
    if (!email) {
      message.error('请先输入新邮箱');
      return;
    }

    setSendingEmailCode(true);
    try {
      const data: SendCodeRequest = { email, type: 'reset_email' };
      await userApi.sendEmailCode(data);
      message.success('验证码已发送到新邮箱');
      setEmailCountdown(Date.now() + 60000);
    } catch (error: any) {
      const msg = error.response?.data?.detail || '发送失败';
      message.error(msg);
    } finally {
      setSendingEmailCode(false);
    }
  };

  // 修改邮箱
  const updateEmail = async (values: UpdateEmailRequest) => {
    setEmailLoading(true);
    try {
      await userApi.updateEmail(values);
      message.success('邮箱修改成功，请重新登录');

      // 等待2秒后登出并跳转到登录页
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      const msg = error.response?.data?.detail || '修改失败';
      message.error(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  // 发送修改密码验证码
  const sendPasswordCode = async () => {
    if (!user?.email) {
      message.error('用户邮箱不存在');
      return;
    }

    setSendingPasswordCode(true);
    try {
      const data: SendCodeRequest = { email: user.email, type: 'reset_password' };
      await userApi.sendEmailCode(data);
      message.success('验证码已发送到您的邮箱');
      setPasswordCountdown(Date.now() + 60000);
    } catch (error: any) {
      const msg = error.response?.data?.detail || '发送失败';
      message.error(msg);
    } finally {
      setSendingPasswordCode(false);
    }
  };

  // 修改密码
  const updatePassword = async (values: any) => {
    if (!user?.email) {
      message.error('用户邮箱不存在');
      return;
    }

    setPasswordLoading(true);
    try {
      const data: UpdatePasswordRequest = {
        email: user.email,
        code: values.code,
        password: values.password,
      };
      await userApi.updatePassword(data);
      message.success('密码修改成功，请重新登录');

      // 等待2秒后登出并跳转到登录页
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      const msg = error.response?.data?.detail || '修改失败';
      message.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  // 倒计时渲染器
  const countdownRenderer: StatisticProps['valueRender'] = (value) => {
    if (typeof value !== 'number') return null;
    const seconds = Math.ceil((value - Date.now()) / 1000);
    return <span>{seconds}s</span>;
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
          },
        ]
      : []),
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'admin') {
      navigate('/admin');
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
            <p style={{ color: '#999', marginBottom: 16 }}>
              修改邮箱需要验证新邮箱，修改后会重新登录
            </p>
            <Form form={emailForm} onFinish={updateEmail} layout="vertical">
              <Form.Item
                name="email"
                label="新邮箱"
                rules={[
                  { required: true, message: '请输入新邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="请输入新邮箱"
                />
              </Form.Item>

              <Form.Item
                name="code"
                label="验证码"
                rules={[
                  { required: true, message: '请输入验证码' },
                  { len: 6, message: '验证码为6位数字' },
                ]}
              >
                <Input
                  prefix={<SafetyOutlined />}
                  placeholder="请输入验证码"
                  suffix={
                    emailCountdown ? (
                      <Countdown
                        value={emailCountdown}
                        format="ss"
                        valueRender={countdownRenderer}
                        onFinish={() => setEmailCountdown(null)}
                      />
                    ) : (
                      <Button
                        type="link"
                        size="small"
                        loading={sendingEmailCode}
                        onClick={sendEmailCode}
                      >
                        获取验证码
                      </Button>
                    )
                  }
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={emailLoading}>
                  修改邮箱
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Divider />

          <Card title="修改密码" style={{ marginBottom: 24 }}>
            <p style={{ color: '#999', marginBottom: 16 }}>
              修改密码需要邮箱验证码，验证码将发送到当前邮箱：{user?.email}
            </p>
            <Form form={passwordForm} onFinish={updatePassword} layout="vertical">
              <Form.Item
                name="code"
                label="验证码"
                rules={[
                  { required: true, message: '请输入验证码' },
                  { len: 6, message: '验证码为6位数字' },
                ]}
              >
                <Input
                  prefix={<SafetyOutlined />}
                  placeholder="请输入验证码"
                  suffix={
                    passwordCountdown ? (
                      <Countdown
                        value={passwordCountdown}
                        format="ss"
                        valueRender={countdownRenderer}
                        onFinish={() => setPasswordCountdown(null)}
                      />
                    ) : (
                      <Button
                        type="link"
                        size="small"
                        loading={sendingPasswordCode}
                        onClick={sendPasswordCode}
                      >
                        获取验证码
                      </Button>
                    )
                  }
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="新密码"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, max: 128, message: '密码长度6-128个字符' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入新密码"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请确认新密码"
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={passwordLoading}>
                  修改密码
                </Button>
              </Form.Item>
            </Form>
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
          style={{ height: '100%', borderRight: 0 }}
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