import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { userApi } from '../../api/user';
import { useAuthStore } from '../../stores/authStore';
import type { LoginRequest } from '../../types';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await userApi.login(formData);
      const verifyResponse = await userApi.verifyAccessToken();
      const { scope } = verifyResponse.data;
      const userResponse = await userApi.getMe();
      login(userResponse.data, scope);
      toast.success('登录成功');
      navigate('/profile');
    } catch (error: any) {
      const msg = error.response?.data?.detail || '登录失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e8e4df] p-8">
      {/* 渐变边框容器 */}
      <div className="relative w-full max-w-md rounded-3xl p-[2px]">
        {/* 渐变背景层 */}
        <div 
          className="absolute inset-0 rounded-3xl"
          style={{
            background: 'linear-gradient(180deg, #b8b4ad 0%, #c9c5be 20%, #d8d4cd 50%, #e0dcd5 80%, #e5e1da 100%)',
          }}
        />
        {/* 内层容器 */}
        <div className="relative rounded-3xl bg-[#e8e4df] p-[2px] shadow-[inset_0_24px_48px_rgba(0,0,0,0.12),inset_0_10px_20px_rgba(0,0,0,0.08)]">
          <Card className="rounded-[22px] border-0 bg-[#e8e4df] shadow-none">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl text-stone-700">用户登录</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-stone-600">邮箱</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="请输入邮箱"
                      className="pl-10 bg-[#f0ece6] border-stone-300/60 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] rounded-xl"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-stone-600">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="请输入密码"
                      className="pl-10 bg-[#f0ece6] border-stone-300/60 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] rounded-xl"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-stone-600 hover:bg-stone-700 mt-2 rounded-xl" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    '登录'
                  )}
                </Button>
              </form>

              <div className="mt-6 flex justify-between text-sm">
                <span className="text-stone-500">
                  还没有账号？ <Link to="/register" className="text-blue-600 underline hover:text-blue-700">立即注册</Link>
                </span>
                <Link to="/forget_password" className="text-blue-600 underline hover:text-blue-700">忘记密码？</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
