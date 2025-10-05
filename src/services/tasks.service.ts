import { insert, query, queryOne } from '../config/database.js';
import type { PaginationQuery } from '../types/base/api.js';
import { AppError } from '../types/base/error.js';
import { ERROR_CODES } from '../types/constants/errors.js';
import { DEFAULT_PAGINATION } from '../types/constants/pagination.js';
import { TaskPriority, TaskStatus } from '../types/enums/task.js';
import type { TaskComment } from '../types/task/comment.js';
import type {
  CreateTaskRequest,
  MoveTaskRequest,
  UpdateTaskRequest
} from '../types/task/requests.js';
import type { Task } from '../types/task/task.js';


const parseTaskRow = (row: any): Task => {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    position: row.position,
    list_id: row.list_id,
    assigned_to: row.assigned_to,
    created_by: row.created_by,
    due_date: row.due_date,
    completed_at: row.completed_at,
    estimated_hours: row.estimated_hours,
    actual_hours: row.actual_hours,
    tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
};

const hasPermissionToViewTask = async (taskId: number, userId?: number): Promise<boolean> => {
  if (!userId) return false;

  const sql = `
    SELECT t.id 
    FROM tasks t
    INNER JOIN task_lists tl ON t.list_id = tl.id
    WHERE t.id = ? AND (tl.user_id = ? OR t.assigned_to = ? OR t.created_by = ?)
  `;

  const task = await queryOne(sql, [taskId, userId, userId, userId]);
  return !!task;
};

const hasPermissionToEditTask = async (taskId: number, userId?: number): Promise<boolean> => {
  if (!userId) return false;

  const sql = `
    SELECT t.id 
    FROM tasks t
    INNER JOIN task_lists tl ON t.list_id = tl.id
    WHERE t.id = ? AND (tl.user_id = ? OR t.created_by = ?)
  `;

  const task = await queryOne(sql, [taskId, userId, userId]);
  return !!task;
};


