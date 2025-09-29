import bcrypt from 'bcrypt';
import { insert, query, queryOne } from '../config/database.js';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UpdateUserSettingsRequest
} from '../types/auth/requests.js';
import type { Role, UserSettings, UserWithRole } from '../types/auth/user.js';
import type { PaginationQuery } from '../types/base/api.js';
import { AppError } from '../types/base/error.js';
import { ERROR_CODES } from '../types/constants/errors.js';
import { DEFAULT_PAGINATION } from '../types/constants/pagination.js';

const SALT_ROUNDS = 12;

// Obtener todos los usuarios con paginación y filtros

export const getAllUsers = async (
  filters: PaginationQuery & {
    role_id?: number;
    is_active?: boolean;
    search?: string;
  }
): Promise<{ users: UserWithRole[]; total: number; page: number; limit: number; pages: number }> => {
  const page = filters.page || DEFAULT_PAGINATION.PAGE;
  const limit = Math.min(filters.limit || DEFAULT_PAGINATION.LIMIT, DEFAULT_PAGINATION.MAX_LIMIT);
  const offset = (page - 1) * limit;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (filters.role_id) {
    whereClauses.push('u.role_id = ?');
    params.push(filters.role_id);
  }

  if (filters.is_active !== undefined) {
    whereClauses.push('u.is_active = ?');
    params.push(filters.is_active ? 1 : 0); // Convertir boolean a número
  }

  if (filters.search) {
    whereClauses.push(
      '(u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR CONCAT(u.first_name, " ", u.last_name) LIKE ?)'
    );
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Contar total
  const countSql = `
    SELECT COUNT(*) as total
    FROM users u
    ${whereClause}
  `;

  const countResult = await query<{ total: number }>(countSql, params);
  const total = countResult[0]?.total ?? 0;

  // Obtener usuarios
  const sortBy = filters.sort_by || 'created_at';
  const sortOrder = filters.sort_order || 'DESC';

  // Validar sortBy para prevenir SQL injection
  const allowedSortFields = ['id', 'email', 'first_name', 'last_name', 'created_at', 'updated_at', 'last_login'];
  const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const validSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

  const usersSql = `
    SELECT 
      u.id, u.email, u.first_name, u.last_name, u.profile_picture,
      u.role_id, u.is_active, u.is_email_verified, u.last_login,
      u.created_at, u.updated_at,
      r.name as role_name,
      r.display_name as role_display_name,
      r.permissions as role_permissions,
      r.is_active as role_is_active,
      r.created_at as role_created_at,
      r.updated_at as role_updated_at
    FROM users u
    INNER JOIN roles r ON u.role_id = r.id
    ${whereClause}
    ORDER BY u.${validSortBy} ${validSortOrder}
    LIMIT ? OFFSET ?
  `;

  // IMPORTANTE: Asegurarse de que limit y offset sean números enteros
  const usersParams = [...params, parseInt(String(limit)), parseInt(String(offset))];

  console.log('SQL:', usersSql);
  console.log('Params:', usersParams);

  const users = await query<any>(usersSql, usersParams);

  const usersWithRole: UserWithRole[] = users.map((user) => {
    let permissions: string[] = [];
    try {
      if (Array.isArray(user.role_permissions)) {
        permissions = user.role_permissions;
      } else if (typeof user.role_permissions === 'string') {
        permissions = JSON.parse(user.role_permissions);
      }
    } catch (err) {
      console.error('Error parsing permissions:', err);
      permissions = [];
    }

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_picture: user.profile_picture,
      role_id: user.role_id,
      is_active: user.is_active,
      is_email_verified: user.is_email_verified,
      last_login: user.last_login,
      login_attempts: user.login_attempts || 0,
      locked_until: user.locked_until,
      created_at: user.created_at,
      updated_at: user.updated_at,
      role: {
        id: user.role_id,
        name: user.role_name,
        display_name: user.role_display_name,
        permissions,
        is_active: user.role_is_active,
        created_at: user.role_created_at,
        updated_at: user.role_updated_at
      }
    };
  });

  return {
    users: usersWithRole,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };
};

