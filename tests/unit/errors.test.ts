import { describe, it } from "node:test";
import assert from "node:assert";
import {
  ERROR_CODES,
  ERROR_STATUS_MAP,
  DEFAULT_PUBLIC_MESSAGES,
  AppError,
  ValidationError,
  UnauthenticatedError,
  ForbiddenError,
  NotFoundError,
  RateLimitedError,
  UpstreamUnavailableError,
  InternalError,
  isAppError,
  formatErrorResponse,
} from "@/platform/errors";

describe("Platform: Errors", () => {
  it("defines the exact documented closed taxonomy of 7 error codes", () => {
    assert.deepStrictEqual([...ERROR_CODES], [
      "VALIDATION",
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "NOT_FOUND",
      "RATE_LIMITED",
      "UPSTREAM_UNAVAILABLE",
      "INTERNAL",
    ]);
  });

  it("maps error codes to exact HTTP statuses according to documentation", () => {
    assert.strictEqual(ERROR_STATUS_MAP.VALIDATION, 400);
    assert.strictEqual(ERROR_STATUS_MAP.UNAUTHENTICATED, 401);
    assert.strictEqual(ERROR_STATUS_MAP.FORBIDDEN, 403);
    assert.strictEqual(ERROR_STATUS_MAP.NOT_FOUND, 404);
    assert.strictEqual(ERROR_STATUS_MAP.RATE_LIMITED, 429);
    assert.strictEqual(ERROR_STATUS_MAP.UPSTREAM_UNAVAILABLE, 503);
    assert.strictEqual(ERROR_STATUS_MAP.INTERNAL, 500);
  });

  it("instantiates AppError subclasses with correct code, status, and default messages", () => {
    const valErr = new ValidationError();
    assert.strictEqual(valErr.code, "VALIDATION");
    assert.strictEqual(valErr.httpStatus, 400);
    assert.strictEqual(valErr.message, DEFAULT_PUBLIC_MESSAGES.VALIDATION);

    const unauthErr = new UnauthenticatedError();
    assert.strictEqual(unauthErr.code, "UNAUTHENTICATED");
    assert.strictEqual(unauthErr.httpStatus, 401);

    const forbErr = new ForbiddenError();
    assert.strictEqual(forbErr.code, "FORBIDDEN");
    assert.strictEqual(forbErr.httpStatus, 403);

    const notFoundErr = new NotFoundError();
    assert.strictEqual(notFoundErr.code, "NOT_FOUND");
    assert.strictEqual(notFoundErr.httpStatus, 404);

    const rateErr = new RateLimitedError(45);
    assert.strictEqual(rateErr.code, "RATE_LIMITED");
    assert.strictEqual(rateErr.httpStatus, 429);
    assert.strictEqual(rateErr.retryAfter, 45);

    const upErr = new UpstreamUnavailableError();
    assert.strictEqual(upErr.code, "UPSTREAM_UNAVAILABLE");
    assert.strictEqual(upErr.httpStatus, 503);

    const intErr = new InternalError();
    assert.strictEqual(intErr.code, "INTERNAL");
    assert.strictEqual(intErr.httpStatus, 500);
  });

  it("correctly identifies AppError instances via isAppError type guard", () => {
    assert.strictEqual(isAppError(new ValidationError()), true);
    assert.strictEqual(isAppError(new AppError("NOT_FOUND")), true);
    assert.strictEqual(isAppError(new Error("generic error")), false);
    assert.strictEqual(isAppError(new TypeError("type error")), false);
    assert.strictEqual(isAppError({ code: "VALIDATION" }), false);
    assert.strictEqual(isAppError(null), false);
    assert.strictEqual(isAppError(undefined), false);
  });

  it("formats ValidationError with field-level issues and rule into error response", () => {
    const err = new ValidationError("Invalid transaction fields", {
      fields: [{ path: "quantity", issue: "must be positive" }],
      rule: "NON_NEGATIVE_QTY",
    });

    const res = formatErrorResponse(err, "req-123");
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "VALIDATION");
    assert.strictEqual(res.body.error.message, "Invalid transaction fields");
    assert.strictEqual(res.body.error.requestId, "req-123");
    assert.deepStrictEqual(res.body.error.details, {
      fields: [{ path: "quantity", issue: "must be positive" }],
      rule: "NON_NEGATIVE_QTY",
    });
  });

  it("formats RateLimitedError with Retry-After header", () => {
    const err = new RateLimitedError(120);
    const res = formatErrorResponse(err);
    assert.strictEqual(res.status, 429);
    assert.strictEqual(res.headers["Retry-After"], "120");
    assert.strictEqual(res.body.error.code, "RATE_LIMITED");
  });

  it("guarantees InternalError never leaks sensitive details or stack traces to client", () => {
    const internalErr = new InternalError("sensitive db connection failed", {
      sql: "SELECT * FROM users WHERE token = 'secret'",
    });

    const res = formatErrorResponse(internalErr, "req-456");
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.error.code, "INTERNAL");
    assert.strictEqual(
      res.body.error.message,
      DEFAULT_PUBLIC_MESSAGES.INTERNAL
    );
    assert.strictEqual(res.body.error.requestId, "req-456");
    assert.strictEqual(res.body.error.details, undefined);
  });

  it("safely coerces unhandled standard Errors to generic 500 without leaking stack or message", () => {
    const unhandled = new Error("FATAL: Database connection postgres://admin:password@localhost dropped");
    const res = formatErrorResponse(unhandled, "req-789");

    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.error.code, "INTERNAL");
    assert.strictEqual(
      res.body.error.message,
      DEFAULT_PUBLIC_MESSAGES.INTERNAL
    );
    assert.strictEqual(res.body.error.requestId, "req-789");
    assert.strictEqual(res.body.error.details, undefined);
  });
});
