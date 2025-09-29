// src/middleware/index.ts
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import rateLimit from 'express-rate-limit';
import { errorHandler } from './errorHandler.js';

// Configuración de CORS
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4200'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // límite muy alto para uso general
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting para health checks
    return req.path === '/health' || req.path === '/';
  }
});

// Configuración de helmet para seguridad
const helmetConfig = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
});

// Configuración de morgan para logging
const morganConfig = process.env.NODE_ENV === 'production'
  ? morgan('combined')
  : morgan('dev');

export const setupMiddlewares = (app: Application) => {
  // Trust proxy para obtener IP real (importante para rate limiting)
  app.set('trust proxy', 1);

  // Middleware de seguridad
  app.use(helmetConfig);

  // CORS
  app.use(cors(corsOptions));

  // Logging
  app.use(morganConfig);

  // Rate limiting global
  app.use(globalLimiter);

  // Body parsers
  app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      // Guardar el raw body para webhooks si es necesario
      (req as any).rawBody = buf;
    }
  }));

  app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
  }));

  // Middleware para parsear cookies si los necesitas
  // app.use(cookieParser());

  // Middleware personalizado para agregar información de request
  app.use((req, res, next) => {
    (req as any).requestId = Math.random().toString(36).substring(2, 15);
    res.setHeader('X-Request-ID', (req as any).requestId);
    next();
  });
};

export const setupErrorHandling = (app: Application) => {
  // Middleware para rutas no encontradas (debe ir antes del error handler)
  app.use(/.*/, (req, res) => {
    res.status(404).json({
      success: false,
      message: `Ruta ${req.method} ${req.originalUrl} no encontrada`,
      error: 'NOT_FOUND'
    });
  });

  // Error handler global (debe ir al final)
  app.use(errorHandler);
};