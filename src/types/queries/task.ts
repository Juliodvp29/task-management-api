export interface TaskQuery extends PaginationQuery {
  list_id?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: number;
  due_date_from?: Date;
  due_date_to?: Date;
  search?: string;
}