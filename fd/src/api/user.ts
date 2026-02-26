import apiClient from './client';
import type {
  LoginRequest,
  RegisterRequest,
  UserResponse,
  SendCodeRequest,
  UpdateUsernameRequest,
  UpdateEmailRequest,
  UpdatePasswordRequest,
  AccessTokenPayload,
} from '../types';

export const userApi = {
  // 发送邮箱验证码
  sendEmailCode: (data: SendCodeRequest) =>
    apiClient.post<void>('/api/send_email_code', data),

  // 注册
  register: (data: RegisterRequest) =>
    apiClient.post<void>('/api/register', data),

  // 登录
  login: (data: LoginRequest) =>
    apiClient.post<void>('/api/login', data),

  // 获取当前用户信息
  getMe: () => apiClient.get<UserResponse>('/api/me'),

  // 修改用户名
  updateUsername: (data: UpdateUsernameRequest) =>
    apiClient.post<void>('/api/update_username', data),

  // 修改邮箱
  updateEmail: (data: UpdateEmailRequest) =>
    apiClient.post<void>('/api/update_email', data),

  // 修改密码（通过邮箱验证码重置）
  updatePassword: (data: UpdatePasswordRequest) =>
    apiClient.post<void>('/api/update_password', data),

  // 登出
  logout: () => apiClient.post<void>('/api/logout'),

  // 验证 access token
  verifyAccessToken: () =>
    apiClient.get<AccessTokenPayload>('/api/verify_access_token'),
};
