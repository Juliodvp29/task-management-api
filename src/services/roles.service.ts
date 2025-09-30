import { insert, query, queryOne } from '../config/database.js';
import type { CreateRoleRequest, UpdateRoleRequest } from '../types/auth/requests.js';
import type { Role } from '../types/auth/user.js';
import { AppError } from '../types/base/error.js';
import { ERROR_CODES } from '../types/constants/errors.js';

export const getAllRoles = async (includeInactive: boolean = false): Promise<Role[]> => {
  let sql = 'SELECT * FROM roles';

  if (!includeInactive) {
    sql += ' WHERE is_active = 1';
  }

  sql += ' ORDER BY id ASC';

  const roles = await query<any>(sql);

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    display_name: role.display_name,
    description: role.description,
    permissions: parsePermissions(role.permissions),
    is_active: role.is_active,
    created_at: role.created_at,
    updated_at: role.updated_at
  }));
};

export const getRoleById = async (id: number): Promise<Role> => {
  const sql = 'SELECT * FROM roles WHERE id = ?';
  const role = await queryOne<any>(sql, [id]);

  if (!role) {
    throw new AppError('Rol no encontrado', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  return {
    id: role.id,
    name: role.name,
    display_name: role.display_name,
    description: role.description,
    permissions: parsePermissions(role.permissions),
    is_active: role.is_active,
    created_at: role.created_at,
    updated_at: role.updated_at
  };
};

export const getRoleByName = async (name: string): Promise<Role | null> => {
  const sql = 'SELECT * FROM roles WHERE name = ?';
  const role = await queryOne<any>(sql, [name]);

  if (!role) return null;

  return {
    id: role.id,
    name: role.name,
    display_name: role.display_name,
    description: role.description,
    permissions: parsePermissions(role.permissions),
    is_active: role.is_active,
    created_at: role.created_at,
    updated_at: role.updated_at
  };
};

export const createRole = async (data: CreateRoleRequest): Promise<Role> => {
  const existingRole = await getRoleByName(data.name);
  if (existingRole) {
    throw new AppError('Ya existe un rol con ese nombre', 409, ERROR_CODES.DUPLICATE_ENTRY);
  }

  if (!/^[a-z_]+$/.test(data.name)) {
    throw new AppError(
      'El nombre del rol solo puede contener letras minúsculas y guiones bajos',
      400,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const sql = `
    INSERT INTO roles (name, display_name, description, permissions, is_active)
    VALUES (?, ?, ?, ?, 1)
  `;

  const roleId = await insert(sql, [
    data.name,
    data.display_name,
    data.description || null,
    JSON.stringify(data.permissions)
  ]);

  return await getRoleById(roleId);
};

export const updateRole = async (id: number, data: UpdateRoleRequest): Promise<Role> => {
  const existingRole = await getRoleById(id);

  if (['super_admin', 'admin', 'manager', 'user'].includes(existingRole.name)) {
    throw new AppError(
      'No se pueden modificar los roles del sistema',
      403,
      ERROR_CODES.PERMISSION_DENIED
    );
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (data.display_name !== undefined) {
    updates.push('display_name = ?');
    params.push(data.display_name);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }
  if (data.permissions !== undefined) {
    updates.push('permissions = ?');
    params.push(JSON.stringify(data.permissions));
  }
  if (data.is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(data.is_active);
  }

  if (updates.length === 0) {
    return existingRole;
  }

  const sql = `UPDATE roles SET ${updates.join(', ')} WHERE id = ?`;
  params.push(id);

  await query(sql, params);

  return await getRoleById(id);
};

export const deleteRole = async (id: number): Promise<void> => {
  const role = await getRoleById(id);

  if (['super_admin', 'admin', 'manager', 'user'].includes(role.name)) {
    throw new AppError(
      'No se pueden eliminar los roles del sistema',
      403,
      ERROR_CODES.PERMISSION_DENIED
    );
  }

  const usersWithRole = await query('SELECT COUNT(*) as count FROM users WHERE role_id = ?', [
    id
  ]);
  if (usersWithRole[0].count > 0) {
    throw new AppError(
      'No se puede eliminar un rol que tiene usuarios asignados',
      409,
      ERROR_CODES.RESOURCE_CONFLICT
    );
  }

  const sql = 'DELETE FROM roles WHERE id = ?';
  await query(sql, [id]);
};

export const toggleRoleStatus = async (id: number): Promise<Role> => {
  const role = await getRoleById(id);

  if (['super_admin', 'admin', 'manager', 'user'].includes(role.name)) {
    throw new AppError(
      'No se pueden desactivar los roles del sistema',
      403,
      ERROR_CODES.PERMISSION_DENIED
    );
  }

  const newStatus = !role.is_active;
  const sql = 'UPDATE roles SET is_active = ? WHERE id = ?';
  await query(sql, [newStatus, id]);

  return await getRoleById(id);
};

export const getUsersByRole = async (roleId: number): Promise<any[]> => {
  const sql = `
    SELECT id, email, first_name, last_name, is_active, created_at
    FROM users
    WHERE role_id = ?
    ORDER BY created_at DESC
  `;

  return await query(sql, [roleId]);
};

const parsePermissions = (permissions: any): string[] => {
  try {
    if (Array.isArray(permissions)) {
      return permissions;
    }
    if (typeof permissions === 'string') {
      return JSON.parse(permissions);
    }
    return [];
  } catch (error) {
    console.error('Error parsing permissions:', error);
    return [];
  }
};