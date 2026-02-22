import apiClient from './client';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  RemoveUserRequest,
  UserListResponse,
  UserDetailResponse,
  CreateGroupRequest,
  UpdateGroupRequest,
  RemoveGroupRequest,
  GroupListResponse,
  GroupInfo,
  CreateScopeRequest,
  UpdateScopeRequest,
  RemoveScopeRequest,
  ScopeListResponse,
  ScopeInfo,
} from '../types';

// 用户管理
export const adminUserApi = {
  // 创建用户
  createUser: (data: CreateUserRequest) =>
    apiClient.post<UserDetailResponse>('/api/admin/create_user', data, {
      validateStatus: (status) => status === 201 || status < 400,
    }),

  // 更新用户
  updateUser: (data: UpdateUserRequest) =>
    apiClient.post<void>('/api/admin/update_user', data),

  // 删除用户
  removeUser: (data: RemoveUserRequest) =>
    apiClient.post<void>('/api/admin/remove_user', data),

  // 查询用户列表
  listUsers: (params: { offset?: number; limit?: number; keyword?: string }) =>
    apiClient.get<UserListResponse>('/api/admin/list_users', { params }),

  // 查询用户详情
  getUser: (userId: number) =>
    apiClient.get<UserDetailResponse>(`/api/admin/user/${userId}`),
};

// 组管理
export const adminGroupApi = {
  // 创建组
  createGroup: (data: CreateGroupRequest) =>
    apiClient.post<GroupInfo>('/api/admin/create_group', data, {
      validateStatus: (status) => status === 201 || status < 400,
    }),

  // 更新组
  updateGroup: (data: UpdateGroupRequest) =>
    apiClient.post<void>('/api/admin/update_group', data),

  // 删除组
  removeGroup: (data: RemoveGroupRequest) =>
    apiClient.post<void>('/api/admin/remove_group', data),

  // 查询组列表
  listGroups: (params: { offset?: number; limit?: number; keyword?: string }) =>
    apiClient.get<GroupListResponse>('/api/admin/list_groups', { params }),

  // 查询组详情
  getGroup: (groupId: number) =>
    apiClient.get<GroupInfo>(`/api/admin/group/${groupId}`),
};

// 权限管理
export const adminScopeApi = {
  // 创建权限
  createScope: (data: CreateScopeRequest) =>
    apiClient.post<ScopeInfo>('/api/admin/create_scope', data, {
      validateStatus: (status) => status === 201 || status < 400,
    }),

  // 更新权限
  updateScope: (data: UpdateScopeRequest) =>
    apiClient.post<void>('/api/admin/update_scope', data),

  // 删除权限
  removeScope: (data: RemoveScopeRequest) =>
    apiClient.post<void>('/api/admin/remove_scope', data),

  // 查询权限列表
  listScopes: (params: { offset?: number; limit?: number; keyword?: string }) =>
    apiClient.get<ScopeListResponse>('/api/admin/list_scopes', { params }),

  // 查询权限详情
  getScope: (scopeId: number) =>
    apiClient.get<ScopeInfo>(`/api/admin/scope/${scopeId}`),
};
