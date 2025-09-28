// src/middleware/auth.ts
import { verifyAccessToken } from '@/config/jwt.js';
import { getActiveSessionById, getUserById } from '@/services/auth.service.js';
import { AppError } from '@/types/base/error.js';
import { ERROR_CODES } from '@/types/constants/errors.js';
import type { AuthRequest } from '@auth/requests.js';
import type { JWTPayload } from '@auth/responses.js';
import type { Permission } from '@constants/permissions.js';
import type { NextFunction, Response } from 'express';

// Middleware principal de autenticación
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AppError('Token de autorización requerido', 401, ERROR_CODES.TOKEN_INVALID);
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError('Formato de token inválido', 401, ERROR_CODES.TOKEN_INVALID);
    }

    const token = authHeader.substring(7); // Remover 'Bearer '

    // Verificar el token JWT
    const payload: JWTPayload = verifyAccessToken(token);

    // Verificar que la sesión existe y está activa
    const session = await getActiveSessionById(payload.session_id);
    if (!session) {
      throw new AppError('Sesión inválida o expirada', 401, ERROR_CODES.TOKEN_INVALID);
    }

    // Obtener datos completos del usuario
    const user = await getUserById(payload.user_id);
    if (!user) {
      throw new AppError('Usuario no encontrado', 401, ERROR_CODES.TOKEN_INVALID);
    }

    // Verificar que el usuario esté activo
    if (!user.is_active) {
      throw new AppError('Cuenta deshabilitada', 401, ERROR_CODES.ACCOUNT_LOCKED);
    }

    // Verificar que el rol esté activo
    if (!user.role.is_active) {
      throw new AppError('Rol deshabilitado', 401, ERROR_CODES.PERMISSION_DENIED);
    }

    // Agregar usuario y sesión al request
    req.user = user;
    req.session = session;

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware para verificar permisos específicos
export const requirePermission = (permission: Permission) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Usuario no autenticado', 401, ERROR_CODES.TOKEN_INVALID);
      }

      // Verificar si el usuario tiene el permiso específico o todos los permisos (*)
      const hasPermission = req.user.role.permissions.includes(permission) ||
        req.user.role.permissions.includes('*');

      if (!hasPermission) {
        throw new AppError('Permisos insuficientes', 403, ERROR_CODES.PERMISSION_DENIED);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware para verificar múltiples permisos (cualquiera de ellos)
export const requireAnyPermission = (permissions: Permission[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Usuario no autenticado', 401, ERROR_CODES.TOKEN_INVALID);
      }

      // Verificar si el usuario tiene alguno de los permisos o todos los permisos (*)
      const hasAnyPermission = permissions.some(permission =>
        req.user!.role.permissions.includes(permission)
      ) || req.user.role.permissions.includes('*');

      if (!hasAnyPermission) {
        throw new AppError('Permisos insuficientes', 403, ERROR_CODES.PERMISSION_DENIED);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware para verificar múltiples permisos (todos requeridos)
export const requireAllPermissions = (permissions: Permission[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Usuario no autenticado', 401, ERROR_CODES.TOKEN_INVALID);
      }

      // Verificar si el usuario tiene todos los permisos o todos los permisos (*)
      const hasAllPermissions = permissions.every(permission =>
        req.user!.role.permissions.includes(permission)
      ) || req.user.role.permissions.includes('*');

      if (!hasAllPermissions) {
        throw new AppError('Permisos insuficientes', 403, ERROR_CODES.PERMISSION_DENIED);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware para verificar que el usuario es propietario del recurso
export const requireOwnership = (getUserIdFromResource: (req: AuthRequest) => number | undefined) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Usuario no autenticado', 401, ERROR_CODES.TOKEN_INVALID);
      }

      const resourceUserId = getUserIdFromResource(req);

      if (!resourceUserId) {
        throw new AppError('Recurso no encontrado', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      // Permitir acceso si es el propietario o tiene permisos administrativos
      const isOwner = req.user.id === resourceUserId;
      const hasAdminPermissions = req.user.role.permissions.includes('*');

      if (!isOwner && !hasAdminPermissions) {
        throw new AppError('Solo el propietario puede acceder a este recurso', 403, ERROR_CODES.PERMISSION_DENIED);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware para verificar roles específicos
export const requireRole = (roleNames: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Usuario no autenticado', 401, ERROR_CODES.TOKEN_INVALID);
      }

      const hasRole = roleNames.includes(req.user.role.name);

      if (!hasRole) {
        throw new AppError('Rol insuficiente', 403, ERROR_CODES.PERMISSION_DENIED);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware opcional de autenticación (no falla si no hay token)
export const optionalAuthenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continúa sin usuario autenticado
    }

    const token = authHeader.substring(7);

    try {
      const payload: JWTPayload = verifyAccessToken(token);
      const session = await getActiveSessionById(payload.session_id);

      if (session) {
        const user = await getUserById(payload.user_id);
        if (user && user.is_active && user.role.is_active) {
          req.user = user;
          req.session = session;
        }
      }
    } catch (error) {
      // Ignorar errores de token en autenticación opcional
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware para rate limiting por usuario autenticado
export const authenticatedRateLimit = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map<number, { count: number; resetTime: number }>();

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(); // Si no está autenticado, no aplicar rate limit
    }

    const userId = req.user.id;
    const now = Date.now();
    const userLimit = userRequests.get(userId);

    if (!userLimit) {
      userRequests.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (now > userLimit.resetTime) {
      userRequests.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      throw new AppError('Demasiadas solicitudes', 429, ERROR_CODES.RATE_LIMIT_EXCEEDED);
    }

    userLimit.count++;
    next();
  };
};