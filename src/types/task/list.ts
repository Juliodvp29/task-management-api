export interface TaskList extends BaseEntity {
  name: string;
  description?: string;
  color?: string;
  position: number;
  user_id: number;
  is_active: boolean;

  // Relaciones
  user?: User;
  tasks?: Task[];
  tasks_count?: number;
}

export interface ListWithTasks extends TaskList {
  user: User;
  tasks: Task[];
}