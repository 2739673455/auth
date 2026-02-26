import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from './guards';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgetPassword from '../pages/ForgetPassword';
import Profile from '../pages/Profile';
import AdminPanel from '../pages/Admin';

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
    path: '/forget_password',
    element: <ForgetPassword />,
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
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminPanel />
      </AdminRoute>
    ),
  },
]);
