import {
  type ErrorCode,
  ERROR_STATUS_MAP,
  DEFAULT_PUBLIC_MESSAGES,
} from "./taxonomy";

export interface AppErrorOptions {
  message?: string;
  details?: Record<string, unknown>;
  retryAfter?: number;
  cause?: unknown;
}

/**
 * Base application error for all domain and service exceptions.
 * Only the edge wrapper formats this into user-facing HTTP responses.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;
  readonly retryAfter?: number;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    const publicMessage = options.message ?? DEFAULT_PUBLIC_MESSAGES[code];
    super(publicMessage);
    this.name = `AppError.${code}`;
    this.code = code;
    this.httpStatus = ERROR_STATUS_MAP[code];
    this.details = options.details;
    this.retryAfter = options.retryAfter;
    if (options.cause) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(
    message?: string,
    details?: {
      fields?: { path: string; issue: string }[];
      rule?: string;
      [key: string]: unknown;
    }
  ) {
    super("VALIDATION", { message, details });
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message?: string) {
    super("UNAUTHENTICATED", { message });
  }
}

export class ForbiddenError extends AppError {
  constructor(message?: string) {
    super("FORBIDDEN", { message });
  }
}

export class NotFoundError extends AppError {
  constructor(message?: string) {
    super("NOT_FOUND", { message });
  }
}

export class RateLimitedError extends AppError {
  constructor(retryAfterSeconds: number = 60, message?: string) {
    super("RATE_LIMITED", {
      message,
      retryAfter: retryAfterSeconds,
      details: { retryAfterSeconds },
    });
  }
}

export class UpstreamUnavailableError extends AppError {
  constructor(message?: string, cause?: unknown) {
    super("UPSTREAM_UNAVAILABLE", { message, cause });
  }
}

export class InternalError extends AppError {
  constructor(message?: string, cause?: unknown) {
    super("INTERNAL", { message, cause });
  }
}

/**
 * Type guard to check if an unknown value is an instance of AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
