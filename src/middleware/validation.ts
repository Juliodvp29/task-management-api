// src/middleware/validation.ts
import { AppError } from '@/types/base/error.js';
import { ERROR_CODES } from '@/types/constants/errors.js';
import type { FieldValidation, ValidatorConstraints } from '@/types/utils/validation.js';
import type { NextFunction, Request, Response } from 'express';

export const validateRequest = (validation: FieldValidation) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: string[] = [];
      const data = req.body;

      for (const [fieldName, constraints] of Object.entries(validation)) {
        const value = data[fieldName];
        const fieldErrors = validateField(fieldName, value, constraints);
        errors.push(...fieldErrors);
      }

      if (errors.length > 0) {
        throw new AppError('Errores de validación', 400, ERROR_CODES.VALIDATION_ERROR, true, errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

const validateField = (fieldName: string, value: any, constraints: ValidatorConstraints): string[] => {
  const errors: string[] = [];

  // Required validation
  if (constraints.required && (value === undefined || value === null || value === '')) {
    errors.push(`El campo '${fieldName}' es requerido`);
    return errors; // Si es requerido y está vacío, no validamos más
  }

  // Si no es requerido y está vacío, no validamos más
  if (!constraints.required && (value === undefined || value === null || value === '')) {
    return errors;
  }

  // String validations
  if (typeof value === 'string') {
    if (constraints.minLength && value.length < constraints.minLength) {
      errors.push(`El campo '${fieldName}' debe tener al menos ${constraints.minLength} caracteres`);
    }

    if (constraints.maxLength && value.length > constraints.maxLength) {
      errors.push(`El campo '${fieldName}' no puede tener más de ${constraints.maxLength} caracteres`);
    }

    if (constraints.pattern && !constraints.pattern.test(value)) {
      errors.push(`El campo '${fieldName}' no tiene un formato válido`);
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (constraints.min !== undefined && value < constraints.min) {
      errors.push(`El campo '${fieldName}' debe ser mayor o igual a ${constraints.min}`);
    }

    if (constraints.max !== undefined && value > constraints.max) {
      errors.push(`El campo '${fieldName}' debe ser menor o igual a ${constraints.max}`);
    }
  }

  // Enum validation
  if (constraints.enum && !constraints.enum.includes(value)) {
    errors.push(`El campo '${fieldName}' debe ser uno de: ${constraints.enum.join(', ')}`);
  }

  // Custom validation
  if (constraints.custom) {
    const customResult = constraints.custom(value);
    if (customResult !== true) {
      errors.push(typeof customResult === 'string' ? customResult : `El campo '${fieldName}' no es válido`);
    }
  }

  return errors;
};

// Validador específico para emails
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validador específico para contraseñas
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }

  if (password.length > 128) {
    errors.push('La contraseña no puede tener más de 128 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra mayúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra minúscula');
  }

  if (!/\d/.test(password)) {
    errors.push('La contraseña debe contener al menos un número');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
    errors.push('La contraseña debe contener al menos un carácter especial');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Middleware para validar parámetros de URL
export const validateParams = (validation: FieldValidation) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: string[] = [];
      const data = req.params;

      for (const [fieldName, constraints] of Object.entries(validation)) {
        const value = data[fieldName];
        const fieldErrors = validateField(fieldName, value, constraints);
        errors.push(...fieldErrors);
      }

      if (errors.length > 0) {
        throw new AppError('Parámetros inválidos', 400, ERROR_CODES.VALIDATION_ERROR, true, errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware para validar query parameters
export const validateQuery = (validation: FieldValidation) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: string[] = [];
      const data = req.query;

      for (const [fieldName, constraints] of Object.entries(validation)) {
        let value: any = data[fieldName];

        // Convertir string a número si es necesario
        if (value && typeof value === 'string' && (constraints.min !== undefined || constraints.max !== undefined)) {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            value = numValue;
          }
        }

        const fieldErrors = validateField(fieldName, value, constraints);
        errors.push(...fieldErrors);
      }

      if (errors.length > 0) {
        throw new AppError('Parámetros de consulta inválidos', 400, ERROR_CODES.VALIDATION_ERROR, true, errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};