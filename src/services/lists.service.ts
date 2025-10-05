import { insert, query, queryOne } from '../config/database.js';
import { AppError } from '../types/base/error.js';
import { ERROR_CODES } from '../types/constants/errors.js';
import type { TaskList } from '../types/task/list.js';
import type {
  CreateTaskListRequest,
  UpdateTaskListRequest
} from '../types/task/requests.js';

const parseTaskListRow = (row: any): TaskList => {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    position: row.position,
    user_id: row.user_id,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tasks_count: row.tasks_count || 0
  };
};


export const getAllTaskLists = async (
  userId: number,
  includeInactive: boolean = false,
  includeTasks: boolean = false
): Promise<TaskList[]> => {
  let sql = `
    SELECT 
      tl.*,
      COUNT(t.id) as tasks_count
    FROM task_lists tl
    LEFT JOIN tasks t ON tl.id = t.list_id
    WHERE tl.user_id = ?
  `;

  if (!includeInactive) {
    sql += ' AND tl.is_active = 1';
  }

  sql += ' GROUP BY tl.id ORDER BY tl.position ASC';

  const lists = await query<any>(sql, [userId]);
  const parsedLists = lists.map(parseTaskListRow);

  if (includeTasks) {
    for (const list of parsedLists) {
      const tasksSql = `
        SELECT * FROM tasks 
        WHERE list_id = ? 
        ORDER BY position ASC
      `;
      const tasks = await query(tasksSql, [list.id]);
      (list as any).tasks = tasks;
    }
  }

  return parsedLists;
};

export const getTaskListById = async (id: number, userId?: number): Promise<TaskList> => {
  const sql = `
    SELECT 
      tl.*,
      COUNT(t.id) as tasks_count
    FROM task_lists tl
    LEFT JOIN tasks t ON tl.id = t.list_id
    WHERE tl.id = ?
    GROUP BY tl.id
  `;

  const list = await queryOne<any>(sql, [id]);

  if (!list) {
    throw new AppError('Lista no encontrada', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  if (userId && list.user_id !== userId) {
    throw new AppError('No tienes permisos para ver esta lista', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  return parseTaskListRow(list);
};

export const getTaskListWithTasks = async (id: number, userId?: number): Promise<any> => {
  const list = await getTaskListById(id, userId);

  const tasksSql = `
    SELECT * FROM tasks 
    WHERE list_id = ? 
    ORDER BY position ASC
  `;

  const tasks = await query(tasksSql, [id]);

  return {
    ...list,
    tasks
  };
};

export const createTaskList = async (
  data: CreateTaskListRequest,
  userId: number
): Promise<TaskList> => {
  let position = data.position;

  if (position === undefined) {
    const lastPosition = await queryOne<{ max_position: number }>(
      'SELECT COALESCE(MAX(position), -1) as max_position FROM task_lists WHERE user_id = ?',
      [userId]
    );
    position = (lastPosition?.max_position ?? -1) + 1;
  }

  const sql = `
    INSERT INTO task_lists (name, description, color, position, user_id)
    VALUES (?, ?, ?, ?, ?)
  `;

  const listId = await insert(sql, [
    data.name,
    data.description || null,
    data.color || null,
    position,
    userId
  ]);

  return await getTaskListById(listId, userId);
};

export const updateTaskList = async (
  id: number,
  data: UpdateTaskListRequest,
  userId?: number
): Promise<TaskList> => {
  const existingList = await getTaskListById(id, userId);

  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }
  if (data.color !== undefined) {
    updates.push('color = ?');
    params.push(data.color);
  }
  if (data.position !== undefined) {
    updates.push('position = ?');
    params.push(data.position);
  }
  if (data.is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(data.is_active);
  }

  if (updates.length === 0) {
    return existingList;
  }

  const sql = `UPDATE task_lists SET ${updates.join(', ')} WHERE id = ?`;
  params.push(id);

  await query(sql, params);

  return await getTaskListById(id, userId);
};

export const toggleTaskListStatus = async (
  id: number,
  userId?: number
): Promise<TaskList> => {
  const list = await getTaskListById(id, userId);

  const newStatus = !list.is_active;
  const sql = 'UPDATE task_lists SET is_active = ? WHERE id = ?';
  await query(sql, [newStatus, id]);

  return await getTaskListById(id, userId);
};

export const reorderTaskLists = async (
  lists: Array<{ id: number; position: number }>,
  userId: number
): Promise<void> => {
  const listIds = lists.map(l => l.id);
  const userLists = await query(
    `SELECT id FROM task_lists WHERE id IN (${listIds.map(() => '?').join(',')}) AND user_id = ?`,
    [...listIds, userId]
  );

  if (userLists.length !== lists.length) {
    throw new AppError('Algunas listas no te pertenecen', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  for (const list of lists) {
    await query('UPDATE task_lists SET position = ? WHERE id = ?', [list.position, list.id]);
  }
};

export const deleteTaskList = async (id: number, userId?: number): Promise<void> => {
  await getTaskListById(id, userId);

  const sql = 'DELETE FROM task_lists WHERE id = ?';
  await query(sql, [id]);
};