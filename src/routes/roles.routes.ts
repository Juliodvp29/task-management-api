import type { NextFunction, Response } from 'express';
import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  createRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  getUsersByRole,
  toggleRoleStatus,
  updateRole
} from '../services/roles.service.js';
import type { AuthRequest, CreateRoleRequest, UpdateRoleRequest } from '../types/auth/requests.js';
import type { ApiResponse } from '../types/base/api.js';
import { AppError } from '../types/base/error.js';
import { ERROR_CODES } from '../types/constants/errors.js';
import { PERMISSIONS } from '../types/constants/permissions.js';

const router = Router();

const createRoleValidation = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-z_]+$/
  },
  display_name: { required: true, minLength: 2, maxLength: 100 },
  permissions: { required: true }
};

const updateRoleValidation = {
  display_name: { minLength: 2, maxLength: 100 }
};

router.get(
  '/',
  authenticate,
  requirePermission('roles.view'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const includeInactive = req.query.include_inactive === 'true';
      const roles = await getAllRoles(includeInactive);

      const response: ApiResponse = {
        success: true,
        data: { roles },
        message: 'Roles obtenidos exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/permissions',
  authenticate,
  requirePermission('roles.view'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const permissions = Object.entries(PERMISSIONS).map(([key, value]) => ({
        key,
        label: value
      }));

      const response: ApiResponse = {
        success: true,
        data: { permissions },
        message: 'Permisos obtenidos exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  authenticate,
  requirePermission('roles.view'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) {
        throw new AppError('ID de rol requerido', 400, ERROR_CODES.VALIDATION_ERROR);
      }
      const roleId = parseInt(req.params.id);

      if (isNaN(roleId)) {
        throw new AppError('ID de rol inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const role = await getRoleById(roleId);

      const response: ApiResponse = {
        success: true,
        data: { role },
        message: 'Rol obtenido exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id/users',
  authenticate,
  requirePermission('roles.view'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) {
        throw new AppError('ID de rol requerido', 400, ERROR_CODES.VALIDATION_ERROR);
      }
      const roleId = parseInt(req.params.id);

      if (isNaN(roleId)) {
        throw new AppError('ID de rol inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      await getRoleById(roleId);

      const users = await getUsersByRole(roleId);

      const response: ApiResponse = {
        success: true,
        data: { users },
        message: 'Usuarios del rol obtenidos exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  authenticate,
  requirePermission('roles.create'),
  validateRequest(createRoleValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const roleData: CreateRoleRequest = req.body;

      const validPermissions = Object.keys(PERMISSIONS);
      const invalidPermissions = roleData.permissions.filter(
        (p) => !validPermissions.includes(p)
      );

      if (invalidPermissions.length > 0) {
        throw new AppError(
          'Permisos inválidos',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          true,
          [`Permisos inválidos: ${invalidPermissions.join(', ')}`]
        );
      }

      const role = await createRole(roleData);

      const response: ApiResponse = {
        success: true,
        data: { role },
        message: 'Rol creado exitosamente'
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  authenticate,
  requirePermission('roles.edit'),
  validateRequest(updateRoleValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) {
        throw new AppError('ID de rol requerido', 400, ERROR_CODES.VALIDATION_ERROR);
      }
      const roleId = parseInt(req.params.id);

      if (isNaN(roleId)) {
        throw new AppError('ID de rol inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const updateData: UpdateRoleRequest = req.body;

      if (updateData.permissions) {
        const validPermissions = Object.keys(PERMISSIONS);
        const invalidPermissions = updateData.permissions.filter(
          (p) => !validPermissions.includes(p)
        );

        if (invalidPermissions.length > 0) {
          throw new AppError(
            'Permisos inválidos',
            400,
            ERROR_CODES.VALIDATION_ERROR,
            true,
            [`Permisos inválidos: ${invalidPermissions.join(', ')}`]
          );
        }
      }

      const role = await updateRole(roleId, updateData);

      const response: ApiResponse = {
        success: true,
        data: { role },
        message: 'Rol actualizado exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id/status',
  authenticate,
  requirePermission('roles.edit'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) {
        throw new AppError('ID de rol requerido', 400, ERROR_CODES.VALIDATION_ERROR);
      }
      const roleId = parseInt(req.params.id);

      if (isNaN(roleId)) {
        throw new AppError('ID de rol inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const role = await toggleRoleStatus(roleId);

      const response: ApiResponse = {
        success: true,
        data: { role },
        message: `Rol ${role.is_active ? 'activado' : 'desactivado'} exitosamente`
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('roles.delete'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) {
        throw new AppError('ID de rol requerido', 400, ERROR_CODES.VALIDATION_ERROR);
      }
      const roleId = parseInt(req.params.id);

      if (isNaN(roleId)) {
        throw new AppError('ID de rol inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      await deleteRole(roleId);

      const response: ApiResponse = {
        success: true,
        message: 'Rol eliminado exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;