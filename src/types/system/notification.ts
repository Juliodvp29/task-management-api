import type { User } from "@auth/user.js";
import type { BaseEntity } from "@base/entity.js";
import type { NotificationType } from "@enums/notification.js";

export interface Notification extends BaseEntity {
  user_id: number;
  title: string;
  message: string;
  type: NotificationType;
  entity_type?: string;
  entity_id?: number;
  is_read: boolean;
  read_at?: Date;

  // Relación
  user?: User;
}

export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  task_assignments: boolean;
  task_deadlines: boolean;
  comments: boolean;
  system_updates: boolean;
}

export interface DashboardLayout {
  widgets: string[];
  layout: 'grid' | 'list';
  columns: number;
}