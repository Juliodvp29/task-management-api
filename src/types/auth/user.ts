import type { BaseEntity } from "@base/entity.js";
import type { DashboardLayout, NotificationSettings } from "@system/notification.js";

export interface Role extends BaseEntity {
  name: string;
  display_name: string;
  description?: string;
  permissions: string[];
  is_active: boolean;
}

export interface User extends BaseEntity {
  email: string;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  role_id: number;
  is_active: boolean;
  is_email_verified: boolean;
  last_login?: Date;
  login_attempts: number;
  locked_until?: Date;

  role?: Role;
  settings?: UserSettings;
}


export interface UserSettings extends BaseEntity {
  user_id: number;
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  notifications: NotificationSettings;
  dashboard_layout: DashboardLayout;
}

export interface UserWithRole extends User {
  role: Role;
  permissions?: any
}

