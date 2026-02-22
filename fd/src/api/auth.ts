import apiClient from './client';
import type {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  UserResponse,
  SendCodeRequest,
  UpdateUsernameRequest,
  UpdateEmailRequest,
  UpdatePasswordRequest,
  AccessTokenPayload,
} from '../types';

export const authApi = {
  // 发送邮箱验证码
  sendEmailCode: (data: SendCodeRequest) =>
    apiClient.post<void>('/api/send_email_code', data),

  // 注册
  register: (data: RegisterRequest) =>
    apiClient.post<LoginResponse>('/api/register', data),

  // 登录
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/api/login', data),

  // 获取当前用户信息
  getMe: () => apiClient.get<UserResponse>('/api/me'),

  // 修改用户名
  updateUsername: (data: UpdateUsernameRequest) =>
    apiClient.post<void>('/api/me/username', data, {
      validateStatus: (status) => status === 202 || status < 400,
    }),

  // 修改邮箱
  updateEmail: (data: UpdateEmailRequest) =>
    apiClient.post<LoginResponse>('/api/me/email', data, {
      validateStatus: (status) => status === 202 || status < 400,
    }),

  // 修改密码
  updatePassword: (data: UpdatePasswordRequest) =>
    apiClient.post<LoginResponse>('/api/me/password', data, {
      validateStatus: (status) => status === 202 || status < 400,
    }),

  // 登出
  logout: () => apiClient.post<void>('/api/logout'),

  // 刷新 token
  refresh: () => apiClient.post<LoginResponse>('/api/refresh'),

  // 验证 access token
  verifyAccessToken: () =>
    apiClient.get<AccessTokenPayload>('/api/verify_access_token'),
};
