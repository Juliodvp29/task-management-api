import type { NextFunction, Response } from 'express';
import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateQuery, validateRequest } from '../middleware/validation.js';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getAllCalendarEvents,
  getCalendarEventById,
  getEventsByDateRange,
  getHolidays,
  getUpcomingEvents,
  toggleEventStatus,
  updateCalendarEvent
} from '../services/calendar.service.js';
import { AuthRequest } from '../types/auth/requests.js';
import type { ApiResponse } from '../types/base/api.js';
import { AppError } from '../types/base/error.js';
import { CreateCalendarEventRequest, UpdateCalendarEventRequest } from '../types/calendar/requests.js';
import { ERROR_CODES } from '../types/constants/errors.js';
import { EventType } from '../types/enums/event.js';

const router = Router();


const createEventValidation = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 200
  },
  description: {
    maxLength: 2000
  },
  event_date: {
    required: true
  },
  event_type: {
    required: true,
    enum: Object.values(EventType)
  },
  color: {
    maxLength: 50
  }
};

const updateEventValidation = {
  title: {
    minLength: 3,
    maxLength: 200
  },
  description: {
    maxLength: 2000
  },
  event_type: {
    enum: Object.values(EventType)
  },
  color: {
    maxLength: 50
  }
};

const paginationValidation = {
  page: { min: 1 },
  limit: { min: 1, max: 100 }
};

const dateRangeValidation = {
  start_date: { required: true },
  end_date: { required: true }
};


router.get(
  '/events',
  authenticate,
  requirePermission('calendar.view'),
  validateQuery(paginationValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filters: any = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'ASC' | 'DESC',
        event_type: req.query.event_type as EventType,
        is_global: req.query.is_global === 'true' ? true : req.query.is_global === 'false' ? false : undefined,
        date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
        date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
        search: req.query.search as string,
        user_id: req.user?.id
      };

      const result = await getAllCalendarEvents(filters);

      const response: ApiResponse = {
        success: true,
        data: result.events,
        message: 'Eventos obtenidos exitosamente',
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
  '/events/range',
  authenticate,
  requirePermission('calendar.view'),
  validateQuery(dateRangeValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const startDate = new Date(req.query.start_date as string);
      const endDate = new Date(req.query.end_date as string);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new AppError('Fechas inválidas', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      if (startDate > endDate) {
        throw new AppError('La fecha de inicio debe ser menor a la fecha final', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const events = await getEventsByDateRange(
        startDate,
        endDate,
        req.user?.id
      );

      const response: ApiResponse = {
        success: true,
        data: { events },
        message: 'Eventos obtenidos exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.get(
  '/events/upcoming',
  authenticate,
  requirePermission('calendar.view'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      if (isNaN(days) || days < 1 || days > 365) {
        throw new AppError('Días debe ser un número entre 1 y 365', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const events = await getUpcomingEvents(days, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { events },
        message: 'Próximos eventos obtenidos exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.get(
  '/holidays',
  authenticate,
  requirePermission('calendar.view'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

      if (isNaN(year) || year < 2000 || year > 2100) {
        throw new AppError('Año inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const holidays = await getHolidays(year);

      const response: ApiResponse = {
        success: true,
        data: { holidays },
        message: 'Días festivos obtenidos exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.get(
  '/events/:id',
  authenticate,
  requirePermission('calendar.view'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const eventId = parseInt(req.params.id as string);

      if (isNaN(eventId)) {
        throw new AppError('ID de evento inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const event = await getCalendarEventById(eventId, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { event },
        message: 'Evento obtenido exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  '/events',
  authenticate,
  requirePermission('calendar.create'),
  validateRequest(createEventValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError('Usuario no autenticado', 401, ERROR_CODES.TOKEN_INVALID);
      }

      const eventData: CreateCalendarEventRequest = req.body;

      if (eventData.is_global) {
        const hasGlobalPermission = req.user.role.permissions.includes('calendar.global') ||
          req.user.role.permissions.includes('*');

        if (!hasGlobalPermission) {
          throw new AppError(
            'No tienes permisos para crear eventos globales',
            403,
            ERROR_CODES.PERMISSION_DENIED
          );
        }
      }

      const event = await createCalendarEvent(eventData, req.user.id);

      const response: ApiResponse = {
        success: true,
        data: { event },
        message: 'Evento creado exitosamente'
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.put(
  '/events/:id',
  authenticate,
  requirePermission('calendar.edit'),
  validateRequest(updateEventValidation),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const eventId = parseInt(req.params.id as string);

      if (isNaN(eventId)) {
        throw new AppError('ID de evento inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const updateData: UpdateCalendarEventRequest = req.body;


      if (updateData.is_global === true) {
        const hasGlobalPermission = req.user?.role.permissions.includes('calendar.global') ||
          req.user?.role.permissions.includes('*');

        if (!hasGlobalPermission) {
          throw new AppError(
            'No tienes permisos para crear eventos globales',
            403,
            ERROR_CODES.PERMISSION_DENIED
          );
        }
      }

      const event = await updateCalendarEvent(eventId, updateData, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { event },
        message: 'Evento actualizado exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.patch(
  '/events/:id/status',
  authenticate,
  requirePermission('calendar.edit'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const eventId = parseInt(req.params.id as string);

      if (isNaN(eventId)) {
        throw new AppError('ID de evento inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const event = await toggleEventStatus(eventId, req.user?.id);

      const response: ApiResponse = {
        success: true,
        data: { event },
        message: `Evento ${event.is_active ? 'activado' : 'desactivado'} exitosamente`
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);


router.delete(
  '/events/:id',
  authenticate,
  requirePermission('calendar.delete'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const eventId = parseInt(req.params.id as string);

      if (isNaN(eventId)) {
        throw new AppError('ID de evento inválido', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      await deleteCalendarEvent(eventId, req.user?.id);

      const response: ApiResponse = {
        success: true,
        message: 'Evento eliminado exitosamente'
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;