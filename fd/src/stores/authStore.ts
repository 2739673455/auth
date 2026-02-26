import { create } from 'zustand';
import type { UserResponse } from '../types';
import { userApi } from '../api/user';

interface AuthState {
  // 状态
  user: UserResponse | null;
  scopes: string[];
  isAuthenticated: boolean;

  // 方法
  setUser: (user: UserResponse | null) => void;
  login: (user: UserResponse, scopes: string[]) => void;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  hasScope: (scope: string) => boolean;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  // 初始状态
  user: null,
  scopes: [],
  isAuthenticated: false,

  // 设置用户信息
  setUser: (user) => {
    set({ user });
  },

  // 登录
  login: (user, scopes) => {
    set({
      user,
      scopes,
      isAuthenticated: true,
    });
  },

  // 登出
  logout: async () => {
    try {
      await userApi.logout();
    } catch {
      // 忽略错误
    }
    set({
      user: null,
      scopes: [],
      isAuthenticated: false,
    });
  },

  // 获取用户信息
  fetchUser: async () => {
    try {
      const response = await userApi.getMe();
      set({ user: response.data });
    } catch {
      // 获取失败，登出
      get().logout();
    }
  },

  // 检查是否有权限
  hasScope: (scope) => {
    const { scopes } = get();
    // * 表示全部权限
    return scopes.includes('*') || scopes.includes(scope);
  },

  // 检查认证状态（页面加载时调用）
  checkAuth: async () => {
    try {
      const verifyResponse = await userApi.verifyAccessToken();
      const { scopes } = verifyResponse.data;
      const userResponse = await userApi.getMe();
      set({
        user: userResponse.data,
        scopes,
        isAuthenticated: true,
      });
    } catch {
      // 验证失败，清除状态
      set({
        user: null,
        scopes: [],
        isAuthenticated: false,
      });
    }
  },
}));
