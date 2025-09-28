export interface UserStats {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  total_lists: number;
  active_tasks: number;
  completed_tasks: number;
  urgent_tasks: number;
  overdue_tasks: number;
}