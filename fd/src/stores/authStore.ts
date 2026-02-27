import { create } from 'zustand';
import { userApi } from '../api/user';
import type { UserResponse } from '../types';

interface AuthState {
  // 状态
  user: UserResponse | null;
  scopes: string[];
  isAuthenticated: boolean;
  isLoading: boolean;

  // 方法
  setUser: (user: UserResponse | null) => void;
  login: (user: UserResponse, scope: string[]) => void;
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
  isLoading: true,

  // 设置用户信息
  setUser: (user) => {
    set({ user });
  },

  // 登录
  login: (user, scope) => {
    set({
      user,
      scopes: scope,
      isAuthenticated: true,
      isLoading: false,
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
      isLoading: false,
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
    return scopes?.includes('*') || scopes?.includes(scope) || false;
  },

  // 检查认证状态（页面加载时调用）
  checkAuth: async () => {
    try {
      const verifyResponse = await userApi.verifyAccessToken();
      const { scope } = verifyResponse.data;
      const userResponse = await userApi.getMe();
      set({
        user: userResponse.data,
        scopes: scope,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      // 验证失败，清除状态
      set({
        user: null,
        scopes: [],
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
