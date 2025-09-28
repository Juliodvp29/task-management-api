import { PaginationQuery } from "../base/api.js";
import { EventType } from "../enums/event.js";

export interface CalendarEventQuery extends PaginationQuery {
  date_from?: Date;
  date_to?: Date;
  event_type?: EventType;
  is_global?: boolean;
}