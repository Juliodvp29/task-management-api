import { User } from "../auth/user.js";
import { BaseEntity } from "../base/entity.js";
import { TaskPriority, TaskStatus } from "../enums/task.js";
import { Attachment } from "../system/attachment.js";
import { TaskComment } from "./comment.js";
import { TaskList } from "./list.js";

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  position: number;
  list_id: number;
  assigned_to?: number;
  created_by: number;
  due_date?: Date;
  completed_at?: Date;
  estimated_hours?: number;
  actual_hours?: number;
  tags?: string[];

  // Relaciones
  list?: TaskList;
  assignee?: User;
  creator?: User;
  comments?: TaskComment[];
  comments_count?: number;
  attachments?: Attachment[];
}

export interface TaskWithDetails extends Task {
  list: TaskList;
  creator: User;
  assignee?: User;
  comments: TaskComment[];
  attachments: Attachment[];
}
