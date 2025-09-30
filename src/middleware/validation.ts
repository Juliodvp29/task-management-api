import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../types/base/error.js';
import { ERROR_CODES } from '../types/constants/errors.js';
import type { FieldValidation, ValidatorConstraints } from '../types/utils/validation.js';

/**
 * Middleware to validate request body against given field constraints.
 * Throws an AppError if validation fails.
 */
export const validateRequest = (validation: FieldValidation) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: string[] = [];
      const data = req.body;

      // Iterate through validation rules and check each field
      for (const [fieldName, constraints] of Object.entries(validation)) {
        const value = data[fieldName];
        const fieldErrors = validateField(fieldName, value, constraints);
        errors.push(...fieldErrors);
      }

      // If there are validation errors, throw an AppError
      if (errors.length > 0) {
        throw new AppError(
          'Validation errors',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          true,
          errors
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validates a single field against its constraints.
 * Returns an array of error messages if validation fails.
 */
const validateField = (fieldName: string, value: any, constraints: ValidatorConstraints): string[] => {
  const errors: string[] = [];

  // Required field validation
  if (constraints.required && (value === undefined || value === null || value === '')) {
    errors.push(`The field '${fieldName}' is required`);
    return errors;
  }

  // Skip validation if value is empty and not required
  if (!constraints.required && (value === undefined || value === null || value === '')) {
    return errors;
  }

  // String constraints
  if (typeof value === 'string') {
    if (constraints.minLength && value.length < constraints.minLength) {
      errors.push(`The field '${fieldName}' must have at least ${constraints.minLength} characters`);
    }

    if (constraints.maxLength && value.length > constraints.maxLength) {
      errors.push(`The field '${fieldName}' cannot exceed ${constraints.maxLength} characters`);
    }

    if (constraints.pattern && !constraints.pattern.test(value)) {
      errors.push(`The field '${fieldName}' has an invalid format`);
    }
  }

  // Numeric constraints
  if (typeof value === 'number') {
    if (constraints.min !== undefined && value < constraints.min) {
      errors.push(`The field '${fieldName}' must be greater than or equal to ${constraints.min}`);
    }

    if (constraints.max !== undefined && value > constraints.max) {
      errors.push(`The field '${fieldName}' must be less than or equal to ${constraints.max}`);
    }
  }

  // Enum validation
  if (constraints.enum && !constraints.enum.includes(value)) {
    errors.push(`The field '${fieldName}' must be one of: ${constraints.enum.join(', ')}`);
  }

  // Custom validator
  if (constraints.custom) {
    const customResult = constraints.custom(value);
    if (customResult !== true) {
      errors.push(
        typeof customResult === 'string'
          ? customResult
          : `The field '${fieldName}' is invalid`
      );
    }
  }

  return errors;
};

/**
 * Validates if a given string is a properly formatted email.
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength based on multiple rules:
 * - Minimum 8 characters
 * - Maximum 128 characters
 * - At least one uppercase, one lowercase, one number, one special character
 */
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password cannot exceed 128 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Middleware to validate request parameters against given field constraints.
 */
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
        throw new AppError(
          'Invalid parameters',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          true,
          errors
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to validate query parameters against given field constraints.
 * Also converts numeric query values to numbers when applicable.
 */
export const validateQuery = (validation: FieldValidation) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: string[] = [];
      const data = req.query;

      for (const [fieldName, constraints] of Object.entries(validation)) {
        let value: any = data[fieldName];

        // Convert query string values to numbers if min/max constraints exist
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
        throw new AppError(
          'Invalid query parameters',
          400,
          ERROR_CODES.VALIDATION_ERROR,
          true,
          errors
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
