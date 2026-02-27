import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Settings, LogOut, Mail, Lock, Shield, Loader2 } from 'lucide-react';
import { userApi } from '../../api/user';
import { useAuthStore } from '../../stores/authStore';
import type { UpdateEmailRequest, SendCodeRequest, UpdatePasswordRequest } from '../../types';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, hasScope, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('info');

  // 修改用户名
  const [username, setUsername] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);

  // 修改邮箱
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [emailLoading, setEmailLoading] = useState(false);

  // 修改密码
  const [passwordCode, setPasswordCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sendingPasswordCode, setSendingPasswordCode] = useState(false);
  const [passwordCountdown, setPasswordCountdown] = useState(0);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    toast.success('已登出');
    navigate('/login');
  };

  const updateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('请输入用户名');
      return;
    }
    setLoading(true);
    try {
      await userApi.updateUsername({ username });
      toast.success('用户名修改成功');
      const response = await userApi.getMe();
      setUser(response.data);
    } catch (error: any) {
      const msg = error.response?.data?.detail || '修改失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const sendEmailCode = async () => {
    if (!newEmail) {
      toast.error('请先输入新邮箱');
      return;
    }
    setSendingEmailCode(true);
    try {
      const data: SendCodeRequest = { email: newEmail, type: 'reset_email' };
      await userApi.sendEmailCode(data);
      toast.success('验证码已发送到新邮箱');
      setEmailCountdown(60);
      const timer = setInterval(() => {
        setEmailCountdown((prev) => {
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
      setSendingEmailCode(false);
    }
  };

  const updateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailCode || emailCode.length !== 6) {
      toast.error('请输入6位验证码');
      return;
    }
    setEmailLoading(true);
    try {
      const data: UpdateEmailRequest = { email: newEmail, code: emailCode };
      await userApi.updateEmail(data);
      toast.success('邮箱修改成功，请重新登录');
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      const msg = error.response?.data?.detail || '修改失败';
      toast.error(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  const sendPasswordCode = async () => {
    if (!user?.email) {
      toast.error('用户邮箱不存在');
      return;
    }
    setSendingPasswordCode(true);
    try {
      const data: SendCodeRequest = { email: user.email, type: 'reset_password' };
      await userApi.sendEmailCode(data);
      toast.success('验证码已发送到您的邮箱');
      setPasswordCountdown(60);
      const timer = setInterval(() => {
        setPasswordCountdown((prev) => {
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
      setSendingPasswordCode(false);
    }
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) {
      toast.error('用户邮箱不存在');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    setPasswordLoading(true);
    try {
      const data: UpdatePasswordRequest = {
        email: user.email,
        code: passwordCode,
        password: newPassword,
      };
      await userApi.updatePassword(data);
      toast.success('密码修改成功，请重新登录');
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      const msg = error.response?.data?.detail || '修改失败';
      toast.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const menuItems = [
    { key: 'info', icon: User, label: '个人信息' },
    { key: 'settings', icon: Settings, label: '账号设置' },
    ...(hasScope('*') || hasScope('admin') ? [{ key: 'admin', icon: Settings, label: '管理后台' }] : []),
  ];

  const renderContent = () => {
    if (activeTab === 'info') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>个人信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[100px_1fr] gap-4 items-center">
              <span className="text-muted-foreground">用户名</span>
              <span>{user?.username}</span>
            </div>
            <Separator />
            <div className="grid grid-cols-[100px_1fr] gap-4 items-center">
              <span className="text-muted-foreground">邮箱</span>
              <span>{user?.email}</span>
            </div>
            <Separator />
            <div className="grid grid-cols-[100px_1fr] gap-4 items-start">
              <span className="text-muted-foreground">用户组</span>
              <div className="flex flex-wrap gap-2">
                {user?.groups.map((group) => (
                  <Badge key={group} variant="secondary">{group}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (activeTab === 'settings') {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>修改用户名</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={updateUsername} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">新用户名</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    minLength={1}
                    maxLength={50}
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  保存
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>修改邮箱</CardTitle>
              <CardDescription>修改邮箱需要验证新邮箱，修改后会重新登录</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={updateEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newEmail">新邮箱</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newEmail"
                      type="email"
                      className="pl-10"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailCode">验证码</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="emailCode"
                        className="pl-10"
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value)}
                        maxLength={6}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={sendEmailCode}
                      disabled={sendingEmailCode || emailCountdown > 0}
                    >
                      {emailCountdown > 0 ? `${emailCountdown}s` : sendingEmailCode ? <Loader2 className="h-4 w-4 animate-spin" /> : '获取验证码'}
                    </Button>
                  </div>
                </div>
                <Button type="submit" disabled={emailLoading}>
                  {emailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  修改邮箱
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>修改密码</CardTitle>
              <CardDescription>验证码将发送到当前邮箱：{user?.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={updatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="passwordCode">验证码</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="passwordCode"
                        className="pl-10"
                        value={passwordCode}
                        onChange={(e) => setPasswordCode(e.target.value)}
                        maxLength={6}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={sendPasswordCode}
                      disabled={sendingPasswordCode || passwordCountdown > 0}
                    >
                      {passwordCountdown > 0 ? `${passwordCountdown}s` : sendingPasswordCode ? <Loader2 className="h-4 w-4 animate-spin" /> : '获取验证码'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">新密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      className="pl-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                      maxLength={128}
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
                      className="pl-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  修改密码
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-muted/50">
        <div className="p-4 text-center font-semibold text-lg">用户中心</div>
        <nav className="space-y-1 p-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => item.key === 'admin' ? navigate('/admin') : setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeTab === item.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b bg-background flex items-center justify-between px-6">
          <span>欢迎, {user?.username}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            登出
          </Button>
        </header>
        <main className="flex-1 p-6">{renderContent()}</main>
      </div>
    </div>
  );
}
