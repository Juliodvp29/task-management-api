import type { NextFunction, Request, Response } from 'express';
import type { ApiResponse } from '../types/base/api.js';
import { AppError } from '../types/base/error.js';

/**
 * Global error handling middleware for Express.
 * It standardizes error responses and prevents the app from crashing on unhandled errors.
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If headers were already sent, delegate to the default Express handler
  if (res.headersSent) {
    return next(err as any);
  }

  let error: Error;

  // Normalize error into a standard Error or AppError object
  if (err instanceof Error) {
    error = err;
  } else if (typeof err === 'object' && err !== null) {
    const anyErr = err as any;
    error = new AppError(
      anyErr.message || 'Unknown error',
      anyErr.statusCode || 500,
      anyErr.code || 'INTERNAL_ERROR',
      false,
      anyErr
    );
  } else {
    // Handle primitive errors (string, number, etc.)
    error = new AppError(String(err), 500, 'INTERNAL_ERROR', false, err);
  }

  // Log error details for debugging
  console.error('Error caught by middleware:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle custom AppError
  if (error instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      message: error.message,
      errors: error.details ? (Array.isArray(error.details) ? error.details : [error.details]) : undefined
    };

    return res.status(error.statusCode).json(response);
  }

  // Handle Mongoose validation errors
  if (error.name === 'ValidationError') {
    const response: ApiResponse = {
      success: false,
      message: 'Validation error',
      errors: [error.message]
    };

    return res.status(400).json(response);
  }

  // Handle Mongoose cast errors (invalid IDs, etc.)
  if (error.name === 'CastError') {
    const response: ApiResponse = {
      success: false,
      message: 'Invalid ID'
    };

    return res.status(400).json(response);
  }

  // Handle MySQL duplicate entry error
  if (error.message.includes('ER_DUP_ENTRY')) {
    const response: ApiResponse = {
      success: false,
      message: 'A record with these values already exists'
    };

    return res.status(409).json(response);
  }

  // Handle malformed JSON errors from body-parser
  if (error instanceof SyntaxError && 'body' in error) {
    const response: ApiResponse = {
      success: false,
      message: 'Malformed JSON'
    };

    return res.status(400).json(response);
  }

  // Handle JWT invalid token error
  if (error.name === 'JsonWebTokenError') {
    const response: ApiResponse = {
      success: false,
      message: 'Invalid token'
    };

    return res.status(401).json(response);
  }

  // Handle JWT expired token error
  if (error.name === 'TokenExpiredError') {
    const response: ApiResponse = {
      success: false,
      message: 'Expired token'
    };

    return res.status(401).json(response);
  }

  // Default fallback for unhandled errors
  const response: ApiResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  };

  return res.status(500).json(response);
};

/**
 * Utility to wrap async route handlers and automatically catch errors.
 * Prevents the need to use try/catch in every controller.
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
