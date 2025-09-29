import type { User } from "../auth/user.js";
import type { BaseEntity } from "../base/entity.js";
import type { EventType } from "../enums/event.js";

export interface CalendarEvent extends BaseEntity {
  title: string;
  description?: string;
  event_date: Date;
  event_type: EventType;
  is_recurring: boolean;
  recurrence_rule?: RecurrenceRule;
  color?: string;
  is_global: boolean;
  created_by: number;
  is_active: boolean;

  creator?: User;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  end_date?: Date;
  count?: number;
  by_day?: number[];
  by_month?: number[];
}