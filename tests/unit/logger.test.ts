import { describe, it } from "node:test";
import assert from "node:assert";
import {
  StructuredLogger,
  redactSensitiveData,
  isSensitiveKey,
  redactString,
  type LogEntry,
} from "@/platform/logger";

describe("Platform: Logger & Redaction", () => {
  it("identifies sensitive key patterns correctly", () => {
    assert.strictEqual(isSensitiveKey("password"), true);
    assert.strictEqual(isSensitiveKey("PASSWORD"), true);
    assert.strictEqual(isSensitiveKey("userPassword"), true);
    assert.strictEqual(isSensitiveKey("authSecret"), true);
    assert.strictEqual(isSensitiveKey("sessionToken"), true);
    assert.strictEqual(isSensitiveKey("authorization"), true);
    assert.strictEqual(isSensitiveKey("apiKey"), true);
    assert.strictEqual(isSensitiveKey("audit_pseudonym_key"), true);
    assert.strictEqual(isSensitiveKey("AUDITPSEUDONYMKEY"), true);
    assert.strictEqual(isSensitiveKey("bearerToken"), true);

    // Non-sensitive keys
    assert.strictEqual(isSensitiveKey("userId"), false);
    assert.strictEqual(isSensitiveKey("tradeDate"), false);
    assert.strictEqual(isSensitiveKey("instrumentSymbol"), false);
  });

  it("redacts sensitive strings such as Bearer tokens, JWTs, and database URLs", () => {
    const bearer = "Authorization: Bearer secret-token-abc123xyz";
    assert.strictEqual(
      redactString(bearer),
      "Authorization: Bearer [REDACTED]"
    );

    const jwt = "Token: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature";
    assert.strictEqual(
      redactString(jwt),
      "Token: [REDACTED_JWT]"
    );

    const dbUrl = "Connecting to postgresql://postgres:mypassword123@neon.tech/marketmind";
    assert.strictEqual(
      redactString(dbUrl),
      "Connecting to postgresql://postgres:[REDACTED]@neon.tech/marketmind"
    );
  });

  it("recursively redacts sensitive keys and values in nested objects and arrays", () => {
    const payload = {
      user: {
        id: "usr_123",
        email: "test@example.com",
        password: "super_secret_password",
        session: {
          token: "session_tok_abc",
          expiresAt: "2026-10-02T12:00:00.000Z",
        },
      },
      tokens: ["normal_tag", "Bearer sensitive-token-999"],
      headers: {
        authorization: "Bearer my-secret-jwt",
        "x-api-key": "secret-api-key-value",
      },
    };

    const sanitized = redactSensitiveData(payload) as Record<string, unknown>;

    assert.deepStrictEqual(sanitized, {
      user: {
        id: "usr_123",
        email: "test@example.com",
        password: "[REDACTED]",
        session: {
          token: "[REDACTED]",
          expiresAt: "2026-10-02T12:00:00.000Z",
        },
      },
      tokens: ["normal_tag", "Bearer [REDACTED]"],
      headers: {
        authorization: "[REDACTED]",
        "x-api-key": "[REDACTED]",
      },
    });
  });

  it("emits structured JSON log entries with timestamps and level", () => {
    const logs: string[] = [];
    const testSink = (line: string) => logs.push(line);

    const logger = new StructuredLogger({
      level: "info",
      sink: testSink,
    });

    logger.info("Application initialized successfully", {
      requestId: "req-abc",
      module: "platform",
      route: "/api/health",
      durationMs: 12.5,
    });

    assert.strictEqual(logs.length, 1);
    const entry = JSON.parse(logs[0]) as LogEntry;

    assert.strictEqual(entry.level, "info");
    assert.strictEqual(entry.msg, "Application initialized successfully");
    assert.strictEqual(entry.requestId, "req-abc");
    assert.strictEqual(entry.module, "platform");
    assert.strictEqual(entry.route, "/api/health");
    assert.strictEqual(entry.durationMs, 12.5);
    assert.ok(entry.ts);
    assert.ok(new Date(entry.ts).getTime() > 0);
  });

  it("suppresses logs below the configured log level", () => {
    const logs: string[] = [];
    const testSink = (line: string) => logs.push(line);

    const logger = new StructuredLogger({
      level: "warn",
      sink: testSink,
    });

    logger.debug("This debug log should be suppressed");
    logger.info("This info log should be suppressed");
    logger.warn("This warning should be captured");
    logger.error("This error should be captured");

    assert.strictEqual(logs.length, 2);
    const first = JSON.parse(logs[0]) as LogEntry;
    const second = JSON.parse(logs[1]) as LogEntry;

    assert.strictEqual(first.level, "warn");
    assert.strictEqual(second.level, "error");
  });

  it("propagates context to child loggers", () => {
    const logs: string[] = [];
    const testSink = (line: string) => logs.push(line);

    const rootLogger = new StructuredLogger({
      level: "info",
      context: { module: "identity", requestId: "req-parent" },
      sink: testSink,
    });

    const childLogger = rootLogger.child({
      route: "/auth/login",
      action: "auth.login.attempt",
    });

    childLogger.info("User login attempt started", {
      password: "secretPasswordToRedact",
      userRef: "user-pseudo-hash-123",
    });

    assert.strictEqual(logs.length, 1);
    const entry = JSON.parse(logs[0]) as LogEntry;

    assert.strictEqual(entry.module, "identity");
    assert.strictEqual(entry.requestId, "req-parent");
    assert.strictEqual(entry.route, "/auth/login");
    assert.strictEqual(entry.action, "auth.login.attempt");
    assert.strictEqual(entry.userRef, "user-pseudo-hash-123");
    assert.deepStrictEqual(entry.details, {
      password: "[REDACTED]",
    });
  });
});