export const getAllTasks = async (
  filters: PaginationQuery & {
    list_id?: number;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigned_to?: number;
    created_by?: number;
    due_date_from?: Date;
    due_date_to?: Date;
    search?: string;
    overdue?: boolean;
    user_id?: number;
  }
): Promise<{ tasks: Task[]; total: number; page: number; limit: number; pages: number }> => {
  const page = filters.page || DEFAULT_PAGINATION.PAGE;
  const limit = Math.min(filters.limit || DEFAULT_PAGINATION.LIMIT, DEFAULT_PAGINATION.MAX_LIMIT);
  const offset = (page - 1) * limit;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (filters.user_id) {
    whereClauses.push('(tl.user_id = ? OR t.assigned_to = ? OR t.created_by = ?)');
    params.push(filters.user_id, filters.user_id, filters.user_id);
  }

  if (filters.list_id) {
    whereClauses.push('t.list_id = ?');
    params.push(filters.list_id);
  }

  if (filters.status) {
    whereClauses.push('t.status = ?');
    params.push(filters.status);
  }

  if (filters.priority) {
    whereClauses.push('t.priority = ?');
    params.push(filters.priority);
  }

  if (filters.assigned_to) {
    whereClauses.push('t.assigned_to = ?');
    params.push(filters.assigned_to);
  }

  if (filters.created_by) {
    whereClauses.push('t.created_by = ?');
    params.push(filters.created_by);
  }

  if (filters.due_date_from) {
    whereClauses.push('t.due_date >= ?');
    params.push(filters.due_date_from);
  }

  if (filters.due_date_to) {
    whereClauses.push('t.due_date <= ?');
    params.push(filters.due_date_to);
  }

  if (filters.overdue) {
    whereClauses.push('t.due_date < NOW() AND t.status != ?');
    params.push(TaskStatus.COMPLETED);
  }

  if (filters.search) {
    whereClauses.push('(t.title LIKE ? OR t.description LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) as total
    FROM tasks t
    INNER JOIN task_lists tl ON t.list_id = tl.id
    ${whereClause}
  `;

  const countResult = await query<{ total: number }>(countSql, params);
  const total = countResult[0]?.total ?? 0;

  const sortBy = filters.sort_by || 'position';
  const sortOrder = filters.sort_order || 'ASC';

  const allowedSortFields = ['id', 'title', 'priority', 'status', 'due_date', 'position', 'created_at'];
  const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'position';
  const validSortOrder = sortOrder === 'DESC' ? 'DESC' : 'ASC';

  const tasksSql = `
    SELECT t.* 
    FROM tasks t
    INNER JOIN task_lists tl ON t.list_id = tl.id
    ${whereClause}
    ORDER BY t.${validSortBy} ${validSortOrder}
    LIMIT ? OFFSET ?
  `;

  const tasksParams = [...params, limit, offset];
  const tasksRows = await query<any>(tasksSql, tasksParams);
  const tasks = tasksRows.map(parseTaskRow);

  return {
    tasks,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };
};

export const getTaskById = async (id: number, userId?: number): Promise<Task> => {
  const hasPermission = await hasPermissionToViewTask(id, userId);

  if (!hasPermission) {
    throw new AppError('No tienes permisos para ver esta tarea', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  const sql = 'SELECT * FROM tasks WHERE id = ?';
  const task = await queryOne<any>(sql, [id]);

  if (!task) {
    throw new AppError('Tarea no encontrada', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  return parseTaskRow(task);
};

export const createTask = async (data: CreateTaskRequest, createdBy: number): Promise<Task> => {
  const list = await queryOne(
    'SELECT id, user_id FROM task_lists WHERE id = ? AND is_active = 1',
    [data.list_id]
  );

  if (!list) {
    throw new AppError('Lista no encontrada o inactiva', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  if (list.user_id !== createdBy) {
    throw new AppError('No tienes permisos para crear tareas en esta lista', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  if (data.assigned_to) {
    const assignedUser = await queryOne('SELECT id FROM users WHERE id = ? AND is_active = 1', [data.assigned_to]);
    if (!assignedUser) {
      throw new AppError('Usuario asignado no encontrado o inactivo', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
    }
  }

  const lastPosition = await queryOne<{ max_position: number }>(
    'SELECT COALESCE(MAX(position), -1) as max_position FROM tasks WHERE list_id = ?',
    [data.list_id]
  );

  const position = (lastPosition?.max_position ?? -1) + 1;

  const sql = `
    INSERT INTO tasks (
      title, description, priority, list_id, assigned_to, created_by,
      due_date, estimated_hours, tags, position
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const taskId = await insert(sql, [
    data.title,
    data.description || null,
    data.priority || TaskPriority.MEDIUM,
    data.list_id,
    data.assigned_to || null,
    createdBy,
    data.due_date || null,
    data.estimated_hours || null,
    data.tags ? JSON.stringify(data.tags) : null,
    position
  ]);

  return await getTaskById(taskId, createdBy);
};

export const updateTask = async (
  id: number,
  data: UpdateTaskRequest,
  userId?: number
): Promise<Task> => {
  const hasPermission = await hasPermissionToEditTask(id, userId);

  if (!hasPermission) {
    throw new AppError('No tienes permisos para editar esta tarea', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  const existingTask = await getTaskById(id, userId);

  if (data.list_id && data.list_id !== existingTask.list_id) {
    const newList = await queryOne(
      'SELECT id, user_id FROM task_lists WHERE id = ? AND is_active = 1',
      [data.list_id]
    );

    if (!newList) {
      throw new AppError('Lista destino no encontrada', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    if (newList.user_id !== userId) {
      throw new AppError('No tienes permisos para mover tareas a esta lista', 403, ERROR_CODES.PERMISSION_DENIED);
    }
  }

  if (data.assigned_to && data.assigned_to !== existingTask.assigned_to) {
    const assignedUser = await queryOne('SELECT id FROM users WHERE id = ? AND is_active = 1', [data.assigned_to]);
    if (!assignedUser) {
      throw new AppError('Usuario asignado no encontrado', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
    }
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
  if (data.priority !== undefined) {
    updates.push('priority = ?');
    params.push(data.priority);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }
  if (data.position !== undefined) {
    updates.push('position = ?');
    params.push(data.position);
  }
  if (data.list_id !== undefined) {
    updates.push('list_id = ?');
    params.push(data.list_id);
  }
  if (data.assigned_to !== undefined) {
    updates.push('assigned_to = ?');
    params.push(data.assigned_to);
  }
  if (data.due_date !== undefined) {
    updates.push('due_date = ?');
    params.push(data.due_date);
  }
  if (data.estimated_hours !== undefined) {
    updates.push('estimated_hours = ?');
    params.push(data.estimated_hours);
  }
  if (data.actual_hours !== undefined) {
    updates.push('actual_hours = ?');
    params.push(data.actual_hours);
  }
  if (data.tags !== undefined) {
    updates.push('tags = ?');
    params.push(data.tags ? JSON.stringify(data.tags) : null);
  }

  if (updates.length === 0) {
    return existingTask;
  }

  const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
  params.push(id);

  await query(sql, params);

  return await getTaskById(id, userId);
};

export const toggleTaskStatus = async (
  id: number,
  status: TaskStatus,
  userId?: number
): Promise<Task> => {
  const hasPermission = await hasPermissionToEditTask(id, userId);

  if (!hasPermission) {
    throw new AppError('No tienes permisos para cambiar el estado de esta tarea', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  const sql = 'UPDATE tasks SET status = ? WHERE id = ?';
  await query(sql, [status, id]);

  return await getTaskById(id, userId);
};

export const completeTask = async (id: number, userId?: number): Promise<Task> => {
  const hasPermission = await hasPermissionToEditTask(id, userId);

  if (!hasPermission) {
    throw new AppError('No tienes permisos para completar esta tarea', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  const sql = 'UPDATE tasks SET status = ?, completed_at = NOW() WHERE id = ?';
  await query(sql, [TaskStatus.COMPLETED, id]);

  return await getTaskById(id, userId);
};

export const assignTask = async (
  id: number,
  assignedTo: number | null,
  userId?: number
): Promise<Task> => {
  const hasPermission = await hasPermissionToEditTask(id, userId);

  if (!hasPermission) {
    throw new AppError('No tienes permisos para asignar esta tarea', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  if (assignedTo !== null) {
    const user = await queryOne('SELECT id FROM users WHERE id = ? AND is_active = 1', [assignedTo]);
    if (!user) {
      throw new AppError('Usuario no encontrado o inactivo', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
    }
  }

  const sql = 'UPDATE tasks SET assigned_to = ? WHERE id = ?';
  await query(sql, [assignedTo, id]);

  return await getTaskById(id, userId);
};

export const moveTask = async (
  id: number,
  data: MoveTaskRequest,
  userId?: number
): Promise<Task> => {
  const hasPermission = await hasPermissionToEditTask(id, userId);

  if (!hasPermission) {
    throw new AppError('No tienes permisos para mover esta tarea', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  const targetList = await queryOne(
    'SELECT id, user_id FROM task_lists WHERE id = ? AND is_active = 1',
    [data.target_list_id]
  );

  if (!targetList) {
    throw new AppError('Lista destino no encontrada', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  if (targetList.user_id !== userId) {
    throw new AppError('No tienes permisos para mover tareas a esta lista', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  if (data.source_list_id === data.target_list_id) {
    const task = await queryOne('SELECT position FROM tasks WHERE id = ?', [id]);
    const oldPosition = task.position;

    if (oldPosition < data.position) {
      await query(
        'UPDATE tasks SET position = position - 1 WHERE list_id = ? AND position > ? AND position <= ?',
        [data.target_list_id, oldPosition, data.position]
      );
    } else if (oldPosition > data.position) {
      await query(
        'UPDATE tasks SET position = position + 1 WHERE list_id = ? AND position >= ? AND position < ?',
        [data.target_list_id, data.position, oldPosition]
      );
    }
  } else {
    await query(
      'UPDATE tasks SET position = position - 1 WHERE list_id = ? AND position > (SELECT position FROM tasks WHERE id = ?)',
      [data.source_list_id, id]
    );

    await query(
      'UPDATE tasks SET position = position + 1 WHERE list_id = ? AND position >= ?',
      [data.target_list_id, data.position]
    );
  }

  const sql = 'UPDATE tasks SET list_id = ?, position = ? WHERE id = ?';
  await query(sql, [data.target_list_id, data.position, id]);

  return await getTaskById(id, userId);
};

export const deleteTask = async (id: number, userId?: number): Promise<void> => {
  const hasPermission = await hasPermissionToEditTask(id, userId);

  if (!hasPermission) {
    throw new AppError('No tienes permisos para eliminar esta tarea', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  const task = await getTaskById(id, userId);

  const sql = 'DELETE FROM tasks WHERE id = ?';
  await query(sql, [id]);

  await query(
    'UPDATE tasks SET position = position - 1 WHERE list_id = ? AND position > ?',
    [task.list_id, task.position]
  );
};


export const getTaskComments = async (taskId: number, userId?: number): Promise<TaskComment[]> => {
  const hasPermission = await hasPermissionToViewTask(taskId, userId);

  if (!hasPermission) {
    throw new AppError('No tienes permisos para ver los comentarios de esta tarea', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  const sql = `
    SELECT c.*, u.first_name, u.last_name, u.email, u.profile_picture
    FROM task_comments c
    INNER JOIN users u ON c.user_id = u.id
    WHERE c.task_id = ?
    ORDER BY c.created_at ASC
  `;

  const comments = await query<any>(sql, [taskId]);

  return comments.map(comment => ({
    id: comment.id,
    task_id: comment.task_id,
    user_id: comment.user_id,
    content: comment.content,
    is_edited: comment.is_edited,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    user: {
      id: comment.user_id,
      first_name: comment.first_name,
      last_name: comment.last_name,
      email: comment.email,
      profile_picture: comment.profile_picture,
      role_id: comment.role_id ?? 0,
      is_active: comment.is_active ?? false,
      is_email_verified: comment.is_email_verified ?? false,
      login_attempts: comment.login_attempts ?? 0,
      created_at: comment.user_created_at ?? comment.created_at,
      updated_at: comment.user_updated_at ?? comment.updated_at
    }
  }));
};

export const addTaskComment = async (
  taskId: number,
  userId: number,
  content: string
): Promise<TaskComment> => {
  const hasPermission = await hasPermissionToViewTask(taskId, userId);

  if (!hasPermission) {
    throw new AppError('No tienes permisos para comentar en esta tarea', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  const sql = `
    INSERT INTO task_comments (task_id, user_id, content)
    VALUES (?, ?, ?)
  `;

  const commentId = await insert(sql, [taskId, userId, content]);

  const comment = await queryOne<any>(
    `SELECT c.*, u.first_name, u.last_name, u.email, u.profile_picture
     FROM task_comments c
     INNER JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    [commentId]
  );

  return {
    id: comment.id,
    task_id: comment.task_id,
    user_id: comment.user_id,
    content: comment.content,
    is_edited: comment.is_edited,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    user: {
      id: comment.user_id,
      first_name: comment.first_name,
      last_name: comment.last_name,
      email: comment.email,
      profile_picture: comment.profile_picture,
      role_id: comment.role_id ?? 0,
      is_active: comment.is_active ?? false,
      is_email_verified: comment.is_email_verified ?? false,
      login_attempts: comment.login_attempts ?? 0,
      created_at: comment.user_created_at ?? comment.created_at,
      updated_at: comment.user_updated_at ?? comment.updated_at
    }
  };
};

export const updateTaskComment = async (
  commentId: number,
  taskId: number,
  userId: number | undefined,
  content: string
): Promise<TaskComment> => {
  const comment = await queryOne<any>(
    'SELECT * FROM task_comments WHERE id = ? AND task_id = ?',
    [commentId, taskId]
  );

  if (!comment) {
    throw new AppError('Comentario no encontrado', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  if (comment.user_id !== userId) {
    throw new AppError('No tienes permisos para editar este comentario', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  const sql = 'UPDATE task_comments SET content = ?, is_edited = 1 WHERE id = ?';
  await query(sql, [content, commentId]);

  const updatedComment = await queryOne<any>(
    `SELECT c.*, u.first_name, u.last_name, u.email, u.profile_picture
     FROM task_comments c
     INNER JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    [commentId]
  );

  return {
    id: updatedComment.id,
    task_id: updatedComment.task_id,
    user_id: updatedComment.user_id,
    content: updatedComment.content,
    is_edited: updatedComment.is_edited,
    created_at: updatedComment.created_at,
    updated_at: updatedComment.updated_at,
    user: {
      id: updatedComment.user_id,
      first_name: updatedComment.first_name,
      last_name: updatedComment.last_name,
      email: updatedComment.email,
      profile_picture: updatedComment.profile_picture,
      role_id: 0,
      is_active: false,
      is_email_verified: false,
      login_attempts: 0,
      created_at: updatedComment.created_at,
      updated_at: updatedComment.updated_at
    }
  };
};

export const deleteTaskComment = async (
  commentId: number,
  taskId: number,
  userId: number | undefined
): Promise<void> => {
  const comment = await queryOne<any>(
    'SELECT * FROM task_comments WHERE id = ? AND task_id = ?',
    [commentId, taskId]
  );

  if (!comment) {
    throw new AppError('Comentario no encontrado', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  if (comment.user_id !== userId) {
    throw new AppError('No tienes permisos para eliminar este comentario', 403, ERROR_CODES.PERMISSION_DENIED);
  }

  const sql = 'DELETE FROM task_comments WHERE id = ?';
  await query(sql, [commentId]);
};