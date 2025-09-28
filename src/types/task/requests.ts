import type { TaskPriority, TaskStatus } from "@enums/task.js";

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  list_id: number;
  assigned_to?: number;
  due_date?: Date;
  estimated_hours?: number;
  tags?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  position?: number;
  list_id?: number;
  assigned_to?: number;
  due_date?: Date;
  estimated_hours?: number;
  actual_hours?: number;
  tags?: string[];
}

export interface MoveTaskRequest {
  source_list_id: number;
  target_list_id: number;
  position: number;
}


export interface CreateTaskListRequest {
  name: string;
  description?: string;
  color?: string;
  position?: number;
}

export interface UpdateTaskListRequest {
  name?: string;
  description?: string;
  color?: string;
  position?: number;
  is_active?: boolean;
}