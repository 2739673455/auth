// 认证相关类型
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  code: string;
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  username: string;
  email: string;
  groups: string[];
}

export interface SendCodeRequest {
  email: string;
  type: 'register' | 'reset_email' | 'reset_password';
}

export interface UpdateUsernameRequest {
  username: string;
}

export interface UpdateEmailRequest {
  email: string;
  code: string;
}

export interface UpdatePasswordRequest {
  password: string;
  code: string;
}

export interface AccessTokenPayload {
  sub: number;
  name: string;
  scopes: string[];
  exp: number;
  iat: number;
  jti: string;
  type: string;
}

// 管理员相关类型
export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
}

export interface UpdateUserRequest {
  user_id: number;
  email?: string;
  username?: string;
  password?: string;
  yn?: number;
}

export interface RemoveUserRequest {
  user_id: number;
}

export interface UserInfo {
  id: number;
  email: string;
  username: string;
  yn: number;
  create_at: string;
}

export interface UserListResponse {
  total: number;
  items: UserInfo[];
}

export interface UserDetailResponse extends UserInfo {
  groups: GroupInfo[];
  scopes: ScopeInfo[];
}

export interface GroupInfo {
  id: number;
  name: string;
  description: string;
  yn: number;
}

export interface ScopeInfo {
  id: number;
  name: string;
  description: string;
  yn: number;
}

export interface CreateGroupRequest {
  name: string;
  description: string;
  scope_ids: number[];
}

export interface UpdateGroupRequest {
  group_id: number;
  name?: string;
  description?: string;
  scope_ids?: number[];
  yn?: number;
}

export interface RemoveGroupRequest {
  group_id: number;
}

export interface GroupListResponse {
  total: number;
  items: GroupInfo[];
}

export interface CreateScopeRequest {
  name: string;
  description: string;
}

export interface UpdateScopeRequest {
  scope_id: number;
  name?: string;
  description?: string;
  yn?: number;
}

export interface RemoveScopeRequest {
  scope_id: number;
}

export interface ScopeListResponse {
  total: number;
  items: ScopeInfo[];
}
