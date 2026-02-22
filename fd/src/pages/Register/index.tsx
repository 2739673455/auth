import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography, Statistic } from 'antd';
import type { StatisticProps } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';
import type { RegisterRequest, SendCodeRequest } from '../../types';

const { Title } = Typography;
const { Countdown } = Statistic;

export default function Register() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const onFinish = async (values: RegisterRequest) => {
    setLoading(true);
    try {
      const response = await authApi.register(values);
      const { access_token } = response.data;

      // 验证 token 获取用户信息
      const verifyResponse = await authApi.verifyAccessToken();
      const { scopes } = verifyResponse.data;

      // 获取用户信息
      const userResponse = await authApi.getMe();

      // 注册成功，自动登录
      login(access_token, userResponse.data, scopes);
      message.success('注册成功');
      navigate('/profile');
    } catch (error: any) {
      const msg = error.response?.data?.detail || '注册失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    const email = form.getFieldValue('email');
    if (!email) {
      message.error('请先输入邮箱');
      return;
    }

    setSendingCode(true);
    try {
      const data: SendCodeRequest = { email, type: 'register' };
      await authApi.sendEmailCode(data);
      message.success('验证码已发送');
      setCountdown(Date.now() + 60000); // 60秒倒计时
    } catch (error: any) {
      const msg = error.response?.data?.detail || '发送失败';
      message.error(msg);
    } finally {
      setSendingCode(false);
    }
  };

  const countdownRenderer: StatisticProps['valueRender'] = (value) => {
    if (typeof value !== 'number') return null;
    const seconds = Math.ceil((value - Date.now()) / 1000);
    return <span>{seconds}s</span>;
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f2f5'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3}>用户注册</Title>
        </div>
        
        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="邮箱"
            />
          </Form.Item>

          <Form.Item
            name="code"
            rules={[
              { required: true, message: '请输入验证码' },
              { len: 6, message: '验证码为6位数字' },
            ]}
          >
            <Input
              prefix={<SafetyOutlined />}
              placeholder="验证码"
              suffix={
                countdown ? (
                  <Countdown
                    value={countdown}
                    format="ss"
                    valueRender={countdownRenderer}
                    onFinish={() => setCountdown(null)}
                  />
                ) : (
                  <Button
                    type="link"
                    size="small"
                    loading={sendingCode}
                    onClick={sendCode}
                  >
                    获取验证码
                  </Button>
                )
              }
            />
          </Form.Item>

          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 1, max: 50, message: '用户名长度1-50个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, max: 128, message: '密码长度6-128个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
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
              placeholder="确认密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              注册
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            已有账号？ <Link to="/login">立即登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
