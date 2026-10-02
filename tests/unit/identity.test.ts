import { describe, it } from "node:test";
import assert from "node:assert";
import Decimal from "decimal.js";
import {
  resolveUserContext,
  type UserContext,
  type IdentityProviderPort,
  type SessionResolutionResult,
} from "@/modules/identity";
import {
  assertAuthorized,
  requireUser,
  requireAdmin,
} from "@/platform/auth";
import {
  UnauthenticatedError,
  ForbiddenError,
  InternalError,
  UpstreamUnavailableError,
} from "@/platform/errors";
import { StructuredLogger } from "@/platform/logger";

describe("Platform & Identity: Foundation and Contracts", () => {
  describe("Decimal.js Runtime Dependency (BD-03)", () => {
    it("imports decimal.js and computes exact decimal arithmetic without precision loss", () => {
      const a = new Decimal("0.1");
      const b = new Decimal("0.2");
      const sum = a.plus(b);

      assert.strictEqual(sum.toString(), "0.3");
      assert.strictEqual(sum.toNumber(), 0.3);
      assert.notStrictEqual(0.1 + 0.2, 0.3); // JS float arithmetic gives 0.30000000000000004
    });
  });

  describe("Identity Edge Resolution (resolveUserContext)", () => {
    it("returns null when no session is present", async () => {
      const mockProvider: IdentityProviderPort = {
        async resolveSession() {
          return { status: "no_session" };
        },
      };

      const context = await resolveUserContext(new Headers(), mockProvider);
      assert.strictEqual(context, null);
    });

    it("returns an immutable UserContext for a valid active user", async () => {
      const mockProvider: IdentityProviderPort = {
        async resolveSession() {
          return {
            status: "active",
            user: {
              id: "usr_123e4567-e89b-12d3-a456-426614174000",
              email: "trader@example.com",
              role: "USER",
              disabledAt: null,
            },
            session: {
              id: "sess_abc123",
              expiresAt: new Date(Date.now() + 86400000),
            },
          };
        },
      };

      const context = await resolveUserContext(new Headers(), mockProvider);

      assert.notStrictEqual(context, null);
      assert.strictEqual(context!.userId, "usr_123e4567-e89b-12d3-a456-426614174000");
      assert.strictEqual(context!.email, "trader@example.com");
      assert.strictEqual(context!.role, "USER");
      assert.strictEqual(context!.sessionId, "sess_abc123");

      // Verify immutability
      assert.strictEqual(Object.isFrozen(context), true);
      assert.throws(() => {
        // @ts-expect-error - testing runtime freeze
        context.role = "ADMIN";
      });
    });

    it("rejects an expired session when provider identifies it as expired/no_session", async () => {
      const mockProvider: IdentityProviderPort = {
        async resolveSession() {
          return { status: "no_session" };
        },
      };

      const headers = new Headers({ cookie: "better-auth.session_token=expired_token" });
      const context = await resolveUserContext(headers, mockProvider);
      assert.strictEqual(context, null);
    });

    it("rejects a disabled user account at session resolution (SEC-AUTH-08)", async () => {
      const mockProvider: IdentityProviderPort = {
        async resolveSession() {
          return {
            status: "disabled",
            user: {
              id: "usr_suspended",
              email: "suspended@example.com",
              role: "USER",
              disabledAt: new Date("2026-10-01T00:00:00.000Z"),
            },
            session: {
              id: "sess_active_token",
              expiresAt: new Date(Date.now() + 86400000),
            },
          };
        },
      };

      const context = await resolveUserContext(new Headers(), mockProvider);
      assert.strictEqual(context, null);
    });

    it("does not convert upstream network/timeout errors to null", async () => {
      const mockProvider: IdentityProviderPort = {
        async resolveSession() {
          const error = new Error("Connection refused");
          Object.assign(error, { code: "ECONNREFUSED" });
          throw error;
        },
      };

      await assert.rejects(
        async () => {
          await resolveUserContext(new Headers(), mockProvider);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof UpstreamUnavailableError, true);
          assert.strictEqual((error as UpstreamUnavailableError).httpStatus, 503);
          assert.strictEqual((error as UpstreamUnavailableError).code, "UPSTREAM_UNAVAILABLE");
          return true;
        }
      );
    });

    it("does not convert database or unexpected internal errors to null", async () => {
      const mockProvider: IdentityProviderPort = {
        async resolveSession() {
          throw new Error("PostgreSQL connection pool exhausted: secret_db_url");
        },
      };

      await assert.rejects(
        async () => {
          await resolveUserContext(new Headers(), mockProvider);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof InternalError, true);
          assert.strictEqual((error as InternalError).httpStatus, 500);
          assert.strictEqual((error as InternalError).code, "INTERNAL");
          // Ensure client-facing message does not leak database details or connection strings
          assert.strictEqual((error as InternalError).message, "Failed to resolve authentication session");
          return true;
        }
      );
    });

    it("propagates existing platform AppErrors thrown by the provider port", async () => {
      const mockProvider: IdentityProviderPort = {
        async resolveSession() {
          throw new UnauthenticatedError("Session signature invalid");
        },
      };

      await assert.rejects(
        async () => {
          await resolveUserContext(new Headers(), mockProvider);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof UnauthenticatedError, true);
          assert.strictEqual((error as UnauthenticatedError).httpStatus, 401);
          assert.strictEqual((error as UnauthenticatedError).code, "UNAUTHENTICATED");
          return true;
        }
      );
    });

    it("rejects an active provider result missing user payload (SEC-AUDIT-01)", async () => {
      // Deliberate test cast: external provider returns active status but omits user object
      const malformedResult = {
        status: "active",
        session: {
          id: "sess_valid",
          expiresAt: new Date(Date.now() + 86400000),
        },
      } as unknown as SessionResolutionResult;

      const mockProvider: IdentityProviderPort = {
        async resolveSession() {
          return malformedResult;
        },
      };

      await assert.rejects(
        async () => {
          await resolveUserContext(new Headers(), mockProvider);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof InternalError, true);
          assert.strictEqual((error as InternalError).httpStatus, 500);
          assert.strictEqual((error as InternalError).code, "INTERNAL");
          assert.strictEqual((error as InternalError).message, "Failed to resolve authentication session: missing user payload");
          return true;
        }
      );
    });

    it("rejects an active provider result missing session payload (SEC-AUDIT-01)", async () => {
      // Deliberate test cast: external provider returns active status but omits session object
      const malformedResult = {
        status: "active",
        user: {
          id: "usr_valid",
          email: "user@example.com",
          role: "USER",
          disabledAt: null,
        },
      } as unknown as SessionResolutionResult;

      const mockProvider: IdentityProviderPort = {
        async resolveSession() {
          return malformedResult;
        },
      };

      await assert.rejects(
        async () => {
          await resolveUserContext(new Headers(), mockProvider);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof InternalError, true);
          assert.strictEqual((error as InternalError).httpStatus, 500);
          assert.strictEqual((error as InternalError).code, "INTERNAL");
          assert.strictEqual((error as InternalError).message, "Failed to resolve authentication session: missing session payload");
          return true;
        }
      );
    });

    it("rejects an active result with an empty or whitespace-only user ID (SEC-AUDIT-02)", async () => {
      // Deliberate test cast: external provider returns whitespace-only user id
      const malformedResult = {
        status: "active",
        user: {
          id: "   ",
          email: "user@example.com",
          role: "USER",
          disabledAt: null,
        },
        session: {
          id: "sess_valid",
          expiresAt: new Date(Date.now() + 86400000),
        },
      } as unknown as SessionResolutionResult;

      const mockProvider: IdentityProviderPort = {
        async resolveSession() {
          return malformedResult;
        },
      };

      await assert.rejects(
        async () => {
          await resolveUserContext(new Headers(), mockProvider);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof InternalError, true);
          assert.strictEqual((error as InternalError).httpStatus, 500);
          assert.strictEqual((error as InternalError).code, "INTERNAL");
          assert.strictEqual((error as InternalError).message, "Failed to resolve authentication session: invalid user id");
          return true;
        }
      );
    });

    it("rejects an active result with an invalid role (SEC-AUDIT-02)", async () => {
      // Deliberate test cast: external provider returns unsupported role
      const malformedResult = {
        status: "active",
        user: {
          id: "usr_valid",
          email: "user@example.com",
          role: "SUPERUSER",
          disabledAt: null,
        },
        session: {
          id: "sess_valid",
          expiresAt: new Date(Date.now() + 86400000),
        },
      } as unknown as SessionResolutionResult;

      const mockProvider: IdentityProviderPort = {
        async resolveSession() {
          return malformedResult;
        },
      };

      await assert.rejects(
        async () => {
          await resolveUserContext(new Headers(), mockProvider);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof InternalError, true);
          assert.strictEqual((error as InternalError).httpStatus, 500);
          assert.strictEqual((error as InternalError).code, "INTERNAL");
          assert.strictEqual((error as InternalError).message, "Failed to resolve authentication session: invalid user role");
          return true;
        }
      );
    });

    it("rejects an active result with malformed required fields (invalid email, whitespace session ID)", async () => {
      // Deliberate test cast: invalid email format missing '@'
      const invalidEmailResult = {
        status: "active",
        user: {
          id: "usr_valid",
          email: "invalid-email-format",
          role: "USER",
          disabledAt: null,
        },
        session: {
          id: "sess_valid",
          expiresAt: new Date(Date.now() + 86400000),
        },
      } as unknown as SessionResolutionResult;

      const invalidEmailProvider: IdentityProviderPort = {
        async resolveSession() {
          return invalidEmailResult;
        },
      };

      await assert.rejects(
        async () => {
          await resolveUserContext(new Headers(), invalidEmailProvider);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof InternalError, true);
          assert.strictEqual((error as InternalError).message, "Failed to resolve authentication session: invalid user email");
          return true;
        }
      );

      // Deliberate test cast: whitespace session id
      const invalidSessionResult = {
        status: "active",
        user: {
          id: "usr_valid",
          email: "valid@example.com",
          role: "USER",
          disabledAt: null,
        },
        session: {
          id: "   \t",
          expiresAt: new Date(Date.now() + 86400000),
        },
      } as unknown as SessionResolutionResult;

      const invalidSessionProvider: IdentityProviderPort = {
        async resolveSession() {
          return invalidSessionResult;
        },
      };

      await assert.rejects(
        async () => {
          await resolveUserContext(new Headers(), invalidSessionProvider);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof InternalError, true);
          assert.strictEqual((error as InternalError).message, "Failed to resolve authentication session: invalid session id");
          return true;
        }
      );
    });

    it("does not leak secrets or tokens through thrown errors or captured logs during provider failure", async () => {
      const secretToken = "secret_session_token_xyz987";
      const headers = new Headers({
        cookie: `better-auth.session_token=${secretToken}`,
      });

      const mockProvider: IdentityProviderPort = {
        async resolveSession() {
          throw new Error(`Upstream engine failure referencing token: ${secretToken}`);
        },
      };

      let caughtError: unknown;
      try {
        await resolveUserContext(headers, mockProvider);
      } catch (err) {
        caughtError = err;
      }

      assert.strictEqual(caughtError instanceof InternalError, true);
      const appErr = caughtError as InternalError;

      // Verify the client-facing error message never leaks raw tokens or internal error details
      assert.strictEqual(appErr.message.includes(secretToken), false);
      assert.strictEqual(appErr.message, "Failed to resolve authentication session");

      // Verify captured logs redact the cookie and token
      const logLines: string[] = [];
      const testLogger = new StructuredLogger({
        sink: (line) => logLines.push(line),
      });

      testLogger.error("Authentication resolution failed", {
        headers: Object.fromEntries(headers.entries()),
        errorCode: appErr.code,
        error: appErr,
      });

      const joinedLogs = logLines.join("\n");
      assert.strictEqual(joinedLogs.includes(secretToken), false);
      assert.strictEqual(joinedLogs.includes("[REDACTED]"), true);
    });
  });

  describe("Declared-Access Authorization Guard (assertAuthorized)", () => {
    const userContext: UserContext = Object.freeze({
      userId: "usr_regular",
      role: "USER",
      email: "user@example.com",
      sessionId: "sess_1",
    });

    const adminContext: UserContext = Object.freeze({
      userId: "usr_admin",
      role: "ADMIN",
      email: "admin@example.com",
      sessionId: "sess_2",
    });

    it("allows public access when unauthenticated (userContext is null)", () => {
      assert.doesNotThrow(() => {
        assertAuthorized("public", null);
      });
    });

    it("allows public access when authenticated", () => {
      assert.doesNotThrow(() => {
        assertAuthorized("public", userContext);
      });
    });

    it("allows authenticated access for a regular user", () => {
      assert.doesNotThrow(() => {
        assertAuthorized("authenticated", userContext);
        const resolved = requireUser(userContext);
        assert.strictEqual(resolved.userId, "usr_regular");
      });
    });

    it("allows authenticated access for an admin user", () => {
      assert.doesNotThrow(() => {
        assertAuthorized("authenticated", adminContext);
      });
    });

    it("denies authenticated access when userContext is null (throws UNAUTHENTICATED / 401)", () => {
      assert.throws(
        () => {
          assertAuthorized("authenticated", null);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof UnauthenticatedError, true);
          assert.strictEqual((error as UnauthenticatedError).httpStatus, 401);
          assert.strictEqual((error as UnauthenticatedError).code, "UNAUTHENTICATED");
          return true;
        }
      );
    });

    it("denies admin access when userContext is null (throws UNAUTHENTICATED / 401)", () => {
      assert.throws(
        () => {
          assertAuthorized("admin", null);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof UnauthenticatedError, true);
          assert.strictEqual((error as UnauthenticatedError).httpStatus, 401);
          assert.strictEqual((error as UnauthenticatedError).code, "UNAUTHENTICATED");
          return true;
        }
      );
    });

    it("denies admin access to a regular USER (throws FORBIDDEN / 403)", () => {
      assert.throws(
        () => {
          assertAuthorized("admin", userContext);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof ForbiddenError, true);
          assert.strictEqual((error as ForbiddenError).httpStatus, 403);
          assert.strictEqual((error as ForbiddenError).code, "FORBIDDEN");
          assert.strictEqual((error as ForbiddenError).message, "Administrative privileges required.");
          return true;
        }
      );
    });

    it("allows admin access to an ADMIN user", () => {
      assert.doesNotThrow(() => {
        assertAuthorized("admin", adminContext);
        const resolved = requireAdmin(adminContext);
        assert.strictEqual(resolved.userId, "usr_admin");
        assert.strictEqual(resolved.role, "ADMIN");
      });
    });

    it("fails closed (throws FORBIDDEN) on unknown or missing access declaration (deny by default)", () => {
      assert.throws(
        () => {
          // @ts-expect-error - testing invalid access level at runtime
          assertAuthorized("internal_secret_route", adminContext);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof ForbiddenError, true);
          assert.strictEqual((error as ForbiddenError).httpStatus, 403);
          return true;
        }
      );
    });

    it("fails closed when access declaration is null or undefined (SEC-AUTHZ-01 / SEC-AUTHZ-02)", () => {
      assert.throws(
        () => {
          // Deliberate test cast: runtime pass of null access level
          assertAuthorized(null as unknown as "public", userContext);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof ForbiddenError, true);
          assert.strictEqual((error as ForbiddenError).httpStatus, 403);
          assert.strictEqual((error as ForbiddenError).code, "FORBIDDEN");
          assert.strictEqual((error as ForbiddenError).message, "Invalid or missing access level declaration.");
          return true;
        }
      );

      assert.throws(
        () => {
          // Deliberate test cast: runtime pass of undefined access level
          assertAuthorized(undefined as unknown as "public", userContext);
        },
        (error: unknown) => {
          assert.strictEqual(error instanceof ForbiddenError, true);
          assert.strictEqual((error as ForbiddenError).httpStatus, 403);
          assert.strictEqual((error as ForbiddenError).code, "FORBIDDEN");
          assert.strictEqual((error as ForbiddenError).message, "Invalid or missing access level declaration.");
          return true;
        }
      );
    });
  });
});
