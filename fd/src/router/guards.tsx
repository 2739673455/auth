import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// 需要登录的路由守卫
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!isAuthenticated && !accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// 管理员路由守卫
export function AdminRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasScope = useAuthStore((state) => state.hasScope);

  if (!isAuthenticated && !accessToken) {
    return <Navigate to="/login" replace />;
  }

  // 检查是否有管理员权限
  if (!hasScope('*') && !hasScope('admin')) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
