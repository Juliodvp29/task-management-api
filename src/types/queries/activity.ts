export interface ActivityLogQuery extends PaginationQuery {
  user_id?: number;
  action?: ActivityAction;
  entity_type?: string;
  date_from?: Date;
  date_to?: Date;
}