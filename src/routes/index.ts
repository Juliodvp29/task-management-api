// src/routes/index.ts
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { default as authRoutes, default as rolesRoutes } from './auth.routes.js';
import usersRoutes from './users.routes.js';

// Importar futuras rutas aquí
// import taskRoutes from './task.routes.js';
// import listRoutes from './list.routes.js';
// import userRoutes from './user.routes.js';
// import calendarRoutes from './calendar.routes.js';

const router = Router();

// Rate limiting específico para diferentes tipos de rutas
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 requests por IP para auth
  message: {
    success: false,
    message: 'Demasiados intentos de autenticación, intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP para API general
  message: {
    success: false,
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rutas de autenticación (con rate limiting más estricto)
router.use('/auth', authLimiter, authRoutes);



// Futuras rutas de la API (con rate limiting normal)
router.use('/users', apiLimiter, usersRoutes);
router.use('/roles', apiLimiter, rolesRoutes);



// router.use('/tasks', apiLimiter, taskRoutes);
// router.use('/lists', apiLimiter, listRoutes);
// router.use('/calendar', apiLimiter, calendarRoutes);

export default router;