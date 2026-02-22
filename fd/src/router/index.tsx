import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from './guards';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';
import AdminUsers from '../pages/Admin/Users';
import AdminGroups from '../pages/Admin/Groups';
import AdminScopes from '../pages/Admin/Scopes';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/profile" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <AdminRoute>
        <AdminUsers />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/groups',
    element: (
      <AdminRoute>
        <AdminGroups />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/scopes',
    element: (
      <AdminRoute>
        <AdminScopes />
      </AdminRoute>
    ),
  },
]);
