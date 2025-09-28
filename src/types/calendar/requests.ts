export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  event_date: Date;
  event_type: EventType;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule;
  color?: string;
  is_global?: boolean;
}

export interface UpdateCalendarEventRequest {
  title?: string;
  description?: string;
  event_date?: Date;
  event_type?: EventType;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule;
  color?: string;
  is_global?: boolean;
  is_active?: boolean;
}