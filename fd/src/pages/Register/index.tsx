import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Mail, Lock, User, Shield, Loader2 } from 'lucide-react';
import { userApi } from '../../api/user';
import { useAuthStore } from '../../stores/authStore';
import type { RegisterRequest, SendCodeRequest } from '../../types';

export default function Register() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    code: '',
    username: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  const sendCode = async () => {
    if (!formData.email) {
      toast.error('请先输入邮箱');
      return;
    }

    setSendingCode(true);
    try {
      const data: SendCodeRequest = { email: formData.email, type: 'register' };
      await userApi.sendEmailCode(data);
      toast.success('验证码已发送');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      const msg = error.response?.data?.detail || '发送失败';
      toast.error(msg);
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    
    if (formData.code.length !== 6) {
      toast.error('验证码为6位数字');
      return;
    }

    setLoading(true);
    try {
      // 注册（后端会通过 Cookie 设置 token）
      await userApi.register(formData);

      // 验证 token 获取权限
      const verifyResponse = await userApi.verifyAccessToken();
      const { scope } = verifyResponse.data;

      // 获取用户信息
      const userResponse = await userApi.getMe();

      // 注册成功，自动登录
      login(userResponse.data, scope);
      toast.success('注册成功');
      navigate('/profile');
    } catch (error: any) {
      const msg = error.response?.data?.detail || '注册失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">用户注册</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="请输入邮箱"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">验证码</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="code"
                    placeholder="请输入验证码"
                    className="pl-10"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    maxLength={6}
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendCode}
                  disabled={sendingCode || countdown > 0}
                >
                  {countdown > 0 ? `${countdown}s` : sendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : '获取验证码'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="请输入用户名"
                  className="pl-10"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  minLength={1}
                  maxLength={50}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  className="pl-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  minLength={6}
                  maxLength={128}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="请确认密码"
                  className="pl-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            已有账号？ <Link to="/login" className="text-primary hover:underline">立即登录</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}