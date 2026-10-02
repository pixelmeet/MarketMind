import {
  InternalError,
  UpstreamUnavailableError,
  isAppError,
} from "@/platform/errors";
import type {
  UserContext,
  UserRole,
  IdentityProviderPort,
} from "./types";

const MAX_ID_LENGTH = 128;
const MAX_EMAIL_LENGTH = 255;

function isNonEmptyString(val: unknown, maxLength: number): val is string {
  return typeof val === "string" && val.trim().length > 0 && val.trim().length <= maxLength;
}

function isValidRole(role: unknown): role is UserRole {
  return role === "USER" || role === "ADMIN";
}

/**
 * Validates that an active resolution result contains valid user and session structures.
 * Throws an InternalError if any required field is missing, empty, or malformed.
 */
function validateActivePayload(
  result: unknown
): asserts result is {
  readonly status: "active";
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly role: UserRole;
    readonly disabledAt: null | undefined;
  };
  readonly session: {
    readonly id: string;
    readonly expiresAt: Date;
  };
} {
  if (typeof result !== "object" || result === null) {
    throw new InternalError("Failed to resolve authentication session: malformed provider payload");
  }

  const res = result as Record<string, unknown>;

  if (typeof res.user !== "object" || res.user === null) {
    throw new InternalError("Failed to resolve authentication session: missing user payload");
  }

  if (typeof res.session !== "object" || res.session === null) {
    throw new InternalError("Failed to resolve authentication session: missing session payload");
  }

  const user = res.user as Record<string, unknown>;
  const session = res.session as Record<string, unknown>;

  if (!isNonEmptyString(user.id, MAX_ID_LENGTH)) {
    throw new InternalError("Failed to resolve authentication session: invalid user id");
  }

  if (!isNonEmptyString(user.email, MAX_EMAIL_LENGTH) || !user.email.includes("@")) {
    throw new InternalError("Failed to resolve authentication session: invalid user email");
  }

  if (!isValidRole(user.role)) {
    throw new InternalError("Failed to resolve authentication session: invalid user role");
  }

  if (!isNonEmptyString(session.id, MAX_ID_LENGTH)) {
    throw new InternalError("Failed to resolve authentication session: invalid session id");
  }

  if (user.disabledAt !== null && user.disabledAt !== undefined) {
    throw new InternalError("Failed to resolve authentication session: active user has disabledAt set");
  }
}

/**
 * Resolves the immutable UserContext from request headers using an injected identity provider.
 *
 * Enforces:
 * - Edge isolation: Keeps HTTP/Next.js request objects out of domain services.
 * - SEC-AUTH-08: Suspended/disabled accounts (disabledAt !== null) are rejected at resolution.
 * - Reliable failure mapping: Distinguishes unauthenticated states (returns null) from
 *   database or infrastructure failures (throws appropriate AppError).
 * - Defensive validation: Malformed provider payloads fail closed as InternalError (500).
 * - Security: Never logs or exposes cookies, tokens, or raw secrets.
 *
 * @param headers Incoming HTTP Request headers
 * @param provider Injected identity provider port
 * @returns Immutable UserContext if valid and active, or null if unauthenticated/expired/disabled.
 */
export async function resolveUserContext(
  headers: Headers,
  provider: IdentityProviderPort
): Promise<UserContext | null> {
  try {
    const resolutionResult = await provider.resolveSession(headers);

    // Missing session or unauthenticated request (handle absent result safely)
    if (resolutionResult === null || resolutionResult === undefined) {
      return null;
    }

    if (typeof resolutionResult !== "object") {
      throw new InternalError("Failed to resolve authentication session: malformed provider payload");
    }

    if (!("status" in resolutionResult)) {
      throw new InternalError("Failed to resolve authentication session: missing provider status");
    }

    if (resolutionResult.status === "no_session") {
      return null;
    }

    // SEC-AUTH-08: Disabled users must be rejected at session resolution on every request
    if (resolutionResult.status === "disabled") {
      return null;
    }

    // Active session: validate required structures and fields
    if (resolutionResult.status === "active") {
      validateActivePayload(resolutionResult);

      return Object.freeze({
        userId: resolutionResult.user.id.trim(),
        role: resolutionResult.user.role,
        email: resolutionResult.user.email.trim().toLowerCase(),
        sessionId: resolutionResult.session.id.trim(),
      });
    }

    // Fail closed on unknown provider status
    throw new InternalError("Failed to resolve authentication session: unknown provider status");
  } catch (error: unknown) {
    // Preserve existing AppError instances (including validation InternalErrors)
    if (isAppError(error)) {
      throw error;
    }

    // Map upstream network or timeout errors to UpstreamUnavailableError (503)
    const isNetworkOrTimeout =
      error instanceof Error &&
      ("code" in error && (
        error.code === "ECONNREFUSED" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ENOTFOUND" ||
        error.code === "UND_ERR_CONNECT_TIMEOUT"
      ));

    if (isNetworkOrTimeout) {
      throw new UpstreamUnavailableError("Authentication provider unavailable", error);
    }

    // Map unexpected provider/database runtime failures to InternalError (500)
    throw new InternalError("Failed to resolve authentication session", error);
  }
}
