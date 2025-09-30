import type { NextFunction, Response } from 'express';
import { verifyAccessToken } from '../config/jwt.js';
import { getActiveSessionById, getUserById } from '../services/auth.service.js';
import type { AuthRequest } from '../types/auth/requests.js';
import type { JWTPayload } from '../types/auth/responses.js';
import { AppError } from '../types/base/error.js';
import { ERROR_CODES } from '../types/constants/errors.js';
import type { Permission } from '../types/constants/permissions.js';

/**
 * Middleware: Authenticate requests using JWT
 * - Validates Authorization header
 * - Verifies JWT
 * - Checks active session, user, role, and permissions
 * - Attaches user and session to request
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AppError('Authorization token required', 401, ERROR_CODES.TOKEN_INVALID);
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError('Invalid token format', 401, ERROR_CODES.TOKEN_INVALID);
    }

    const token = authHeader.substring(7);
    const payload: JWTPayload = verifyAccessToken(token);

    const session = await getActiveSessionById(payload.session_id);
    if (!session) {
      throw new AppError('Invalid or expired session', 401, ERROR_CODES.TOKEN_INVALID);
    }

    const user = await getUserById(payload.user_id);
    if (!user) {
      throw new AppError('User not found', 401, ERROR_CODES.TOKEN_INVALID);
    }

    if (!user.is_active) {
      throw new AppError('Account disabled', 401, ERROR_CODES.ACCOUNT_LOCKED);
    }

    if (!user.role.is_active) {
      throw new AppError('Role disabled', 401, ERROR_CODES.PERMISSION_DENIED);
    }

    // Fallback: assign permissions from payload if missing
    if (!user.role.permissions || user.role.permissions.length === 0) {
      user.role.permissions = payload.permissions ?? [];
    }

    req.user = user;
    req.session = session;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Require a specific permission
 */
export const requirePermission = (permission: Permission) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401, ERROR_CODES.TOKEN_INVALID);
      }

      const hasPermission =
        req.user.role.permissions.includes(permission) ||
        req.user.role.permissions.includes('*'); // Super-admin

      if (!hasPermission) {
        throw new AppError('Insufficient permissions', 403, ERROR_CODES.PERMISSION_DENIED);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Require at least one of multiple permissions
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401, ERROR_CODES.TOKEN_INVALID);
      }

      const hasAnyPermission =
        permissions.some(permission => req.user!.role.permissions.includes(permission)) ||
        req.user.role.permissions.includes('*');

      if (!hasAnyPermission) {
        throw new AppError('Insufficient permissions', 403, ERROR_CODES.PERMISSION_DENIED);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Require all specified permissions
 */
export const requireAllPermissions = (permissions: Permission[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401, ERROR_CODES.TOKEN_INVALID);
      }

      const hasAllPermissions =
        permissions.every(permission => req.user!.role.permissions.includes(permission)) ||
        req.user.role.permissions.includes('*');

      if (!hasAllPermissions) {
        throw new AppError('Insufficient permissions', 403, ERROR_CODES.PERMISSION_DENIED);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Require resource ownership OR admin rights
 */
export const requireOwnership = (getUserIdFromResource: (req: AuthRequest) => number | undefined) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401, ERROR_CODES.TOKEN_INVALID);
      }

      const resourceUserId = getUserIdFromResource(req);

      if (!resourceUserId) {
        throw new AppError('Resource not found', 404, ERROR_CODES.RESOURCE_NOT_FOUND);
      }

      const isOwner = req.user.id === resourceUserId;
      const hasAdminPermissions = req.user.role.permissions.includes('*');

      if (!isOwner && !hasAdminPermissions) {
        throw new AppError('Only the resource owner can access this resource', 403, ERROR_CODES.PERMISSION_DENIED);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Require specific role(s)
 */
export const requireRole = (roleNames: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401, ERROR_CODES.TOKEN_INVALID);
      }

      const hasRole = roleNames.includes(req.user.role.name);

      if (!hasRole) {
        throw new AppError('Insufficient role', 403, ERROR_CODES.PERMISSION_DENIED);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Optional authentication
 * - If a valid token exists, attach user/session
 * - Otherwise, continue without error
 */
export const optionalAuthenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
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
      // Ignore errors silently (guest mode)
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Rate limit requests for authenticated users
 * - Tracks requests per user within a time window
 * - Throws 429 if exceeded
 */
export const authenticatedRateLimit = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map<number, { count: number; resetTime: number }>();

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(); // Skip if user is not authenticated
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
      throw new AppError('Too many requests', 429, ERROR_CODES.RATE_LIMIT_EXCEEDED);
    }

    userLimit.count++;
    next();
  };
};
