import { insert, query, queryOne } from '../config/database.js';
import type { PaginationQuery } from '../types/base/api.js';
import { AppError } from '../types/base/error.js';
import type { CalendarEvent } from '../types/calendar/event.js';
import type {
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest
} from '../types/calendar/requests.js';
import { ERROR_CODES } from '../types/constants/errors.js';
import { DEFAULT_PAGINATION } from '../types/constants/pagination.js';
import { EventType } from '../types/enums/event.js';


const parseCalendarEventRow = (row: any): CalendarEvent => {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    event_date: row.event_date,
    event_type: row.event_type,
    is_recurring: row.is_recurring,
    recurrence_rule: row.recurrence_rule ?
      (typeof row.recurrence_rule === 'string' ? JSON.parse(row.recurrence_rule) : row.recurrence_rule)
      : null,
    color: row.color,
    is_global: row.is_global,
    created_by: row.created_by,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
};

const hasPermissionToViewEvent = async (eventId: number, userId?: number): Promise<boolean> => {
  if (!userId) return false;

  const sql = `
    SELECT id 
    FROM calendar_events 
    WHERE id = ? AND (is_global = 1 OR created_by = ?)
  `;

  const event = await queryOne(sql, [eventId, userId]);
  return !!event;
};

const hasPermissionToEditEvent = async (eventId: number, userId?: number): Promise<boolean> => {
  if (!userId) return false;

  const sql = `
    SELECT id 
    FROM calendar_events 
    WHERE id = ? AND created_by = ?
  `;

  const event = await queryOne(sql, [eventId, userId]);
  return !!event;
};

