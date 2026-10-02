/**
 * MarketMind AI — Closed Error Taxonomy
 * Defined in doc/overview.md §4 and doc/backend.md §4.2.
 * 
 * Top-level error codes are strictly closed. Finer distinctions must go into
 * `details.rule` or `details.fields`, never new top-level error codes.
 */
export const ERROR_CODES = [
  "VALIDATION",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "UPSTREAM_UNAVAILABLE",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * Deterministic mapping of closed error codes to standard HTTP status codes.
 */
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UPSTREAM_UNAVAILABLE: 503,
  INTERNAL: 500,
};

/**
 * Safe, user-facing default messages that never leak internal details.
 */
export const DEFAULT_PUBLIC_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION: "The request input was invalid or failed domain rules.",
  UNAUTHENTICATED: "Authentication is required to perform this action.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  RATE_LIMITED: "Too many requests. Please try again later.",
  UPSTREAM_UNAVAILABLE: "An upstream dependency is temporarily unavailable.",
  INTERNAL: "An unexpected internal error occurred.",
};
