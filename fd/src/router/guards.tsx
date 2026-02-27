import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// 需要登录的路由守卫
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    if (isLoading) {
      checkAuth();
    }
  }, [isLoading, checkAuth]);

  // 正在加载认证状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 未认证时跳转到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// 管理员路由守卫
export function AdminRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const hasScope = useAuthStore((state) => state.hasScope);

  useEffect(() => {
    if (isLoading) {
      checkAuth();
    }
  }, [isLoading, checkAuth]);

  // 正在加载认证状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 检查是否有管理员权限
  if (!hasScope('*') && !hasScope('admin')) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
