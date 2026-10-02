import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PortfolioIcon } from "@/components/ui/Icons";

export default function PortfolioPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Portfolio & Analytics
            </h1>
            <Badge tone="neutral">Ledger Architecture</Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Manual BUY/SELL transaction entry with derived holdings, weighted-average cost basis, and concentration metrics.
          </p>
        </div>

        <Button variant="primary" disabled size="sm" title="Disabled until portfolio migration in Week 6">
          + Add Transaction
        </Button>
      </div>

      {/* Main Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>Holdings & Risk Concentration</CardTitle>
          <CardDescription>
            Calculations are performed at read time from the immutable transaction ledger.
          </CardDescription>
        </CardHeader>

        <EmptyState
          title="No portfolio entries are available."
          message="No portfolio transactions have been entered. MarketMind tracks portfolios using an append-only transaction ledger rather than mutable holding snapshots, guaranteeing zero drift between records and analytics."
          icon={<PortfolioIcon className="w-8 h-8 text-text-subtle" />}
          action={
            <Link href="/">
              <Button variant="secondary" size="sm">
                Return to Dashboard
              </Button>
            </Link>
          }
          hint="Supported analytics: Weighted-average cost basis, unrealized P&L, Top-N allocation weight, and Herfindahl-Hirschman Index (HHI)."
        />
      </Card>
    </div>
  );
}
