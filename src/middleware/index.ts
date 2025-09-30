import cors from 'cors';
import express, { type Application } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './errorHandler.js';

/**
 * CORS configuration for allowed origins, headers, and methods.
 */
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

/**
 * Global rate limiter to prevent abuse (max 1000 requests per 15 minutes per IP).
 * Excludes `/health` and `/` routes from rate limiting.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Too many requests from this IP'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/health' || req.path === '/';
  }
});

/**
 * Helmet configuration for security headers.
 * Includes CSP, CORP, and other protections.
 */
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

/**
 * Morgan configuration for logging HTTP requests.
 * Uses 'combined' format in production, 'dev' in development.
 */
const morganConfig = process.env.NODE_ENV === 'production'
  ? morgan('combined')
  : morgan('dev');

/**
 * Setup global middlewares for the Express app.
 * Includes helmet, CORS, logging, rate limiting, body parsers, and request IDs.
 */
export const setupMiddlewares = (app: Application) => {
  // Trust proxy (needed for correct IP detection when behind a proxy like Nginx)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmetConfig);

  // Cross-origin requests
  app.use(cors(corsOptions));

  // HTTP request logging
  app.use(morganConfig);

  // Rate limiting
  app.use(globalLimiter);

  // JSON parser with raw body capture
  app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      (req as any).rawBody = buf;
    }
  }));

  // URL-encoded form parser
  app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
  }));

  // Attach request ID to each request/response
  app.use((req, res, next) => {
    (req as any).requestId = Math.random().toString(36).substring(2, 15);
    res.setHeader('X-Request-ID', (req as any).requestId);
    next();
  });
};

/**
 * Setup error handling for the Express app.
 * Includes a fallback 404 handler and the global error handler.
 */
export const setupErrorHandling = (app: Application) => {
  // Handle unknown routes (404)
  app.use(/.*/, (req, res) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found`,
      error: 'NOT_FOUND'
    });
  });

  // Global error handler
  app.use(errorHandler);
};
