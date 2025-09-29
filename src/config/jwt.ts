// src/config/jwt.ts
import type { SignOptions } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import type { JWTPayload } from '../types/auth/responses.js';
import { AppError } from '../types/base/error.js';
import { ERROR_CODES } from '../types/constants/errors.js';

export interface JWTConfig {
  secret: string;
  access_token_expires_in: string;
  refresh_token_expires_in: string;
  issuer: string;
  audience: string;
}

const jwtConfig: JWTConfig = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  access_token_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refresh_token_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  issuer: process.env.JWT_ISSUER || 'task-management-api',
  audience: process.env.JWT_AUDIENCE || 'task-management-app'
};

// Generar access token
export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(
    payload,
    jwtConfig.secret,
    {
      expiresIn: jwtConfig.access_token_expires_in,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    } as SignOptions
  );
};

// Generar refresh token
export const generateRefreshToken = (payload: Omit<JWTPayload, 'permissions'>): string => {
  return jwt.sign(
    payload,
    jwtConfig.secret,
    {
      expiresIn: jwtConfig.refresh_token_expires_in,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    } as SignOptions
  );
};

// Verificar access token
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const payload = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    }) as JWTPayload;

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token expirado', 401, ERROR_CODES.TOKEN_EXPIRED);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Token inválido', 401, ERROR_CODES.TOKEN_INVALID);
    }
    throw new AppError('Error verificando token', 401, ERROR_CODES.TOKEN_INVALID);
  }
};

// Verificar refresh token
export const verifyRefreshToken = (token: string): Omit<JWTPayload, 'permissions'> => {
  try {
    const payload = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    }) as Omit<JWTPayload, 'permissions'>;

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Refresh token expirado', 401, ERROR_CODES.REFRESH_TOKEN_INVALID);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Refresh token inválido', 401, ERROR_CODES.REFRESH_TOKEN_INVALID);
    }
    throw new AppError('Error verificando refresh token', 401, ERROR_CODES.REFRESH_TOKEN_INVALID);
  }
};

// Obtener tiempo de expiración en segundos
export const getAccessTokenExpirationTime = (): number => {
  const timeString = jwtConfig.access_token_expires_in;
  const unit = timeString.slice(-1);
  const value = parseInt(timeString.slice(0, -1));

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default: return 3600;
  }
};

export { jwtConfig };

