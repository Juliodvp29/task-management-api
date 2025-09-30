import express from 'express';
import { setupErrorHandling, setupMiddlewares } from './middleware/index.js';
import apiRoutes from './routes/index.js';
import type { ApiResponse } from './types/base/api.js';

const app = express();

setupMiddlewares(app);

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

app.get('/api', (req, res) => {
  const response: ApiResponse = {
    success: true,
    message: 'Task Management API',
    data: {
      version: process.env.API_VERSION || '1.0.0',
      documentation: '/api/docs',
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

app.use('/api', apiRoutes);

setupErrorHandling(app);

export default app;