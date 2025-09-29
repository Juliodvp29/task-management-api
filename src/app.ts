// src/app.ts
import express from 'express';
import { setupErrorHandling, setupMiddlewares } from './middleware/index.js';
import apiRoutes from './routes/index.js';
import type { ApiResponse } from './types/base/api.js';

const app = express();

// Configurar middlewares
setupMiddlewares(app);

// Ruta principal de health check
app.get('/', (req, res) => {
  const response: ApiResponse = {
    success: true,
    message: 'Task Management API está funcionando correctamente',
    data: {
      service: 'Task Management API',
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      status: 'healthy'
    }
  };
  res.json(response);
});

// Ruta específica para health checks (para monitoreo/load balancers)
app.get('/health', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      environment: process.env.NODE_ENV || 'development'
    }
  };
  res.json(response);
});

// Ruta para información de la API
app.get('/api', (req, res) => {
  const response: ApiResponse = {
    success: true,
    message: 'Task Management API',
    data: {
      version: process.env.API_VERSION || '1.0.0',
      documentation: '/api/docs', // Para cuando agregues documentación
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        roles: '/api/roles'
        // tasks: '/api/tasks',
        // lists: '/api/lists',
        // calendar: '/api/calendar'
      }
    }
  };
  res.json(response);
});

// Todas las rutas de la API
app.use('/api', apiRoutes);

// Configurar manejo de errores (debe ir al final)
setupErrorHandling(app);

export default app;