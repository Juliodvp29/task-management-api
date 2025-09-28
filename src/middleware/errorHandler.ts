import type { ApiResponse } from '@/types/base/api.js';
import { AppError } from '@/types/base/error.js';
import type { NextFunction, Request, Response } from 'express';

export const errorHandler = (
  err: unknown,   // 👈 aquí ya no asumimos que es Error
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Si las headers ya fueron enviadas, delegar al default error handler de Express
  if (res.headersSent) {
    return next(err as any);
  }

  // Normalizar a algo que sepamos manejar
  let error: Error;
  if (err instanceof Error) {
    error = err;
  } else if (typeof err === 'object' && err !== null) {
    // objeto plano
    const anyErr = err as any;
    error = new AppError(
      anyErr.message || 'Error desconocido',
      anyErr.statusCode || 500,
      anyErr.code || 'INTERNAL_ERROR',
      false,
      anyErr
    );
  } else {
    // cadena, número, etc.
    error = new AppError(String(err), 500, 'INTERNAL_ERROR', false, err);
  }

  // Ahora sí podemos hacer console.error seguro
  console.error('Error caught by middleware:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // A partir de aquí tu lógica original:
  if (error instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      message: error.message,
      errors: error.details ? (Array.isArray(error.details) ? error.details : [error.details]) : undefined
    };

    return res.status(error.statusCode).json(response);
  }


  // Error de validación de Mongoose
  if (error.name === 'ValidationError') {
    const response: ApiResponse = {
      success: false,
      message: 'Error de validación',
      errors: [error.message]
    };

    return res.status(400).json(response);
  }

  // Error de cast de Mongoose (ObjectId inválido)
  if (error.name === 'CastError') {
    const response: ApiResponse = {
      success: false,
      message: 'ID inválido'
    };

    return res.status(400).json(response);
  }

  // Error de duplicado (MySQL)
  if (error.message.includes('ER_DUP_ENTRY')) {
    const response: ApiResponse = {
      success: false,
      message: 'Ya existe un registro con estos datos'
    };

    return res.status(409).json(response);
  }

  // Error de sintaxis JSON
  if (error instanceof SyntaxError && 'body' in error) {
    const response: ApiResponse = {
      success: false,
      message: 'JSON malformado'
    };

    return res.status(400).json(response);
  }

  // JWT Errors
  if (error.name === 'JsonWebTokenError') {
    const response: ApiResponse = {
      success: false,
      message: 'Token inválido'
    };

    return res.status(401).json(response);
  }

  if (error.name === 'TokenExpiredError') {
    const response: ApiResponse = {
      success: false,
      message: 'Token expirado'
    };

    return res.status(401).json(response);
  }

  // Error genérico del servidor
  const response: ApiResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  };

  return res.status(500).json(response);
};

// Middleware para capturar async errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};