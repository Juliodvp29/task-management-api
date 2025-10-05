import { addTaskComment, assignTask, completeTask, createTask, deleteTask, deleteTaskComment, getAllTasks, getTaskById, getTaskComments, moveTask, toggleTaskStatus, updateTask, updateTaskComment } from '@/services/tasks.service.js';
import { AuthRequest } from '@/types/auth/requests.js';
import { CreateTaskRequest, MoveTaskRequest, UpdateTaskRequest } from '@/types/task/requests.js';
import type { NextFunction, Response } from 'express';
import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateQuery, validateRequest } from '../middleware/validation.js';
import type { ApiResponse } from '../types/base/api.js';
import { AppError } from '../types/base/error.js';
import { ERROR_CODES } from '../types/constants/errors.js';
import { TaskPriority, TaskStatus } from '../types/enums/task.js';

const router = Router();

const createTaskValidation = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 200
  },
  description: {
    maxLength: 2000
  },
  priority: {
    enum: Object.values(TaskPriority)
  },
  list_id: {
    required: true,
    min: 1
  },
  assigned_to: {
    min: 1
  },
  estimated_hours: {
    min: 0
  }
};

const updateTaskValidation = {
  title: {
    minLength: 3,
    maxLength: 200
  },
  description: {
    maxLength: 2000
  },
  priority: {
    enum: Object.values(TaskPriority)
  },
  status: {
    enum: Object.values(TaskStatus)
  },
  list_id: {
    min: 1
  },
  assigned_to: {
    min: 1
  },
  position: {
    min: 0
  },
  estimated_hours: {
    min: 0
  },
  actual_hours: {
    min: 0
  }
};

const moveTaskValidation = {
  source_list_id: {
    required: true,
    min: 1
  },
  target_list_id: {
    required: true,
    min: 1
  },
  position: {
    required: true,
    min: 0
  }
};

const paginationValidation = {
  page: { min: 1 },
  limit: { min: 1, max: 100 }
};

const commentValidation = {
  content: {
    required: true,
    minLength: 1,
    maxLength: 2000
  }
};

