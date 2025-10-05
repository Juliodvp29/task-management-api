import { AuthRequest } from '@/types/auth/requests.js';
import { CreateTaskListRequest, UpdateTaskListRequest } from '@/types/task/requests.js';
import type { NextFunction, Response } from 'express';
import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  createTaskList,
  deleteTaskList,
  getAllTaskLists,
  getTaskListById,
  getTaskListWithTasks,
  reorderTaskLists,
  toggleTaskListStatus,
  updateTaskList
} from '../services/lists.service.js';
import type { ApiResponse } from '../types/base/api.js';
import { AppError } from '../types/base/error.js';
import { ERROR_CODES } from '../types/constants/errors.js';

const router = Router();

const createListValidation = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  description: {
    maxLength: 500
  },
  color: {
    maxLength: 50
  },
  position: {
    min: 0
  }
};

const updateListValidation = {
  name: {
    minLength: 2,
    maxLength: 100
  },
  description: {
    maxLength: 500
  },
  color: {
    maxLength: 50
  },
  position: {
    min: 0
  }
};

const reorderValidation = {
  lists: {
    required: true
  }
};

router.get(
  '/',
  authenticate,
  requirePermission('lists.view'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError('Usuario no autenticado', 401, ERROR_CODES.TOKEN_INVALID);
      }

      const includeInactive = req.query.include_inactive === 'true';
      const includeTasks = req.query.include_tasks === 'true';

      const lists = await getAllTaskLists(req.user.id, includeInactive, includeTasks);

      const response: ApiResponse = {
        success: true,
        data: { lists },
        message: 'Listas obtenidas exitosamente'
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
  requirePermission('lists.view'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const listId = parseInt(req.params.id as string);

      if (isNaN(listId)) {
        throw new AppError('ID de lista inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const list = await getTaskListById(listId, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { list },
        message: 'Lista obtenida exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.get(
  '/:id/tasks',
  authenticate,
  requirePermission('lists.view'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const listId = parseInt(req.params.id as string);

      if (isNaN(listId)) {
        throw new AppError('ID de lista inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const list = await getTaskListWithTasks(listId, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { list },
        message: 'Lista con tareas obtenida exitosamente'
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
  requirePermission('lists.create'),
  validateRequest(createListValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError('Usuario no autenticado', 401, ERROR_CODES.TOKEN_INVALID);
      }

      const listData: CreateTaskListRequest = req.body;
      const list = await createTaskList(listData, req.user.id);

      const response: ApiResponse = {
        success: true,
        data: { list },
        message: 'Lista creada exitosamente'
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
  requirePermission('lists.edit'),
  validateRequest(updateListValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const listId = parseInt(req.params.id as string);

      if (isNaN(listId)) {
        throw new AppError('ID de lista inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const updateData: UpdateTaskListRequest = req.body;
      const list = await updateTaskList(listId, updateData, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { list },
        message: 'Lista actualizada exitosamente'
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
  requirePermission('lists.edit'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const listId = parseInt(req.params.id as string);

      if (isNaN(listId)) {
        throw new AppError('ID de lista inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const list = await toggleTaskListStatus(listId, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { list },
        message: `Lista ${list.is_active ? 'activada' : 'desactivada'} exitosamente`
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  '/reorder',
  authenticate,
  requirePermission('lists.edit'),
  validateRequest(reorderValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError('Usuario no autenticado', 401, ERROR_CODES.TOKEN_INVALID);
      }

      const { lists } = req.body;

      if (!Array.isArray(lists)) {
        throw new AppError('El campo lists debe ser un array', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      await reorderTaskLists(lists, req.user.id);

      const response: ApiResponse = {
        success: true,
        message: 'Listas reordenadas exitosamente'
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
  requirePermission('lists.delete'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const listId = parseInt(req.params.id as string);

      if (isNaN(listId)) {
        throw new AppError('ID de lista inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      await deleteTaskList(listId, req.user?.id);

      const response: ApiResponse = {
        success: true,
        message: 'Lista eliminada exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;