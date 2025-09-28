// src/services/auth.service.ts
import { insert, query, queryOne } from '@/config/database.js';
import { generateAccessToken, generateRefreshToken, getAccessTokenExpirationTime } from '@/config/jwt.js';
import type { LoginRequest, RegisterRequest } from '@auth/requests.js';
import type { JWTPayload, LoginResponse } from '@auth/responses.js';
import type { UserSession } from '@auth/session.js';
import type { Role, UserWithRole } from '@auth/user.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AppError } from '../types/base/error.js';
import { ERROR_CODES } from '../types/constants/errors.js';

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos

// Obtener usuario por ID con rol
export const getUserById = async (id: number): Promise<UserWithRole | null> => {
  const sql = `
    SELECT u.*, r.name as role_name, r.display_name as role_display_name, 
           r.permissions, r.is_active as role_is_active
    FROM users u
    INNER JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `;

  const user = await queryOne<any>(sql, [id]);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    profile_picture: user.profile_picture,
    role_id: user.role_id,
    is_active: user.is_active,
    is_email_verified: user.is_email_verified,
    last_login: user.last_login,
    login_attempts: user.login_attempts,
    locked_until: user.locked_until,
    created_at: user.created_at,
    updated_at: user.updated_at,
    role: {
      id: user.role_id,
      name: user.role_name,
      display_name: user.role_display_name,
      permissions: JSON.parse(user.permissions || '[]'),
      is_active: user.role_is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  };
};

// Obtener usuario por email con rol
export const getUserByEmail = async (email: string): Promise<UserWithRole | null> => {
  const sql = `
    SELECT u.*, r.name as role_name, r.display_name as role_display_name, 
           r.permissions, r.is_active as role_is_active
    FROM users u
    INNER JOIN roles r ON u.role_id = r.id
    WHERE u.email = ?
  `;

  const user = await queryOne<any>(sql, [email]);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    profile_picture: user.profile_picture,
    role_id: user.role_id,
    is_active: user.is_active,
    is_email_verified: user.is_email_verified,
    last_login: user.last_login,
    login_attempts: user.login_attempts,
    locked_until: user.locked_until,
    created_at: user.created_at,
    updated_at: user.updated_at,
    role: {
      id: user.role_id,
      name: user.role_name,
      display_name: user.role_display_name,
      permissions: JSON.parse(user.permissions || '[]'),
      is_active: user.role_is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  };
};

// Obtener sesión activa por ID
export const getActiveSessionById = async (sessionId: number): Promise<UserSession | null> => {
  const sql = `
    SELECT * FROM user_sessions 
    WHERE id = ? AND is_active = 1 AND expires_at > NOW()
  `;

  return await queryOne<UserSession>(sql, [sessionId]);
};

// Verificar si el usuario está bloqueado
const isUserLocked = (user: UserWithRole): boolean => {
  if (!user.locked_until) return false;
  return new Date(user.locked_until) > new Date();
};

// Bloquear usuario después de muchos intentos fallidos
const lockUser = async (userId: number): Promise<void> => {
  const lockedUntil = new Date(Date.now() + LOCKOUT_TIME);
  const sql = `
    UPDATE users 
    SET locked_until = ?, login_attempts = 0 
    WHERE id = ?
  `;

  await query(sql, [lockedUntil, userId]);
};

// Incrementar intentos de login
const incrementLoginAttempts = async (userId: number): Promise<number> => {
  const sql = `
    UPDATE users 
    SET login_attempts = login_attempts + 1 
    WHERE id = ?
  `;

  await query(sql, [userId]);

  const user = await getUserById(userId);
  return user?.login_attempts || 0;
};

// Resetear intentos de login
const resetLoginAttempts = async (userId: number): Promise<void> => {
  const sql = `
    UPDATE users 
    SET login_attempts = 0, locked_until = NULL, last_login = NOW() 
    WHERE id = ?
  `;

  await query(sql, [userId]);
};

