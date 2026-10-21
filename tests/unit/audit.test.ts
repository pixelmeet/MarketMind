import { describe, it } from "node:test";
import assert from "node:assert";
import {
  computeActorPseudonym,
  computeIpHash,
  sanitizeAuditMetadata,
  createAuditEvent,
  InMemoryAuditSink,
  LoggerAuditSink,
  type AuditAction,
} from "@/platform/audit";
import { AppError } from "@/platform/errors";

describe("Platform: Audit Subsystem (SEC-AUD-01..05, DM-06)", () => {
  const TEST_SECRET_KEY = "test-audit-pseudonym-secret-key-32bytes!";
  const TEST_USER_ID = "usr_01h7x9k3m4v6b8z1y2w3";

  describe("Actor Pseudonym Generation (DM-06 / SEC-AUD-02 / SEC-SEC-09)", () => {
    it("computes a deterministic 64-character hex pseudonym", () => {
      const p1 = computeActorPseudonym(TEST_USER_ID, TEST_SECRET_KEY);
      const p2 = computeActorPseudonym(TEST_USER_ID, TEST_SECRET_KEY);

      assert.strictEqual(typeof p1, "string");
      assert.strictEqual(p1.length, 64);
      assert.match(p1, /^[0-9a-f]{64}$/);
      // Deterministic: same user + same key = identical pseudonym
      assert.strictEqual(p1, p2);
    });

    it("generates different pseudonyms for different user IDs", () => {
      const p1 = computeActorPseudonym(TEST_USER_ID, TEST_SECRET_KEY);
      const p2 = computeActorPseudonym("usr_different_user_id_45678", TEST_SECRET_KEY);

      assert.notStrictEqual(p1, p2);
    });

    it("generates different pseudonyms for the same user when key is rotated", () => {
      const rotatedKey = "different-rotated-audit-key-32bytes!";
      const p1 = computeActorPseudonym(TEST_USER_ID, TEST_SECRET_KEY);
      const p2 = computeActorPseudonym(TEST_USER_ID, rotatedKey);

      assert.notStrictEqual(p1, p2);
    });

    it("fails fast if user ID is missing, whitespace, or invalid", () => {
      assert.throws(
        () => computeActorPseudonym("", TEST_SECRET_KEY),
        (err: unknown) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, "INTERNAL");
          assert.strictEqual(err.details?.rule, "INVALID_USER_ID");
          return true;
        }
      );

      assert.throws(
        () => computeActorPseudonym("   ", TEST_SECRET_KEY),
        (err: unknown) => {
          assert(err instanceof AppError);
          return true;
        }
      );
    });

    it("fails fast if AUDIT_PSEUDONYM_KEY is missing or empty", () => {
      assert.throws(
        () => computeActorPseudonym(TEST_USER_ID, ""),
        (err: unknown) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, "INTERNAL");
          assert.strictEqual(err.details?.rule, "MISSING_AUDIT_KEY");
          return true;
        }
      );
    });
  });

  describe("IP Address Hashing (SEC-AUD-02)", () => {
    const TEST_SALT = "test-salt-ip-hash-key";

    it("computes a deterministic 64-character salted IP hash", () => {
      const ip = "192.168.1.100";
      const hash1 = computeIpHash(ip, TEST_SALT);
      const hash2 = computeIpHash(ip, TEST_SALT);

      assert.strictEqual(hash1.length, 64);
      assert.match(hash1, /^[0-9a-f]{64}$/);
      assert.strictEqual(hash1, hash2);
    });

    it("generates different hashes for different IP addresses", () => {
      const hash1 = computeIpHash("192.168.1.100", TEST_SALT);
      const hash2 = computeIpHash("10.0.0.1", TEST_SALT);

      assert.notStrictEqual(hash1, hash2);
    });

    it("fails fast if IP or salt is invalid", () => {
      assert.throws(() => computeIpHash("", TEST_SALT));
      assert.throws(() => computeIpHash("127.0.0.1", ""));
    });
  });

  describe("Audit Metadata Sanitization (SEC-AUD-03, SEC-SEC-05)", () => {
    it("permits safe primitives, arrays of primitives, and nested safe objects", () => {
      const safe = {
        instrumentSymbol: "RELIANCE",
        count: 5,
        isActive: true,
        changedFields: ["name", "description"],
        details: {
          reason: "User requested rename",
          attempt: 1,
        },
      };

      const result = sanitizeAuditMetadata(safe);
      assert.deepStrictEqual(result, safe);
      assert(Object.isFrozen(result));
    });

    it("returns empty frozen object for undefined or empty metadata", () => {
      const empty = sanitizeAuditMetadata(undefined);
      assert.deepStrictEqual(empty, {});
      assert(Object.isFrozen(empty));
    });

    it("rejects prohibited sensitive keys (passwords, tokens, secrets, session cookies, raw prompts)", () => {
      const prohibitedKeys = [
        "userPassword",
        "authToken",
        "api_secret",
        "credentialKey",
        "sessionCookie",
        "rawPrompt",
        "bearerToken",
        "apiKey",
        "privateKey",
        "authorizationHeader",
      ];

      for (const forbiddenKey of prohibitedKeys) {
        assert.throws(
          () => sanitizeAuditMetadata({ [forbiddenKey]: "any-value" }),
          (err: unknown) => {
            assert(err instanceof AppError);
            assert.strictEqual(err.code, "INTERNAL");
            assert.strictEqual(err.details?.rule, "FORBIDDEN_AUDIT_METADATA_KEY");
            return true;
          },
          `Expected key "${forbiddenKey}" to be rejected`
        );
      }
    });

    it("rejects non-primitive array values in metadata", () => {
      assert.throws(
        () =>
          sanitizeAuditMetadata({
            invalidArray: [() => "function"],
          }),
        (err: unknown) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, "INTERNAL");
          return true;
        }
      );
    });
  });

  describe("AuditEvent Construction & Validation (SEC-AUD-01..05)", () => {
    const pseudonym = computeActorPseudonym(TEST_USER_ID, TEST_SECRET_KEY);

    it("constructs a valid frozen AuditEvent for USER actor with pseudonym", () => {
      const event = createAuditEvent({
        actorType: "USER",
        actorPseudonym: pseudonym,
        action: "portfolio.create",
        entityType: "portfolio",
        entityId: "port_12345",
        outcome: "SUCCESS",
        requestId: "req_test_001",
        metadata: { name: "Long-term Holdings" },
      });

      assert(event.id);
      assert(event.occurredAt instanceof Date);
      assert.strictEqual(event.actorType, "USER");
      assert.strictEqual(event.actorPseudonym, pseudonym);
      assert.strictEqual(event.action, "portfolio.create");
      assert.strictEqual(event.outcome, "SUCCESS");
      assert.strictEqual(event.entityId, "port_12345");
      assert.strictEqual(event.metadata.name, "Long-term Holdings");
      assert(Object.isFrozen(event));
    });

    it("allows null actorPseudonym for SYSTEM and WORKER actors", () => {
      const workerEvent = createAuditEvent({
        actorType: "WORKER",
        action: "ingestion.run.outcome",
        outcome: "SUCCESS",
        metadata: { dataset: "PRICES_DAILY", rowsWritten: 50 },
      });

      assert.strictEqual(workerEvent.actorType, "WORKER");
      assert.strictEqual(workerEvent.actorPseudonym, null);

      const systemEvent = createAuditEvent({
        actorType: "SYSTEM",
        action: "security.ratelimit.tripped",
        outcome: "DENIED",
        metadata: { routeClass: "auth", count: 6 },
      });

      assert.strictEqual(systemEvent.actorType, "SYSTEM");
      assert.strictEqual(systemEvent.actorPseudonym, null);
    });

    it("fails closed if USER or ADMIN event lacks actorPseudonym", () => {
      assert.throws(
        () =>
          createAuditEvent({
            actorType: "USER",
            action: "portfolio.transaction.create",
            outcome: "SUCCESS",
          }),
        (err: unknown) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, "INTERNAL");
          assert.strictEqual(err.details?.rule, "MISSING_ACTOR_PSEUDONYM");
          return true;
        }
      );

      assert.throws(
        () =>
          createAuditEvent({
            actorType: "ADMIN",
            action: "admin.requeue",
            outcome: "SUCCESS",
          }),
        (err: unknown) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, "INTERNAL");
          return true;
        }
      );
    });

    it("rejects actions outside the closed taxonomy", () => {
      assert.throws(
        () =>
          createAuditEvent({
            actorType: "USER",
            actorPseudonym: pseudonym,
            action: "unapproved.arbitrary.action" as AuditAction,
            outcome: "SUCCESS",
          }),
        (err: unknown) => {
          assert(err instanceof AppError);
          assert.strictEqual(err.code, "INTERNAL");
          assert.strictEqual(err.details?.rule, "INVALID_AUDIT_ACTION");
          return true;
        }
      );
    });
  });

  describe("Audit Sink Implementations", () => {
    it("captures events in InMemoryAuditSink with query filters", () => {
      const sink = new InMemoryAuditSink();
      const pseudonym = computeActorPseudonym(TEST_USER_ID, TEST_SECRET_KEY);

      const e1 = createAuditEvent({
        actorType: "USER",
        actorPseudonym: pseudonym,
        action: "watchlist.create",
        outcome: "SUCCESS",
      });

      const e2 = createAuditEvent({
        actorType: "USER",
        actorPseudonym: pseudonym,
        action: "watchlist.item.add",
        outcome: "SUCCESS",
      });

      const e3 = createAuditEvent({
        actorType: "SYSTEM",
        action: "security.authorization.denied",
        outcome: "DENIED",
      });

      sink.emit(e1);
      sink.emit(e2);
      sink.emit(e3);

      assert.strictEqual(sink.getEvents().length, 3);
      assert.strictEqual(sink.findEventsByAction("watchlist.create").length, 1);
      assert.strictEqual(sink.findEventsByActor(pseudonym).length, 2);

      sink.clear();
      assert.strictEqual(sink.getEvents().length, 0);
    });

    it("emits without error to LoggerAuditSink", () => {
      const sink = new LoggerAuditSink();
      const event = createAuditEvent({
        actorType: "WORKER",
        action: "ingestion.run.outcome",
        outcome: "SUCCESS",
        metadata: { durationMs: 120 },
      });

      assert.doesNotThrow(() => sink.emit(event));
    });
  });
});
