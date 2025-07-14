import { NextResponse } from 'next/server';
import { PostgrestError } from '@supabase/supabase-js';

// Custom Error Classes
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR', { field });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: PostgrestError) {
    super(message, 500, 'DATABASE_ERROR', originalError);
  }
}

// Error Response Interface
interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
  path?: string;
}

// Error Handler Class
export class ApiErrorHandler {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Handle and format errors for API responses
   */
  static handleError(error: unknown, request?: Request): NextResponse {
    const timestamp = new Date().toISOString();
    const path = request?.url || 'unknown';

    // Log error for debugging
    this.logError(error, { path, timestamp });

    // Handle different error types
    if (error instanceof AppError) {
      return this.createErrorResponse(
        error.message,
        error.statusCode,
        error.code,
        error.details,
        timestamp,
        path
      );
    }

    // Handle Supabase/Postgres errors
    if (this.isPostgrestError(error)) {
      return this.handlePostgrestError(error, timestamp, path);
    }

    // Handle validation errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return this.createErrorResponse(
        'Invalid JSON in request body',
        400,
        'INVALID_JSON',
        undefined,
        timestamp,
        path
      );
    }

    // Handle generic errors
    if (error instanceof Error) {
      return this.createErrorResponse(
        this.isDevelopment ? error.message : 'Internal server error',
        500,
        'INTERNAL_ERROR',
        this.isDevelopment ? { stack: error.stack } : undefined,
        timestamp,
        path
      );
    }

    // Fallback for unknown errors
    return this.createErrorResponse(
      'An unexpected error occurred',
      500,
      'UNKNOWN_ERROR',
      undefined,
      timestamp,
      path
    );
  }

  /**
   * Create standardized error response
   */
  private static createErrorResponse(
    message: string,
    statusCode: number,
    code?: string,
    details?: any,
    timestamp?: string,
    path?: string
  ): NextResponse {
    const errorResponse: ErrorResponse = {
      error: message,
      timestamp: timestamp || new Date().toISOString(),
    };

    if (code) errorResponse.code = code;
    if (details) errorResponse.details = details;
    if (path && this.isDevelopment) errorResponse.path = path;

    return NextResponse.json(errorResponse, {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Handle Supabase/Postgres specific errors
   */
  private static handlePostgrestError(
    error: PostgrestError,
    timestamp: string,
    path: string
  ): NextResponse {
    const { code, message, details } = error;

    // Map common Postgres error codes to user-friendly messages
    const errorMap: Record<string, { message: string; statusCode: number }> = {
      '23505': { message: 'Resource already exists', statusCode: 409 }, // unique_violation
      '23503': { message: 'Referenced resource not found', statusCode: 400 }, // foreign_key_violation
      '23502': { message: 'Required field is missing', statusCode: 400 }, // not_null_violation
      '23514': { message: 'Invalid data provided', statusCode: 400 }, // check_violation
      '42P01': { message: 'Database table not found', statusCode: 500 }, // undefined_table
      '42703': { message: 'Database column not found', statusCode: 500 }, // undefined_column
      'PGRST116': { message: 'Resource not found', statusCode: 404 }, // row not found
    };

    const errorInfo = errorMap[code] || { 
      message: this.isDevelopment ? message : 'Database error', 
      statusCode: 500 
    };

    return this.createErrorResponse(
      errorInfo.message,
      errorInfo.statusCode,
      `DB_${code}`,
      this.isDevelopment ? { originalMessage: message, details } : undefined,
      timestamp,
      path
    );
  }

  /**
   * Check if error is a Supabase/Postgres error
   */
  private static isPostgrestError(error: any): error is PostgrestError {
    return error && typeof error === 'object' && 'code' in error && 'message' in error;
  }

  /**
   * Log errors for debugging and monitoring
   */
  private static logError(error: unknown, context?: { path?: string; timestamp?: string }) {
    const errorInfo = {
      timestamp: context?.timestamp || new Date().toISOString(),
      path: context?.path || 'unknown',
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };

    // In development, log to console
    if (this.isDevelopment) {
      console.error('API Error:', errorInfo);
    } else {
      // In production, you might want to send to a logging service
      // This is where you'd integrate with services like Sentry, LogRocket, etc.
      console.error('API Error:', {
        timestamp: errorInfo.timestamp,
        path: errorInfo.path,
        message: errorInfo.error instanceof Error ? errorInfo.error.message : 'Unknown error',
      });
    }
  }
}

// Utility Functions
export const handleApiError = (error: unknown, request?: Request) => {
  return ApiErrorHandler.handleError(error, request);
};

/**
 * Async wrapper for API route handlers with error handling
 */
export const withErrorHandler = <T extends any[], R>(
  handler: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Extract request object from args if available
      const request = args.find(arg => arg instanceof Request) as Request | undefined;
      return handleApiError(error, request);
    }
  };
};

/**
 * Validation helper functions
 */
export const validateRequired = (value: any, fieldName: string): void => {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
};

export const validateEmail = (email: string): void => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email');
  }
};

export const validatePackType = (packType: string): void => {
  if (!['humanoid', 'weapon'].includes(packType)) {
    throw new ValidationError('Invalid pack type. Must be "humanoid" or "weapon"', 'packType');
  }
};

export const validateNumberRange = (
  value: number,
  min: number,
  max: number,
  fieldName: string
): void => {
  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      fieldName
    );
  }
};

/**
 * Auth helper functions
 */
export const requireAuth = (session: any): void => {
  if (!session?.user) {
    throw new AuthError('Authentication required');
  }
};

export const requireUser = (user: any): void => {
  if (!user) {
    throw new AuthError('User authentication required');
  }
};

// Rate limiting helper (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): void => {
  const now = Date.now();
  const key = identifier;
  
  const current = rateLimitMap.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return;
  }
  
  if (current.count >= maxRequests) {
    throw new AppError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
  }
  
  current.count++;
}; 