export const getAllCalendarEvents = async (
  filters: PaginationQuery & {
    event_type?: EventType;
    is_global?: boolean;
    date_from?: Date;
    date_to?: Date;
    search?: string;
    user_id?: number;
  }
): Promise<{ events: CalendarEvent[]; total: number; page: number; limit: number; pages: number }> => {
  const page = filters.page || DEFAULT_PAGINATION.PAGE;
  const limit = Math.min(filters.limit || DEFAULT_PAGINATION.LIMIT, DEFAULT_PAGINATION.MAX_LIMIT);
  const offset = (page - 1) * limit;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (filters.user_id) {
    whereClauses.push('(is_global = 1 OR created_by = ?)');
    params.push(filters.user_id);
  }

  whereClauses.push('is_active = 1');

  if (filters.event_type) {
    whereClauses.push('event_type = ?');
    params.push(filters.event_type);
  }

  if (filters.is_global !== undefined) {
    whereClauses.push('is_global = ?');
    params.push(filters.is_global ? 1 : 0);
  }

  if (filters.date_from) {
    whereClauses.push('event_date >= ?');
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    whereClauses.push('event_date <= ?');
    params.push(filters.date_to);
  }

  if (filters.search) {
    whereClauses.push('(title LIKE ? OR description LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) as total
    FROM calendar_events
    ${whereClause}
  `;

  const countResult = await query<{ total: number }>(countSql, params);
  const total = countResult[0]?.total ?? 0;

  const sortBy = filters.sort_by || 'event_date';
  const sortOrder = filters.sort_order || 'ASC';

  const allowedSortFields = ['id', 'title', 'event_date', 'event_type', 'created_at'];
  const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'event_date';
  const validSortOrder = sortOrder === 'DESC' ? 'DESC' : 'ASC';

  const eventsSql = `
    SELECT * 
    FROM calendar_events
    ${whereClause}
    ORDER BY ${validSortBy} ${validSortOrder}
    LIMIT ? OFFSET ?
  `;

  const eventsParams = [...params, limit, offset];
  const eventsRows = await query<any>(eventsSql, eventsParams);
  const events = eventsRows.map(parseCalendarEventRow);

  return {
    events,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };
};

export const getCalendarEventById = async (id: number, userId?: number): Promise<CalendarEvent> => {
  const hasPermission = await hasPermissionToViewEvent(id, userId);

  if (!hasPermission) {
    throw new AppError('No tienes permisos para ver este evento', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  const sql = 'SELECT * FROM calendar_events WHERE id = ?';
  const event = await queryOne<any>(sql, [id]);

  if (!event) {
    throw new AppError('Evento no encontrado', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  return parseCalendarEventRow(event);
};

export const getEventsByDateRange = async (
  startDate: Date,
  endDate: Date,
  userId?: number
): Promise<CalendarEvent[]> => {
  const sql = `
    SELECT * 
    FROM calendar_events
    WHERE event_date BETWEEN ? AND ?
      AND is_active = 1
      AND (is_global = 1 OR created_by = ?)
    ORDER BY event_date ASC
  `;

  const events = await query<any>(sql, [startDate, endDate, userId]);
  return events.map(parseCalendarEventRow);
};

export const getUpcomingEvents = async (
  days: number = 30,
  userId?: number
): Promise<CalendarEvent[]> => {
  const sql = `
    SELECT * 
    FROM calendar_events
    WHERE event_date >= CURDATE()
      AND event_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      AND is_active = 1
      AND (is_global = 1 OR created_by = ?)
    ORDER BY event_date ASC
  `;

  const events = await query<any>(sql, [days, userId]);
  return events.map(parseCalendarEventRow);
};

export const getHolidays = async (year: number): Promise<CalendarEvent[]> => {
  const sql = `
    SELECT * 
    FROM calendar_events
    WHERE event_type = 'holiday'
      AND YEAR(event_date) = ?
      AND is_active = 1
      AND is_global = 1
    ORDER BY event_date ASC
  `;

  const events = await query<any>(sql, [year]);
  return events.map(parseCalendarEventRow);
};

export const createCalendarEvent = async (
  data: CreateCalendarEventRequest,
  createdBy: number
): Promise<CalendarEvent> => {
  const eventDate = new Date(data.event_date);
  if (isNaN(eventDate.getTime())) {
    throw new AppError('Fecha de evento inválida', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  if (data.is_recurring && !data.recurrence_rule) {
    throw new AppError(
      'Los eventos recurrentes requieren una regla de recurrencia',
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const sql = `
    INSERT INTO calendar_events (
      title, description, event_date, event_type, is_recurring,
      recurrence_rule, color, is_global, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const eventId = await insert(sql, [
    data.title,
    data.description || null,
    eventDate,
    data.event_type,
    data.is_recurring || false,
    data.recurrence_rule ? JSON.stringify(data.recurrence_rule) : null,
    data.color || 'primary',
    data.is_global || false,
    createdBy
  ]);

  return await getCalendarEventById(eventId, createdBy);
};

export const updateCalendarEvent = async (
  id: number,
  data: UpdateCalendarEventRequest,
  userId?: number
): Promise<CalendarEvent> => {
  const hasPermission = await hasPermissionToEditEvent(id, userId);

  if (!hasPermission) {
    throw new AppError('No tienes permisos para editar este evento', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  const existingEvent = await getCalendarEventById(id, userId);

  if (existingEvent.is_global && existingEvent.created_by !== userId) {
    throw new AppError(
      'No tienes permisos para editar eventos globales de otros usuarios',
      403,
      ERROR_CODES.PERMISSION_DENIED
    );
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (data.title !== undefined) {
    updates.push('title = ?');
    params.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }
  if (data.event_date !== undefined) {
    const eventDate = new Date(data.event_date);
    if (isNaN(eventDate.getTime())) {
      throw new AppError('Fecha de evento inválida', 400, ERROR_CODES.VALIDATION_ERROR);
    }
    updates.push('event_date = ?');
    params.push(eventDate);
  }
  if (data.event_type !== undefined) {
    updates.push('event_type = ?');
    params.push(data.event_type);
  }
  if (data.is_recurring !== undefined) {
    updates.push('is_recurring = ?');
    params.push(data.is_recurring);
  }
  if (data.recurrence_rule !== undefined) {
    updates.push('recurrence_rule = ?');
    params.push(data.recurrence_rule ? JSON.stringify(data.recurrence_rule) : null);
  }
  if (data.color !== undefined) {
    updates.push('color = ?');
    params.push(data.color);
  }
  if (data.is_global !== undefined) {
    updates.push('is_global = ?');
    params.push(data.is_global);
  }
  if (data.is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(data.is_active);
  }

  if (updates.length === 0) {
    return existingEvent;
  }

  const sql = `UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ?`;
  params.push(id);

  await query(sql, params);

  return await getCalendarEventById(id, userId);
};

export const toggleEventStatus = async (
  id: number,
  userId?: number
): Promise<CalendarEvent> => {
  const hasPermission = await hasPermissionToEditEvent(id, userId);

  if (!hasPermission) {
    throw new AppError('No tienes permisos para cambiar el estado de este evento', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  const event = await getCalendarEventById(id, userId);

  const newStatus = !event.is_active;
  const sql = 'UPDATE calendar_events SET is_active = ? WHERE id = ?';
  await query(sql, [newStatus, id]);

  return await getCalendarEventById(id, userId);
};

export const deleteCalendarEvent = async (id: number, userId?: number): Promise<void> => {
  const hasPermission = await hasPermissionToEditEvent(id, userId);

  if (!hasPermission) {
    throw new AppError('No tienes permisos para eliminar este evento', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  const event = await getCalendarEventById(id, userId);

  if (event.is_global && event.created_by !== userId) {
    throw new AppError(
      'No puedes eliminar eventos globales de otros usuarios',
      403,
      ERROR_CODES.PERMISSION_DENIED
    );
  }

  const sql = 'DELETE FROM calendar_events WHERE id = ?';
  await query(sql, [id]);
};