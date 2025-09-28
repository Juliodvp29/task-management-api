export interface TaskUpdateMessage {
  task_id: number;
  action: 'created' | 'updated' | 'deleted' | 'moved' | 'completed';
  task: Task;
  list_id: number;
  user_id: number;
}