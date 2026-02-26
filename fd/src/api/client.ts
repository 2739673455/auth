import axios, { type AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || undefined,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 允许携带 Cookie
});

// 响应拦截器 - 处理 401 错误
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // 如果是 401 错误，登出并跳转到登录页
    if (error.response?.status === 401) {
      const authStore = useAuthStore.getState();
      authStore.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
