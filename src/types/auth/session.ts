export interface UserSession extends BaseEntity {
  user_id: number;
  session_token: string;
  refresh_token: string;
  device_info?: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  expires_at: Date;

  // Relación
  user?: User;
}