// Obtener usuario por ID
export const getUserByIdService = async (id: number): Promise<UserWithRole> => {
  const sql = `
    SELECT 
      u.id, u.email, u.first_name, u.last_name, u.profile_picture,
      u.role_id, u.is_active, u.is_email_verified, u.last_login,
      u.login_attempts, u.locked_until, u.created_at, u.updated_at,
      r.name as role_name,
      r.display_name as role_display_name,
      r.permissions as role_permissions,
      r.is_active as role_is_active,
      r.created_at as role_created_at,
      r.updated_at as role_updated_at
    FROM users u
    INNER JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `;

  const user = await queryOne<any>(sql, [id]);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  let permissions: string[] = [];
  try {
    if (Array.isArray(user.role_permissions)) {
      permissions = user.role_permissions;
    } else if (typeof user.role_permissions === 'string') {
      permissions = JSON.parse(user.role_permissions);
    }
  } catch (err) {
    console.error('Error parsing permissions:', err);
    permissions = [];
  }

  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    profile_picture: user.profile_picture,
    role_id: user.role_id,
    is_active: user.is_active,
    is_email_verified: user.is_email_verified,
    last_login: user.last_login,
    login_attempts: user.login_attempts,
    locked_until: user.locked_until,
    created_at: user.created_at,
    updated_at: user.updated_at,
    role: {
      id: user.role_id,
      name: user.role_name,
      display_name: user.role_display_name,
      permissions,
      is_active: user.role_is_active,
      created_at: user.role_created_at,
      updated_at: user.role_updated_at
    }
  };
};

