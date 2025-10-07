import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { default as authRoutes, default as rolesRoutes } from './auth.routes.js';
import calendarRoutes from './calendar.routes.js';
import listsRoutes from './lists.routes.js';
import tasksRoutes from './tasks.routes.js';
import usersRoutes from './users.routes.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Demasiados intentos de autenticación, intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.use('/auth', authLimiter, authRoutes);
router.use('/users', apiLimiter, usersRoutes);
router.use('/roles', apiLimiter, rolesRoutes);
router.use('/tasks', apiLimiter, tasksRoutes);
router.use('/lists', apiLimiter, listsRoutes);
router.use('/calendar', apiLimiter, calendarRoutes);

export default router;