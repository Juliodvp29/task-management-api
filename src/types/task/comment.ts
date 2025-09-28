import type { User } from "@auth/user.js";
import type { BaseEntity } from "@base/entity.js";
import type { Task } from "@task/task.js";

export interface TaskComment extends BaseEntity {
  task_id: number;
  user_id: number;
  content: string;
  is_edited: boolean;

  // Relaciones
  task?: Task;
  user?: User;
}

export interface CreateCommentRequest {
  content: string;
}

export interface UpdateCommentRequest {
  content: string;
}