import {
  type ErrorCode,
  DEFAULT_PUBLIC_MESSAGES,
} from "./taxonomy";
import { isAppError } from "./AppError";

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    requestId?: string;
    details?: Record<string, unknown>;
  };
}

export interface FormattedErrorResponse {
  status: number;
  headers: Record<string, string>;
  body: ErrorEnvelope;
}

/**
 * Formats any caught error into a safe, client-facing HTTP response envelope.
 * Strictly guarantees that internal details, stack traces, and database errors are not leaked.
 */
export function formatErrorResponse(
  error: unknown,
  requestId?: string
): FormattedErrorResponse {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
  };

  if (isAppError(error)) {
    if (error.retryAfter !== undefined) {
      headers["Retry-After"] = String(Math.max(1, Math.round(error.retryAfter)));
    }

    // For INTERNAL errors, ensure message is strictly the generic public message
    const publicMessage =
      error.code === "INTERNAL"
        ? DEFAULT_PUBLIC_MESSAGES.INTERNAL
        : error.message;

    return {
      status: error.httpStatus,
      headers,
      body: {
        error: {
          code: error.code,
          message: publicMessage,
          ...(requestId ? { requestId } : {}),
          ...(error.details ? { details: error.details } : {}),
        },
      },
    };
  }

  // Any non-AppError (e.g. unhandled TypeError, ReferenceError, Prisma error)
  // is coerced to a generic 500 INTERNAL error.
  return {
    status: 500,
    headers,
    body: {
      error: {
        code: "INTERNAL",
        message: DEFAULT_PUBLIC_MESSAGES.INTERNAL,
        ...(requestId ? { requestId } : {}),
      },
    },
  };
}