router.get(
  '/',
  authenticate,
  requirePermission('tasks.view'),
  validateQuery(paginationValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filters: any = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'ASC' | 'DESC',
        list_id: req.query.list_id ? parseInt(req.query.list_id as string) : undefined,
        status: req.query.status as TaskStatus,
        priority: req.query.priority as TaskPriority,
        assigned_to: req.query.assigned_to ? parseInt(req.query.assigned_to as string) : undefined,
        created_by: req.query.created_by ? parseInt(req.query.created_by as string) : undefined,
        due_date_from: req.query.due_date_from ? new Date(req.query.due_date_from as string) : undefined,
        due_date_to: req.query.due_date_to ? new Date(req.query.due_date_to as string) : undefined,
        search: req.query.search as string,
        overdue: req.query.overdue === 'true',
        user_id: req.user?.id
      };

      const result = await getAllTasks(filters);

      const response: ApiResponse = {
        success: true,
        data: result.tasks,
        message: 'Tareas obtenidas exitosamente',
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


router.get(
  '/:id',
  authenticate,
  requirePermission('tasks.view'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const taskId = parseInt(req.params.id as string);

      if (isNaN(taskId)) {
        throw new AppError('ID de tarea inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const task = await getTaskById(taskId, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { task },
        message: 'Tarea obtenida exitosamente'
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
  requirePermission('tasks.create'),
  validateRequest(createTaskValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const taskData: CreateTaskRequest = req.body;

      if (!req.user?.id) {
        throw new AppError('Usuario no autenticado', 401, ERROR_CODES.TOKEN_INVALID);
      }

      const task = await createTask(taskData, req.user.id);

      const response: ApiResponse = {
        success: true,
        data: { task },
        message: 'Tarea creada exitosamente'
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
  requirePermission('tasks.edit'),
  validateRequest(updateTaskValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const taskId = parseInt(req.params.id as string);

      if (isNaN(taskId)) {
        throw new AppError('ID de tarea inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const updateData: UpdateTaskRequest = req.body;
      const task = await updateTask(taskId, updateData, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { task },
        message: 'Tarea actualizada exitosamente'
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
  requirePermission('tasks.edit'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const taskId = parseInt(req.params.id as string);

      if (isNaN(taskId)) {
        throw new AppError('ID de tarea inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const { status } = req.body;

      if (!status || !Object.values(TaskStatus).includes(status)) {
        throw new AppError('Estado de tarea inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const task = await toggleTaskStatus(taskId, status, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { task },
        message: `Estado de tarea actualizado a ${status}`
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.patch(
  '/:id/complete',
  authenticate,
  requirePermission('tasks.edit'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const taskId = parseInt(req.params.id as string);

      if (isNaN(taskId)) {
        throw new AppError('ID de tarea inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const task = await completeTask(taskId, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { task },
        message: 'Tarea completada exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.patch(
  '/:id/assign',
  authenticate,
  requirePermission('tasks.assign'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const taskId = parseInt(req.params.id as string);
      const { assigned_to } = req.body;

      if (isNaN(taskId)) {
        throw new AppError('ID de tarea inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      if (assigned_to !== null && (isNaN(assigned_to) || assigned_to < 1)) {
        throw new AppError('ID de usuario inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const task = await assignTask(taskId, assigned_to, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { task },
        message: assigned_to ? 'Tarea asignada exitosamente' : 'Asignación de tarea removida'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  '/:id/move',
  authenticate,
  requirePermission('tasks.edit'),
  validateRequest(moveTaskValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const taskId = parseInt(req.params.id as string);

      if (isNaN(taskId)) {
        throw new AppError('ID de tarea inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const moveData: MoveTaskRequest = req.body;
      const task = await moveTask(taskId, moveData, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { task },
        message: 'Tarea movida exitosamente'
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
  requirePermission('tasks.delete'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const taskId = parseInt(req.params.id as string);

      if (isNaN(taskId)) {
        throw new AppError('ID de tarea inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      await deleteTask(taskId, req.user?.id);

      const response: ApiResponse = {
        success: true,
        message: 'Tarea eliminada exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id/comments',
  authenticate,
  requirePermission('comments.view'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const taskId = parseInt(req.params.id as string);

      if (isNaN(taskId)) {
        throw new AppError('ID de tarea inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const comments = await getTaskComments(taskId, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { comments },
        message: 'Comentarios obtenidos exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  '/:id/comments',
  authenticate,
  requirePermission('comments.create'),
  validateRequest(commentValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const taskId = parseInt(req.params.id as string);

      if (isNaN(taskId)) {
        throw new AppError('ID de tarea inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      if (!req.user?.id) {
        throw new AppError('Usuario no autenticado', 401, ERROR_CODES.TOKEN_INVALID);
      }

      const { content } = req.body;
      const comment = await addTaskComment(taskId, req.user.id, content);

      const response: ApiResponse = {
        success: true,
        data: { comment },
        message: 'Comentario agregado exitosamente'
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.put(
  '/:taskId/comments/:commentId',
  authenticate,
  requirePermission('comments.edit'),
  validateRequest(commentValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const taskId = parseInt(req.params.taskId as string);
      const commentId = parseInt(req.params.commentId as string);

      if (isNaN(taskId) || isNaN(commentId)) {
        throw new AppError('ID inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const { content } = req.body;
      const comment = await updateTaskComment(commentId, taskId, req.user?.id, content);

      const response: ApiResponse = {
        success: true,
        data: { comment },
        message: 'Comentario actualizado exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.delete(
  '/:taskId/comments/:commentId',
  authenticate,
  requirePermission('comments.delete'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const taskId = parseInt(req.params.taskId as string);
      const commentId = parseInt(req.params.commentId as string);

      if (isNaN(taskId) || isNaN(commentId)) {
        throw new AppError('ID inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      await deleteTaskComment(commentId, taskId, req.user?.id);

      const response: ApiResponse = {
        success: true,
        message: 'Comentario eliminado exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;