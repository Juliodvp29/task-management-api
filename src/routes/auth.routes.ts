// src/routes/auth.routes.ts
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { loginUser, logoutUser, refreshAccessToken, registerUser } from '../services/auth.service.js';
import type { AuthRequest, LoginRequest, RefreshTokenRequest, RegisterRequest } from '../types/auth/requests.js';
import type { ApiResponse } from '../types/base/api.js';
import { AppError } from '../types/base/error.js';
import { ERROR_CODES } from '../types/constants/errors.js';

const router = Router();

// Validaciones
const registerValidation = {
  email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, minLength: 8 },
  first_name: { required: true, minLength: 2, maxLength: 50 },
  last_name: { required: true, minLength: 2, maxLength: 50 },
  role_id: { min: 1 }
};

const loginValidation = {
  email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, minLength: 1 },
  device_info: { maxLength: 255 }
};

const refreshValidation = {
  refresh_token: { required: true }
};

// POST /auth/register - Registrar usuario
router.post('/register', validateRequest(registerValidation), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const registerData: RegisterRequest = req.body;

    const user = await registerUser(registerData);

    const response: ApiResponse = {
      success: true,
      data: { user },
      message: 'Usuario registrado exitosamente'
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// POST /auth/login - Iniciar sesión
router.post('/login', validateRequest(loginValidation), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loginData: LoginRequest = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const loginResponse = await loginUser(loginData, ipAddress, userAgent);

    const response: ApiResponse = {
      success: true,
      data: loginResponse,
      message: 'Inicio de sesión exitoso'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /auth/refresh - Renovar token
router.post('/refresh', validateRequest(refreshValidation), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refresh_token }: RefreshTokenRequest = req.body;

    const tokens = await refreshAccessToken(refresh_token);

    const response: ApiResponse = {
      success: true,
      data: tokens,
      message: 'Token renovado exitosamente'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /auth/logout - Cerrar sesión
router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.session) {
      throw new AppError('Sesión no encontrada', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    await logoutUser(req.session.id);

    const response: ApiResponse = {
      success: true,
      message: 'Sesión cerrada exitosamente'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /auth/me - Obtener información del usuario autenticado
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const response: ApiResponse = {
      success: true,
      data: { user: req.user },
      message: 'Información del usuario obtenida exitosamente'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /auth/verify-token - Verificar si el token es válido
router.post('/verify-token', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const response: ApiResponse = {
      success: true,
      data: {
        valid: true,
        user: req.user,
        expires_in: Math.floor(((req.session?.expires_at?.getTime() || 0) - Date.now()) / 1000)
      },
      message: 'Token válido'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;