import type { NextFunction, Response } from 'express';
import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validatePassword, validateQuery, validateRequest } from '../middleware/validation.js';
import {
  changeUserPassword,
  createUser,
  deleteUser,
  deleteUserPermanently,
  getAllUsers,
  getUserByIdService,
  getUserSettings,
  toggleUserStatus,
  updateUser,
  updateUserSettings
} from '../services/users.service.js';
import type { AuthRequest, CreateUserRequest, UpdateUserRequest, UpdateUserSettingsRequest } from '../types/auth/requests.js';
import type { ApiResponse } from '../types/base/api.js';
import { AppError } from '../types/base/error.js';
import { ERROR_CODES } from '../types/constants/errors.js';

const router = Router();

// Validaciones
const createUserValidation = {
  email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, minLength: 8 },
  first_name: { required: true, minLength: 2, maxLength: 100 },
  last_name: { required: true, minLength: 2, maxLength: 100 },
  role_id: { required: true, min: 1 }
};

const updateUserValidation = {
  first_name: { minLength: 2, maxLength: 100 },
  last_name: { minLength: 2, maxLength: 100 },
  role_id: { min: 1 }
};

const changePasswordValidation = {
  new_password: { required: true, minLength: 8 }
};

const paginationValidation = {
  page: { min: 1 },
  limit: { min: 1, max: 100 }
};

// GET /users - Obtener todos los usuarios (con paginación)
router.get(
  '/',
  authenticate,
  requirePermission('users.view'),
  validateQuery(paginationValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filters: any = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'ASC' | 'DESC',
        role_id: req.query.role_id ? parseInt(req.query.role_id as string) : undefined,
        is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
        search: req.query.search as string
      };

      const result = await getAllUsers(filters);

      const response: ApiResponse = {
        success: true,
        data: result.users,
        message: 'Usuarios obtenidos exitosamente',
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: result.pages
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /users/:id - Obtener usuario por ID
router.get(
  '/:id',
  authenticate,
  requirePermission('users.view'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {

      const userId = parseInt(req.params.id as string);

      if (isNaN(userId)) {
        throw new AppError('ID de usuario inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const user = await getUserByIdService(userId);

      const response: ApiResponse = {
        success: true,
        data: { user },
        message: 'Usuario obtenido exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// POST /users - Crear usuario
router.post(
  '/',
  authenticate,
  requirePermission('users.create'),
  validateRequest(createUserValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userData: CreateUserRequest = req.body;

      // Validar contraseña
      const passwordValidation = validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        throw new AppError(
          'Contraseña no válida',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          true,
          passwordValidation.errors
        );
      }

      const user = await createUser(userData);

      const response: ApiResponse = {
        success: true,
        data: { user },
        message: 'Usuario creado exitosamente'
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /users/:id - Actualizar usuario
router.put(
  '/:id',
  authenticate,
  requirePermission('users.edit'),
  validateRequest(updateUserValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.id as string);

      if (isNaN(userId)) {
        throw new AppError('ID de usuario inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const updateData: UpdateUserRequest = req.body;
      const user = await updateUser(userId, updateData);

      const response: ApiResponse = {
        success: true,
        data: { user },
        message: 'Usuario actualizado exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /users/:id/status - Activar/Desactivar usuario
router.patch(
  '/:id/status',
  authenticate,
  requirePermission('users.edit'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.id as string);

      if (isNaN(userId)) {
        throw new AppError('ID de usuario inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const user = await toggleUserStatus(userId);

      const response: ApiResponse = {
        success: true,
        data: { user },
        message: `Usuario ${user.is_active ? 'activado' : 'desactivado'} exitosamente`
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /users/:id - Eliminar usuario (soft delete)
router.delete(
  '/:id',
  authenticate,
  requirePermission('users.delete'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.id as string);

      if (isNaN(userId)) {
        throw new AppError('ID de usuario inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // No permitir que un usuario se elimine a sí mismo
      if (req.user?.id === userId) {
        throw new AppError(
          'No puedes eliminarte a ti mismo',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      await deleteUser(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Usuario eliminado exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /users/:id/permanent - Eliminar usuario permanentemente
router.delete(
  '/:id/permanent',
  authenticate,
  requirePermission('users.delete'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.id as string);

      if (isNaN(userId)) {
        throw new AppError('ID de usuario inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // No permitir que un usuario se elimine a sí mismo
      if (req.user?.id === userId) {
        throw new AppError(
          'No puedes eliminarte a ti mismo',
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      await deleteUserPermanently(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Usuario eliminado permanentemente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /users/:id/password - Cambiar contraseña de usuario
router.put(
  '/:id/password',
  authenticate,
  requirePermission('users.edit'),
  validateRequest(changePasswordValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.id as string);

      if (isNaN(userId)) {
        throw new AppError('ID de usuario inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const { new_password } = req.body;

      // Validar contraseña
      const passwordValidation = validatePassword(new_password);
      if (!passwordValidation.isValid) {
        throw new AppError(
          'Contraseña no válida',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          true,
          passwordValidation.errors
        );
      }

      await changeUserPassword(userId, new_password);

      const response: ApiResponse = {
        success: true,
        message: 'Contraseña cambiada exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /users/:id/settings - Obtener configuraciones de usuario
router.get(
  '/:id/settings',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.id as string);

      if (isNaN(userId)) {
        throw new AppError('ID de usuario inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // Solo el propio usuario o admins pueden ver las configuraciones
      if (req.user?.id !== userId && !req.user?.role.permissions.includes('users.view')) {
        throw new AppError('No tienes permisos para ver estas configuraciones', 403, ERROR_CODES.PERMISSION_DENIED);
      }

      const settings = await getUserSettings(userId);

      const response: ApiResponse = {
        success: true,
        data: { settings },
        message: 'Configuraciones obtenidas exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /users/:id/settings - Actualizar configuraciones de usuario
router.put(
  '/:id/settings',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.id as string);

      if (isNaN(userId)) {
        throw new AppError('ID de usuario inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // Solo el propio usuario o admins pueden actualizar las configuraciones
      if (req.user?.id !== userId && !req.user?.role.permissions.includes('users.edit')) {
        throw new AppError('No tienes permisos para modificar estas configuraciones', 403, ERROR_CODES.PERMISSION_DENIED);
      }

      const settingsData: UpdateUserSettingsRequest = req.body;
      const settings = await updateUserSettings(userId, settingsData);

      const response: ApiResponse = {
        success: true,
        data: { settings },
        message: 'Configuraciones actualizadas exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;