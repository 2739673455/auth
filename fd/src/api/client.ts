import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
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

// 是否正在刷新 token
let isRefreshing = false;
// 等待刷新 token 的请求队列
let refreshSubscribers: ((token: string) => void)[] = [];

// 订阅 token 刷新
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

// 通知所有订阅者
function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

// 请求拦截器 - 添加 access_token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore.getState();
    const token = authStore.accessToken;
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 处理 token 过期
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // 如果不是 401 错误，或者已经在重试，直接拒绝
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    
    // 如果是刷新 token 的请求本身失败，说明需要重新登录
    if (originalRequest.url === '/api/refresh') {
      const authStore = useAuthStore.getState();
      authStore.logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    originalRequest._retry = true;
    
    // 如果正在刷新 token，将请求加入队列等待
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken: string) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          resolve(apiClient(originalRequest));
        });
      });
    }
    
    isRefreshing = true;
    
    try {
      // 调用刷新 token 接口
      const response = await apiClient.post<{
        access_token: string;
        refresh_token: string;
        token_type: string;
      }>('/refresh');
      
      const { access_token } = response.data;
      
      // 更新 store 中的 token
      const authStore = useAuthStore.getState();
      authStore.setAccessToken(access_token);
      
      // 通知等待的请求
      onTokenRefreshed(access_token);
      
      // 重试原请求
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      // 刷新失败，登出
      const authStore = useAuthStore.getState();
      authStore.logout();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