// Crear usuario
export const createUser = async (data: CreateUserRequest): Promise<UserWithRole> => {
  // Verificar que el email no exista
  const existingUser = await queryOne('SELECT id FROM users WHERE email = ?', [data.email]);
  if (existingUser) {
    throw new AppError('El email ya está registrado', 409, ERROR_CODES.DUPLICATE_ENTRY);
  }

  // Verificar que el rol existe y está activo
  const role = await queryOne<Role>('SELECT * FROM roles WHERE id = ? AND is_active = 1', [
    data.role_id
  ]);
  if (!role) {
    throw new AppError('Rol no válido o inactivo', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  // Hash de contraseña
  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  // Insertar usuario
  const sql = `
    INSERT INTO users (email, password_hash, first_name, last_name, profile_picture, role_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `;

  const userId = await insert(sql, [
    data.email,
    hashedPassword,
    data.first_name,
    data.last_name,
    data.profile_picture || null,
    data.role_id
  ]);

  // Crear configuraciones por defecto
  const settingsSql = `
    INSERT INTO user_settings (user_id, notifications, dashboard_layout)
    VALUES (?, '{}', '{}')
  `;
  await insert(settingsSql, [userId]);

  return await getUserByIdService(userId);
};

// Actualizar usuario
export const updateUser = async (
  id: number,
  data: UpdateUserRequest
): Promise<UserWithRole> => {
  // Verificar que el usuario existe
  const existingUser = await getUserByIdService(id);

  // Si se está cambiando el rol, verificar que existe y está activo
  if (data.role_id && data.role_id !== existingUser.role_id) {
    const role = await queryOne<Role>('SELECT * FROM roles WHERE id = ? AND is_active = 1', [
      data.role_id
    ]);
    if (!role) {
      throw new AppError('Rol no válido o inactivo', 400, ERROR_CODES.VALIDATION_ERROR);
    }
  }

  // Construir query de actualización
  const updates: string[] = [];
  const params: any[] = [];

  if (data.first_name !== undefined) {
    updates.push('first_name = ?');
    params.push(data.first_name);
  }
  if (data.last_name !== undefined) {
    updates.push('last_name = ?');
    params.push(data.last_name);
  }
  if (data.profile_picture !== undefined) {
    updates.push('profile_picture = ?');
    params.push(data.profile_picture);
  }
  if (data.role_id !== undefined) {
    updates.push('role_id = ?');
    params.push(data.role_id);
  }
  if (data.is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(data.is_active);
  }

  if (updates.length === 0) {
    return existingUser;
  }

  const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  params.push(id);

  await query(sql, params);

  return await getUserByIdService(id);
};

// Eliminar usuario (soft delete)
export const deleteUser = async (id: number): Promise<void> => {
  const user = await getUserByIdService(id);

  // No permitir eliminar super_admin
  if (user.role.name === 'super_admin') {
    throw new AppError(
      'No se puede eliminar un super administrador',
      403,
      ERROR_CODES.PERMISSION_DENIED
    );
  }

  const sql = 'UPDATE users SET is_active = 0 WHERE id = ?';
  await query(sql, [id]);
};

// Eliminar usuario permanentemente
export const deleteUserPermanently = async (id: number): Promise<void> => {
  const user = await getUserByIdService(id);

  // No permitir eliminar super_admin
  if (user.role.name === 'super_admin') {
    throw new AppError(
      'No se puede eliminar un super administrador',
      403,
      ERROR_CODES.PERMISSION_DENIED
    );
  }

  const sql = 'DELETE FROM users WHERE id = ?';
  await query(sql, [id]);
};

// Cambiar contraseña de usuario
export const changeUserPassword = async (id: number, newPassword: string): Promise<void> => {
  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const sql = 'UPDATE users SET password_hash = ? WHERE id = ?';
  await query(sql, [hashedPassword, id]);
};

// Obtener configuraciones de usuario
export const getUserSettings = async (userId: number): Promise<UserSettings> => {
  const sql = 'SELECT * FROM user_settings WHERE user_id = ?';
  const settings = await queryOne<any>(sql, [userId]);

  if (!settings) {
    throw new AppError('Configuraciones no encontradas', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  return {
    id: settings.id,
    user_id: settings.user_id,
    theme: settings.theme,
    language: settings.language,
    timezone: settings.timezone,
    date_format: settings.date_format,
    time_format: settings.time_format,
    notifications: typeof settings.notifications === 'string'
      ? JSON.parse(settings.notifications)
      : settings.notifications,
    dashboard_layout: typeof settings.dashboard_layout === 'string'
      ? JSON.parse(settings.dashboard_layout)
      : settings.dashboard_layout,
    created_at: settings.created_at,
    updated_at: settings.updated_at
  };
};

// Actualizar configuraciones de usuario
export const updateUserSettings = async (
  userId: number,
  data: UpdateUserSettingsRequest
): Promise<UserSettings> => {
  // Verificar que existen las configuraciones
  await getUserSettings(userId);

  const updates: string[] = [];
  const params: any[] = [];

  if (data.theme) {
    updates.push('theme = ?');
    params.push(data.theme);
  }
  if (data.language) {
    updates.push('language = ?');
    params.push(data.language);
  }
  if (data.timezone) {
    updates.push('timezone = ?');
    params.push(data.timezone);
  }
  if (data.date_format) {
    updates.push('date_format = ?');
    params.push(data.date_format);
  }
  if (data.time_format) {
    updates.push('time_format = ?');
    params.push(data.time_format);
  }
  if (data.notifications) {
    updates.push('notifications = ?');
    params.push(JSON.stringify(data.notifications));
  }
  if (data.dashboard_layout) {
    updates.push('dashboard_layout = ?');
    params.push(JSON.stringify(data.dashboard_layout));
  }

  if (updates.length > 0) {
    const sql = `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`;
    params.push(userId);
    await query(sql, params);
  }

  return await getUserSettings(userId);
};

// Activar/Desactivar usuario
export const toggleUserStatus = async (id: number): Promise<UserWithRole> => {
  const user = await getUserByIdService(id);

  // No permitir desactivar super_admin
  if (user.role.name === 'super_admin') {
    throw new AppError(
      'No se puede desactivar un super administrador',
      403,
      ERROR_CODES.PERMISSION_DENIED
    );
  }

  const newStatus = !user.is_active;
  const sql = 'UPDATE users SET is_active = ? WHERE id = ?';
  await query(sql, [newStatus, id]);

  return await getUserByIdService(id);
};