import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { WatchlistIcon } from "@/components/ui/Icons";

export default function WatchlistsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Personal Watchlists
            </h1>
            <Badge tone="neutral">User-Scoped</Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Organize and monitor equity instruments with explicit as-of timestamps and freshness badges.
          </p>
        </div>

        <Button variant="primary" disabled size="sm" title="Disabled until database and auth are established">
          + Create Watchlist
        </Button>
      </div>

      {/* Main Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>Watchlist Overview</CardTitle>
          <CardDescription>
            Lists are isolated strictly per authenticated user (doc/data-model.md §4.4).
          </CardDescription>
        </CardHeader>

        <EmptyState
          title="No watchlists have been created."
          message="You currently have no watchlists. Once the database schema is migrated in Week 5, you will be able to create custom lists, add instruments, and monitor last-bar dates."
          icon={<WatchlistIcon className="w-8 h-8 text-text-subtle" />}
          action={
            <Link href="/markets">
              <Button variant="secondary" size="sm">
                Explore Markets First
              </Button>
            </Link>
          }
          hint="Per security requirement SEC-AUTHZ-04, accessing non-owned watchlists returns a uniform NOT_FOUND."
        />
      </Card>
    </div>
  );
}
