// src/types/auth/requests.ts (FIXED VERSION)
import type { Request } from 'express';
import type { DashboardLayout, NotificationSettings } from '../system/notification.js';
import type { UserSession } from './session.js';
import type { UserWithRole } from './user.js';

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
  device_info?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role_id?: number;
}

export interface AuthRequest extends Request {
  user?: UserWithRole;
  session?: UserSession;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  display_name?: string;
  description?: string;
  permissions?: string[];
  is_active?: boolean;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role_id: number;
  profile_picture?: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  role_id?: number;
  profile_picture?: string;
  is_active?: boolean;
}

export interface UpdateUserSettingsRequest {
  theme?: 'light' | 'dark';
  language?: string;
  timezone?: string;
  date_format?: string;
  time_format?: '12h' | '24h';
  notifications?: Partial<NotificationSettings>;
  dashboard_layout?: Partial<DashboardLayout>;
}