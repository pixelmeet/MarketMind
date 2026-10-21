/**
 * MarketMind AI — Platform Audit Logging Types & Action Taxonomy
 * 
 * Conforms to:
 * - doc/security.md SEC-AUD-01 through SEC-AUD-05, SEC-SEC-09
 * - doc/data-model.md §4.9 (AuditLog schema & keyed pseudonym design DM-06)
 * - doc/backend.md §9.1 (Audit logging & sensitive data prevention)
 */

export type AuditActorType = "USER" | "ADMIN" | "SYSTEM" | "WORKER";

export type AuditOutcome = "SUCCESS" | "DENIED" | "ERROR";

/**
 * Closed action taxonomy per doc/security.md SEC-AUD-01.
 * Actions are strictly categorized and validated.
 */
export const AUDIT_ACTIONS = [
  // Authentication & Account Lifecycle
  "auth.login.success",
  "auth.login.failure",
  "auth.logout",
  "auth.password.change",
  "auth.email.change",
  "auth.account.disable",
  "auth.account.delete",

  // Portfolio & Transaction Mutations
  "portfolio.create",
  "portfolio.update",
  "portfolio.delete",
  "portfolio.transaction.create",
  "portfolio.transaction.update",
  "portfolio.transaction.delete",

  // Watchlist Mutations
  "watchlist.create",
  "watchlist.update",
  "watchlist.delete",
  "watchlist.item.add",
  "watchlist.item.remove",

  // AI Requests (Metadata only — SEC-AUD-01)
  "ai.query.ask",

  // Admin Operations (Re-queue, Backfill, Source control)
  "admin.requeue",
  "admin.backfill",
  "admin.source.enable",
  "admin.source.disable",

  // Security & Authorization Events
  "security.authorization.denied",
  "security.ratelimit.tripped",

  // Ingestion Runs
  "ingestion.run.outcome",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * Immutable Audit Event structure matching the database AuditLog entity.
 */
export interface AuditEvent {
  /** UUIDv4 identifier */
  readonly id: string;
  /** UTC timestamp of the audited event */
  readonly occurredAt: Date;
  /** Actor category */
  readonly actorType: AuditActorType;
  /** Keyed HMAC-SHA256 pseudonym of user ID; null for SYSTEM/WORKER (DM-06) */
  readonly actorPseudonym: string | null;
  /** Standardized action name */
  readonly action: AuditAction;
  /** Target entity type (e.g. "portfolio", "transaction", "watchlist") */
  readonly entityType?: string;
  /** Target entity ID */
  readonly entityId?: string;
  /** Result of the audited action */
  readonly outcome: AuditOutcome;
  /** Correlating request ID */
  readonly requestId?: string;
  /** Salted hash of IP address; never raw IP (SEC-AUD-02) */
  readonly ipHash?: string | null;
  /** Allow-listed metadata keys only; no secrets, tokens, or raw prompts (SEC-AUD-03) */
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Input parameters required to construct an AuditEvent.
 */
export interface CreateAuditEventParams {
  id?: string;
  occurredAt?: Date;
  actorType: AuditActorType;
  actorPseudonym?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  outcome: AuditOutcome;
  requestId?: string;
  ipHash?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Sink port for emitting audit records.
 * In Phase 2: In-memory and structured logger sinks.
 * In Phase 3: PostgreSQL-backed transaction sink.
 */
export interface AuditSink {
  emit(event: AuditEvent): Promise<void> | void;
}