// Crear sesión de usuario
const createUserSession = async (
  userId: number,
  deviceInfo?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ sessionId: number; sessionToken: string; refreshToken: string }> => {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const refreshTokenRaw = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

  const sql = `
    INSERT INTO user_sessions (user_id, session_token, refresh_token, device_info, ip_address, user_agent, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const sessionId = await insert(sql, [
    userId,
    sessionToken,
    refreshTokenRaw,
    deviceInfo,
    ipAddress,
    userAgent,
    expiresAt
  ]);

  return {
    sessionId,
    sessionToken,
    refreshToken: refreshTokenRaw
  };
};

// Registrar usuario
export const registerUser = async (data: RegisterRequest): Promise<UserWithRole> => {
  // Verificar si el email ya existe
  const existingUser = await getUserByEmail(data.email);
  if (existingUser) {
    throw new AppError('El email ya está registrado', 409, ERROR_CODES.DUPLICATE_ENTRY);
  }

  // Verificar que el rol existe y está activo
  const roleId = data.role_id || 4; // Rol por defecto: usuario
  const role = await queryOne<Role>('SELECT * FROM roles WHERE id = ? AND is_active = 1', [roleId]);

  if (!role) {
    throw new AppError('Rol no válido', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  // Crear usuario
  const sql = `
    INSERT INTO users (email, password, first_name, last_name, role_id)
    VALUES (?, ?, ?, ?, ?)
  `;

  const userId = await insert(sql, [
    data.email,
    hashedPassword,
    data.first_name,
    data.last_name,
    roleId
  ]);

  const user = await getUserById(userId);
  if (!user) {
    throw new AppError('Error creando usuario', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  return user;
};

// Iniciar sesión
export const loginUser = async (
  data: LoginRequest,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResponse> => {
  const user = await getUserByEmail(data.email);

  if (!user) {
    throw new AppError('Credenciales inválidas', 401, ERROR_CODES.INVALID_CREDENTIALS);
  }

  // Verificar si el usuario está bloqueado
  if (isUserLocked(user)) {
    throw new AppError('Cuenta bloqueada temporalmente', 423, ERROR_CODES.ACCOUNT_LOCKED);
  }

  // Verificar si el usuario está activo
  if (!user.is_active) {
    throw new AppError('Cuenta deshabilitada', 401, ERROR_CODES.ACCOUNT_LOCKED);
  }

  // Verificar la contraseña
  const userWithPassword = await queryOne<any>('SELECT password FROM users WHERE id = ?', [user.id]);
  const isValidPassword = await bcrypt.compare(data.password, userWithPassword.password);

  if (!isValidPassword) {
    const attempts = await incrementLoginAttempts(user.id);

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await lockUser(user.id);
      throw new AppError('Demasiados intentos fallidos. Cuenta bloqueada temporalmente', 423, ERROR_CODES.ACCOUNT_LOCKED);
    }

    throw new AppError('Credenciales inválidas', 401, ERROR_CODES.INVALID_CREDENTIALS);
  }

  // Resetear intentos de login y actualizar último login
  await resetLoginAttempts(user.id);

  // Crear sesión
  const session = await createUserSession(
    user.id,
    data.device_info,
    ipAddress,
    userAgent
  );

  // Generar tokens JWT
  const jwtPayload: JWTPayload = {
    user_id: user.id,
    email: user.email,
    role: user.role.name,
    permissions: user.role.permissions,
    session_id: session.sessionId
  };

  const accessToken = generateAccessToken(jwtPayload);
  const refreshToken = generateRefreshToken({
    user_id: user.id,
    email: user.email,
    role: user.role.name,
    session_id: session.sessionId
  });

  return {
    user,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: getAccessTokenExpirationTime()
  };
};

// Renovar token
export const refreshAccessToken = async (refreshToken: string): Promise<Omit<LoginResponse, 'user'>> => {
  // Buscar sesión por refresh token
  const session = await queryOne<UserSession>(
    'SELECT * FROM user_sessions WHERE refresh_token = ? AND is_active = 1 AND expires_at > NOW()',
    [refreshToken]
  );

  if (!session) {
    throw new AppError('Refresh token inválido', 401, ERROR_CODES.REFRESH_TOKEN_INVALID);
  }

  // Obtener usuario
  const user = await getUserById(session.user_id);
  if (!user || !user.is_active) {
    throw new AppError('Usuario no válido', 401, ERROR_CODES.TOKEN_INVALID);
  }

  // Generar nuevo access token
  const jwtPayload: JWTPayload = {
    user_id: user.id,
    email: user.email,
    role: user.role.name,
    permissions: user.role.permissions,
    session_id: session.id
  };

  const accessToken = generateAccessToken(jwtPayload);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: getAccessTokenExpirationTime()
  };
};

// Cerrar sesión
export const logoutUser = async (sessionId: number): Promise<void> => {
  const sql = 'UPDATE user_sessions SET is_active = 0 WHERE id = ?';
  await query(sql, [sessionId]);
};

// Cerrar todas las sesiones de un usuario
export const logoutAllSessions = async (userId: number): Promise<void> => {
  const sql = 'UPDATE user_sessions SET is_active = 0 WHERE user_id = ?';
  await query(sql, [userId]);
};