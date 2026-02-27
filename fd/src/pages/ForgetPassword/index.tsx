import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Shield, Loader2 } from 'lucide-react';
import { userApi } from '../../api/user';
import { useAuthStore } from '../../stores/authStore';
import type { SendCodeRequest } from '../../types';

export default function ForgetPassword() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    code: '',
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
      const data: SendCodeRequest = { email: formData.email, type: 'reset_password' };
      await userApi.sendEmailCode(data);
      toast.success('验证码已发送到您的邮箱');
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

    setLoading(true);
    try {
      await userApi.updatePassword({
        email: formData.email,
        code: formData.code,
        password: formData.password,
      });
      toast.success('密码重置成功');

      // 自动登录
      const verifyResponse = await userApi.verifyAccessToken();
      const { scope } = verifyResponse.data;
      const userResponse = await userApi.getMe();
      login(userResponse.data, scope);
      
      navigate('/profile');
    } catch (error: any) {
      const msg = error.response?.data?.detail || '重置密码失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">忘记密码</CardTitle>
          <CardDescription>输入您的邮箱和验证码，重置密码</CardDescription>
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
              <Label htmlFor="password">新密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入新密码"
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
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="请确认新密码"
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
                  重置中...
                </>
              ) : (
                '重置密码'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            想起密码了？ <Link to="/login" className="text-primary hover:underline">立即登录</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}