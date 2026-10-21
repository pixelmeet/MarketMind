import { randomUUID } from "node:crypto";
import { AppError } from "@/platform/errors";
import { logger } from "@/platform/logger";
import {
  AUDIT_ACTIONS,
  type AuditAction,
  type AuditEvent,
  type AuditSink,
  type CreateAuditEventParams,
} from "./types";
import { sanitizeAuditMetadata } from "./metadata";

/**
 * Creates and validates an immutable AuditEvent object.
 * Enforces action taxonomy, metadata safety, and actor pseudonym rules.
 */
export function createAuditEvent(params: CreateAuditEventParams): AuditEvent {
  // 1. Validate action belongs to closed taxonomy
  if (!AUDIT_ACTIONS.includes(params.action)) {
    throw new AppError("INTERNAL", {
      message: `Security violation: Unrecognized audit action "${params.action}".`,
      details: { rule: "INVALID_AUDIT_ACTION", action: params.action },
    });
  }

  // 2. Validate actor requirements
  if (params.actorType === "USER" || params.actorType === "ADMIN") {
    if (!params.actorPseudonym || typeof params.actorPseudonym !== "string") {
      throw new AppError("INTERNAL", {
        message: `Security violation: Missing actor pseudonym for ${params.actorType} audit event.`,
        details: { rule: "MISSING_ACTOR_PSEUDONYM" },
      });
    }
  }

  // 3. Sanitize and validate metadata
  const sanitizedMetadata = sanitizeAuditMetadata(params.metadata);

  // 4. Construct frozen event
  const event: AuditEvent = {
    id: params.id ?? randomUUID(),
    occurredAt: params.occurredAt ?? new Date(),
    actorType: params.actorType,
    actorPseudonym: params.actorPseudonym ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    outcome: params.outcome,
    requestId: params.requestId,
    ipHash: params.ipHash ?? null,
    metadata: sanitizedMetadata,
  };

  return Object.freeze(event);
}

/**
 * In-memory sink for testing and local development.
 * Captures all emitted audit events and provides query helpers.
 */
export class InMemoryAuditSink implements AuditSink {
  private events: AuditEvent[] = [];

  emit(event: AuditEvent): void {
    this.events.push(event);
  }

  getEvents(): ReadonlyArray<AuditEvent> {
    return [...this.events];
  }

  findEventsByAction(action: AuditAction): AuditEvent[] {
    return this.events.filter((e) => e.action === action);
  }

  findEventsByActor(actorPseudonym: string): AuditEvent[] {
    return this.events.filter((e) => e.actorPseudonym === actorPseudonym);
  }

  clear(): void {
    this.events = [];
  }
}

/**
 * Logger sink: Routes audit events to platform structured JSON logger.
 * Used in server runtime when DB sink is not yet attached or for dual-logging.
 */
export class LoggerAuditSink implements AuditSink {
  emit(event: AuditEvent): void {
    logger.info(`[Audit] ${event.action} (${event.outcome})`, {
      auditId: event.id,
      actorType: event.actorType,
      actorPseudonym: event.actorPseudonym,
      action: event.action,
      outcome: event.outcome,
      entityType: event.entityType,
      entityId: event.entityId,
      requestId: event.requestId,
      ipHash: event.ipHash,
      metadata: event.metadata,
      occurredAt: event.occurredAt.toISOString(),
    });
  }
}
