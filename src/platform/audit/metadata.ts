import { AppError } from "@/platform/errors";

/**
 * Forbidden key patterns in audit metadata.
 * SEC-AUD-03: Audit metadata MUST NOT hold secrets, tokens, raw prompts/answers,
 * or full financial details beyond what an investigation requires.
 */
const FORBIDDEN_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /credential/i,
  /cookie/i,
  /session/i,
  /prompt/i,
  /rawanswer/i,
  /bearer/i,
  /apikey/i,
  /privatekey/i,
  /authorization/i,
];

/**
 * Validates and sanitizes audit metadata.
 * Ensures metadata contains only safe, allow-listed/safe keys and primitive/json-safe values.
 * Throws AppError("INTERNAL") if sensitive keys or prohibited contents are detected.
 *
 * @param metadata - The raw metadata object to validate.
 * @returns An immutable, sanitized copy of the metadata.
 */
export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | undefined
): Readonly<Record<string, unknown>> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return Object.freeze({});
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Check key against forbidden patterns
    for (const pattern of FORBIDDEN_KEY_PATTERNS) {
      if (pattern.test(key)) {
        throw new AppError("INTERNAL", {
          message: `Security violation: Prohibited key "${key}" detected in audit metadata.`,
          details: { rule: "FORBIDDEN_AUDIT_METADATA_KEY", key },
        });
      }
    }

    // Check value safety
    if (value === null || value === undefined) {
      sanitized[key] = null;
    } else if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      // Allow arrays of primitives (e.g. changedFieldNames: ["name", "email"])
      sanitized[key] = value.map((item) => {
        if (
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean" ||
          item === null
        ) {
          return item;
        }
        throw new AppError("INTERNAL", {
          message: `Security violation: Non-primitive array value in audit metadata key "${key}".`,
          details: { rule: "INVALID_AUDIT_METADATA_VALUE", key },
        });
      });
    } else if (typeof value === "object") {
      // Recurse into nested plain objects
      sanitized[key] = sanitizeAuditMetadata(value as Record<string, unknown>);
    } else {
      throw new AppError("INTERNAL", {
        message: `Security violation: Unsupported value type in audit metadata key "${key}".`,
        details: { rule: "INVALID_AUDIT_METADATA_TYPE", key },
      });
    }
  }

  return Object.freeze(sanitized);
}
