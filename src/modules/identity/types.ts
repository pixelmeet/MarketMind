/**
 * MarketMind AI — Identity Module Types
 *
 * Defines the immutable security context and provider interface for identity resolution.
 * Strictly adheres to doc/data-model.md §4.1, doc/security.md SEC-AUTH-*, and doc/backend.md §5.
 */

export type UserRole = "USER" | "ADMIN";

/**
 * Immutable security context representing a verified, active user session.
 * Exposes only minimal non-sensitive identity attributes.
 * Never exposes password hashes, session tokens, or raw database rows (SEC-SEC-05).
 */
export interface UserContext {
  readonly userId: string;
  readonly role: UserRole;
  readonly email: string;
  readonly sessionId: string;
}

/**
 * Result of an identity provider session lookup.
 * Distinguishes:
 * - "no_session": No session or invalid/expired session token.
 * - "active": Valid session for an active user.
 * - "disabled": Valid session token, but user account is disabled (disabledAt !== null).
 */
export type SessionResolutionResult =
  | { readonly status: "no_session" }
  | {
      readonly status: "active";
      readonly user: {
        readonly id: string;
        readonly email: string;
        readonly role: UserRole;
        readonly disabledAt: null;
      };
      readonly session: {
        readonly id: string;
        readonly expiresAt: Date;
      };
    }
  | {
      readonly status: "disabled";
      readonly user: {
        readonly id: string;
        readonly email: string;
        readonly role: UserRole;
        readonly disabledAt: Date;
      };
      readonly session: {
        readonly id: string;
        readonly expiresAt: Date;
      };
    };

/**
 * IdentityProviderPort: Contract between Edge resolution and the authentication engine.
 * Decouples the Next.js edge/HTTP layer from the specific authentication library (U-08).
 */
export interface IdentityProviderPort {
  /**
   * Resolves the session from incoming request headers.
   * Throws if an infrastructure error (database down, timeout) occurs.
   */
  resolveSession(headers: Headers): Promise<SessionResolutionResult>;
}
