import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminIcon } from "@/components/ui/Icons";

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Admin & Ingestion Operations
            </h1>
            <Badge tone="warning">Target: ADMIN (Auth Pending U-08)</Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Background worker job queue, dead-letter monitoring, and provider run audits (doc/overview.md §5).
          </p>
        </div>

        <Button variant="secondary" disabled size="sm" title="Disabled until worker is scheduled">
          Re-queue Dead Jobs
        </Button>
      </div>

      {/* Operational Security Notice */}
      <div className="p-3 rounded-md bg-surface-muted/60 border border-border text-xs text-text-muted">
        <span className="font-semibold text-text">Security Status: </span>
        Server-side role gating (ADMIN) is scheduled for Week 1 identity integration (U-08). In this foundation phase, no privileged operational actions or sensitive controls are active or exposed.
      </div>

      {/* Worker Model Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
            Worker Execution Mode
          </h3>
          <p className="text-lg font-bold text-text">Drain-and-Exit</p>
          <p className="text-xs text-text-subtle mt-1">
            Accepted decision D-016a. External cron invokes worker periodically.
          </p>
        </Card>

        <Card className="p-4">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
            Queue Ordering Strategy
          </h3>
          <p className="text-lg font-bold text-text">FIFO (runAfter ASC)</p>
          <p className="text-xs text-text-subtle mt-1">
            Accepted decision SIMPL-02. SELECT FOR UPDATE SKIP LOCKED.
          </p>
        </Card>

        <Card className="p-4">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
            Crashed-Job Recovery
          </h3>
          <p className="text-lg font-bold text-text">lockExpiresAt Reclaim</p>
          <p className="text-xs text-text-subtle mt-1">
            Accepted decision DM-01. Expired locks restored to QUEUED automatically.
          </p>
        </Card>
      </div>

      {/* Ingestion Runs Table / Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>Ingestion Run History (IngestionRun Table)</CardTitle>
          <CardDescription>
            Audit log of executed provider fetches, row validation counts, and sanitised error summaries.
          </CardDescription>
        </CardHeader>

        <EmptyState
          title="No background ingestion runs recorded."
          message="The IngestionJob and IngestionRun tables have not yet executed jobs. Once the background worker is deployed, executed batches, counts (rowsRead, rowsWritten, rowsRejected), and duration metrics will be tracked here."
          icon={<AdminIcon className="w-8 h-8 text-text-subtle" />}
          action={
            <Link href="/status">
              <Button variant="outline" size="sm">
                View Dataset Status Registry
              </Button>
            </Link>
          }
          hint="Under security requirement SEC-RATE-06, manual ingestion triggers enqueue jobs and never execute providers on the HTTP request path."
        />
      </Card>
    </div>
  );
}
