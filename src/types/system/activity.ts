export interface ActivityLog extends BaseEntity {
  user_id?: number;
  action: ActivityAction;
  entity_type: string;
  entity_id?: number;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  description?: string;
  ip_address?: string;
  user_agent?: string;

  // Relación
  user?: User;
}
