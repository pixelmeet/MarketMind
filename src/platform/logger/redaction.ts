/**
 * MarketMind AI — Logger Redaction Engine
 * Defined in doc/security.md SEC-SEC-05 and doc/backend.md §9.1.
 * 
 * Guarantees that secrets, tokens, sessions, passwords, and credentials
 * are never written to logs or audit metadata.
 */

export const REDACTED_PLACEHOLDER = "[REDACTED]";

// Sensitive key patterns (case-insensitive)
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /api[-_]?key/i,
  /credential/i,
  /private[-_]?key/i,
  /audit[-_]?pseudonym[-_]?key/i,
  /bearer/i,
  /access[-_]?token/i,
  /refresh[-_]?token/i,
  /session[-_]?token/i,
  /session[-_]?id/i,
];

// Bearer token value pattern
const BEARER_REGEX = /Bearer\s+([A-Za-z0-9\-._~+/]+=*)/gi;

// JWT pattern
const JWT_REGEX = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

// Connection string with credentials pattern (e.g. postgresql://user:pass@host)
const DB_URL_REGEX = /([a-zA-Z0-9+.-]+:\/\/[^:]+:)([^@]+)(@.+)/g;

/**
 * Checks whether an object key represents a sensitive field.
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Redacts known sensitive patterns from a string value.
 */
export function redactString(str: string): string {
  let result = str;

  // Redact Bearer tokens
  result = result.replace(BEARER_REGEX, "Bearer [REDACTED]");

  // Redact JWTs
  result = result.replace(JWT_REGEX, "[REDACTED_JWT]");

  // Redact DB credentials
  result = result.replace(DB_URL_REGEX, "$1[REDACTED]$3");

  return result;
}

/**
 * Deeply sanitizes any arbitrary data structure (primitives, arrays, objects, Errors)
 * to ensure all secrets, credentials, and sensitive keys are securely redacted.
 */
export function redactSensitiveData(data: unknown, seen = new WeakSet()): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    return redactString(data);
  }

  if (typeof data === "number" || typeof data === "boolean" || typeof data === "bigint") {
    return data;
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: redactString(data.message),
      // Stack traces are omitted in production/logs for security (SEC-VAL-08)
    };
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, seen));
  }

  if (typeof data === "object") {
    // Guard against circular references
    if (seen.has(data as object)) {
      return "[CIRCULAR]";
    }
    seen.add(data as object);

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        if (
          typeof value === "object" &&
          value !== null &&
          !(value instanceof Date) &&
          !(value instanceof Error)
        ) {
          // If it's a container object or array, recurse into it
          sanitized[key] = redactSensitiveData(value, seen);
        } else {
          sanitized[key] = REDACTED_PLACEHOLDER;
        }
      } else {
        sanitized[key] = redactSensitiveData(value, seen);
      }
    }

    return sanitized;
  }

  return "[UNSERIALIZABLE]";
}
