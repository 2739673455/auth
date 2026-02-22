import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserResponse } from '../types';
import { authApi } from '../api/auth';

interface AuthState {
  // 状态
  accessToken: string | null;
  user: UserResponse | null;
  scopes: string[];
  isAuthenticated: boolean;

  // 方法
  setAccessToken: (token: string | null) => void;
  setUser: (user: UserResponse | null) => void;
  setScopes: (scopes: string[]) => void;
  login: (accessToken: string, user: UserResponse, scopes: string[]) => void;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  hasScope: (scope: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      accessToken: null,
      user: null,
      scopes: [],
      isAuthenticated: false,

      // 设置 token
      setAccessToken: (token) => {
        set({ accessToken: token });
      },

      // 设置用户信息
      setUser: (user) => {
        set({ user });
      },

      // 设置权限
      setScopes: (scopes) => {
        set({ scopes });
      },

      // 登录
      login: (accessToken, user, scopes) => {
        set({
          accessToken,
          user,
          scopes,
          isAuthenticated: true,
        });
      },

      // 登出
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // 忽略错误
        }
        set({
          accessToken: null,
          user: null,
          scopes: [],
          isAuthenticated: false,
        });
      },

      // 获取用户信息
      fetchUser: async () => {
        try {
          const response = await authApi.getMe();
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
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ accessToken: state.accessToken }),
    }
  )
);
