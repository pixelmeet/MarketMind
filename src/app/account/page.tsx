import React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AccountIcon } from "@/components/ui/Icons";

export default function AccountPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Account & Session Profile
            </h1>
            <Badge tone="neutral">Local Dev Session</Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Identity lifecycle and security credentials (doc/security.md §2).
          </p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20">
              <AccountIcon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Development User Context</CardTitle>
              <CardDescription>
                Running under local developer environment configuration.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-md bg-surface-muted/50 border border-border">
              <span className="text-xs text-text-subtle font-medium block">
                Session State
              </span>
              <span className="text-sm font-semibold text-text mt-0.5 block">
                Active (Local Sandbox)
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface-muted/50 border border-border">
              <span className="text-xs text-text-subtle font-medium block">
                Role Assignment
              </span>
              <span className="text-sm font-semibold text-text mt-0.5 block">
                USER / DEV_ADMIN
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface-muted/50 border border-border">
              <span className="text-xs text-text-subtle font-medium block">
                Auth Library Architecture
              </span>
              <span className="text-sm font-semibold text-text mt-0.5 block">
                Better Auth / Prisma Adapter (U-08)
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface-muted/50 border border-border">
              <span className="text-xs text-text-subtle font-medium block">
                CSRF Protection Standard
              </span>
              <span className="text-sm font-semibold text-text mt-0.5 block">
                Origin-checking (Server Actions) · SEC-AUTH-06
              </span>
            </div>
          </div>

          <div className="p-4 rounded-md border border-border bg-surface-muted/20 text-xs text-text-muted space-y-1.5">
            <span className="font-semibold text-text block">
              Security Notice (SEC-AUTH-07 & SEC-AUTHZ-01):
            </span>
            <p>
              The ADMIN role is assigned out-of-band and never through public endpoints. Server-side authorization is strictly enforced on every route. User data isolation uses verified user IDs on all repository calls.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
