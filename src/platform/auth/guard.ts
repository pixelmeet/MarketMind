import {
  UnauthenticatedError,
  ForbiddenError,
} from "@/platform/errors";
import type { UserContext } from "@/modules/identity/types";

export type AccessLevel = "public" | "authenticated" | "admin";

/**
 * Declared-access authorization guard.
 *
 * Enforces SEC-AUTHZ-01 and SEC-AUTHZ-02 (deny-by-default access declarations).
 *
 * Access Level Policies:
 * - "public": Accessible without authentication.
 * - "authenticated": Requires an active UserContext. Throws UnauthenticatedError (401) if absent.
 * - "admin": Requires an active UserContext with role "ADMIN". Throws UnauthenticatedError (401)
 *            if absent, and ForbiddenError (403) if role is not "ADMIN".
 *
 * Any undeclared, empty, or unknown access level fails closed with ForbiddenError (403).
 *
 * @param access The declared access level required for the operation
 * @param userContext The resolved security context of the caller, or null if unauthenticated
 */
export function assertAuthorized(
  access: AccessLevel,
  userContext: UserContext | null
): asserts userContext is UserContext | null {
  if (!access || typeof access !== "string") {
    throw new ForbiddenError("Invalid or missing access level declaration.");
  }

  switch (access) {
    case "public":
      return;

    case "authenticated":
      if (!userContext) {
        throw new UnauthenticatedError("Authentication required.");
      }
      return;

    case "admin":
      if (!userContext) {
        throw new UnauthenticatedError("Authentication required.");
      }
      if (userContext.role !== "ADMIN") {
        throw new ForbiddenError("Administrative privileges required.");
      }
      return;

    default:
      // Fail closed / Deny by default for any unknown or invalid access declaration
      throw new ForbiddenError("Invalid or missing access level declaration.");
  }
}

/**
 * Asserts that a valid authenticated user context is present.
 * Returns the non-null UserContext or throws UnauthenticatedError (401).
 */
export function requireUser(userContext: UserContext | null): UserContext {
  assertAuthorized("authenticated", userContext);
  return userContext!;
}

/**
 * Asserts that a valid admin user context is present.
 * Returns the non-null admin UserContext, or throws UnauthenticatedError (401) / ForbiddenError (403).
 */
export function requireAdmin(userContext: UserContext | null): UserContext {
  assertAuthorized("admin", userContext);
  return userContext!;
}
