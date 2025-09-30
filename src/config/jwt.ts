import type { SignOptions } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import type { JWTPayload } from '../types/auth/responses.js';
import { AppError } from '../types/base/error.js';
import { ERROR_CODES } from '../types/constants/errors.js';

// JWT configuration interface
export interface JWTConfig {
  secret: string;                   // Secret key for signing/verifying tokens
  access_token_expires_in: string;  // Access token expiration time (e.g., "15m")
  refresh_token_expires_in: string; // Refresh token expiration time (e.g., "7d")
  issuer: string;                   // Token issuer (iss claim)
  audience: string;                 // Token audience (aud claim)
}

// Load JWT configuration from environment variables or fallback defaults
const jwtConfig: JWTConfig = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  access_token_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refresh_token_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  issuer: process.env.JWT_ISSUER || 'task-management-api',
  audience: process.env.JWT_AUDIENCE || 'task-management-app'
};

// Generate a short-lived access token (contains permissions)
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

// Generate a long-lived refresh token (does not include permissions)
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

// Verify and decode an access token
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const payload = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    }) as JWTPayload;

    return payload;
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token expired', 401, ERROR_CODES.TOKEN_EXPIRED);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', 401, ERROR_CODES.TOKEN_INVALID);
    }
    throw new AppError('Error verifying token', 401, ERROR_CODES.TOKEN_INVALID);
  }
};

// Verify and decode a refresh token (permissions are excluded)
export const verifyRefreshToken = (token: string): Omit<JWTPayload, 'permissions'> => {
  try {
    const payload = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    }) as Omit<JWTPayload, 'permissions'>;

    return payload;
  } catch (error) {
    // Handle specific JWT errors for refresh tokens
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Refresh token expired', 401, ERROR_CODES.REFRESH_TOKEN_INVALID);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid refresh token', 401, ERROR_CODES.REFRESH_TOKEN_INVALID);
    }
    throw new AppError('Error verifying refresh token', 401, ERROR_CODES.REFRESH_TOKEN_INVALID);
  }
};

// Convert the configured access token expiration string into seconds
export const getAccessTokenExpirationTime = (): number => {
  const timeString = jwtConfig.access_token_expires_in;
  const unit = timeString.slice(-1);       // Last character defines the unit (s, m, h, d)
  const value = parseInt(timeString.slice(0, -1)); // Numeric part

  switch (unit) {
    case 's': return value;                    // seconds
    case 'm': return value * 60;               // minutes
    case 'h': return value * 60 * 60;          // hours
    case 'd': return value * 24 * 60 * 60;     // days
    default: return 3600;                      // fallback: 1 hour
  }
};

// Export configuration for external usage
export { jwtConfig };

