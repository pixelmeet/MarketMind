import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FreshnessBadge } from "@/components/finance/FreshnessBadge";
import { MarketsIcon, SearchIcon } from "@/components/ui/Icons";

export default function MarketsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Markets & Equity Search
            </h1>
            <Badge tone="neutral">NSE · BSE</Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Search Indian equity instruments and review daily historical price charts with technical indicators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <FreshnessBadge state="UNKNOWN" lastUpdated="Pre-ingestion" />
        </div>
      </div>

      {/* Search Bar Placeholder */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-subtle">
              <SearchIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              disabled
              placeholder="Search by Symbol (e.g. INFOSYS, HDFCBANK) or ISIN — Inactive until provider approved..."
              className="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-surface-muted/50 text-sm text-text-muted placeholder:text-text-subtle cursor-not-allowed"
            />
          </div>
          <Button variant="secondary" disabled size="md">
            Search
          </Button>
        </div>
      </Card>

      {/* Main Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Price Analytics</CardTitle>
          <CardDescription>
            Daily OHLCV series (1M, 6M, 1Y, 5Y) and calculated overlays.
          </CardDescription>
        </CardHeader>

        <EmptyState
          title="Market data is not configured yet."
          message="Under architectural decision D-006 and security requirement SEC-EXT-04, no live external API calls are made on the request path. An approved market data provider with verified storage and display rights (open decision U-01) is required before instrument ingestion begins."
          icon={<MarketsIcon className="w-8 h-8 text-text-subtle" />}
          action={
            <Link href="/status">
              <Button variant="outline" size="sm">
                Check Data Ingestion Status
              </Button>
            </Link>
          }
          hint="Supported technical indicators in MVP: SMA, EMA, RSI (Wilder), MACD (12/26/9), and Bollinger Bands computed pure on read."
        />
      </Card>
    </div>
  );
}
