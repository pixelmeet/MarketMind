import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FreshnessBadge } from "@/components/finance/FreshnessBadge";
import { StatCard } from "@/components/finance/StatCard";
import {
  MarketsIcon,
  WatchlistIcon,
  PortfolioIcon,
  StatusIcon,
} from "@/components/ui/Icons";

export default function DashboardPage() {
  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Page Title & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Market Dashboard
            </h1>
            <Badge tone="primary">Phase 2</Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Indian equity research, price history analytics, and grounded disclosure intelligence.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto text-xs text-text-subtle">
          <span>Date: {currentDate} (IST)</span>
          <FreshnessBadge state="UNKNOWN" lastUpdated="Pre-ingestion" />
        </div>
      </div>

      {/* Top Metric Cards (Calm density, factual baseline, no invented numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tracked Instruments"
          value="0"
          description="NSE/BSE equities stored in the local instrument master"
          warning="Market data provider pending licensing (U-01)"
          asOf="Baseline"
        />
        <StatCard
          title="Active Watchlists"
          value="0"
          description="Personal equity lists tracked by user"
          asOf="Local Session"
        />
        <StatCard
          title="Portfolio Value"
          value="₹0.00"
          description="Derived on read from manual BUY/SELL transaction ledger"
          asOf="Ledger Derived"
        />
        <StatCard
          title="AI Grounded Queries"
          value="0"
          description="Q&A answers backed by verified machine-checked citations"
          asOf="Evidence Engine"
        />
      </div>

      {/* Core Functional Sections (Showing exact required empty states) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Market Data & Research */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MarketsIcon className="w-5 h-5 text-primary" />
                <CardTitle>Indian Equity Markets</CardTitle>
              </div>
              <Badge tone="neutral">NSE · BSE</Badge>
            </div>
            <CardDescription>
              Historical daily OHLCV price charts, SMA, EMA, RSI, and MACD indicators.
            </CardDescription>
          </CardHeader>

          <EmptyState
            title="Market data is not configured yet."
            message="Live and historical market data feeds remain unconfigured pending source licence verification (open decision U-01). Per system design, no simulated market prices or fake price changes are displayed."
            icon={<MarketsIcon className="w-6 h-6 text-text-subtle" />}
            action={
              <Link href="/markets">
                <Button variant="secondary" size="sm">
                  View Markets Interface
                </Button>
              </Link>
            }
            hint="Daily OHLCV charts will read exclusively from the verified local PostgreSQL store."
          />
        </Card>

        {/* Section 2: Watchlists */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WatchlistIcon className="w-5 h-5 text-primary" />
                <CardTitle>Personal Watchlists</CardTitle>
              </div>
              <Badge tone="neutral">User-Scoped</Badge>
            </div>
            <CardDescription>
              Named watchlist tracking with per-item freshness badges and exchange trade dates.
            </CardDescription>
          </CardHeader>

          <EmptyState
            title="No watchlists have been created."
            message="You have not created any watchlists yet. Once instruments are indexed, you will be able to organize equities into custom lists with date-of-last-bar freshness indicators."
            icon={<WatchlistIcon className="w-6 h-6 text-text-subtle" />}
            action={
              <Link href="/watchlists">
                <Button variant="secondary" size="sm">
                  Manage Watchlists
                </Button>
              </Link>
            }
            hint="Watchlists are strictly isolated per user and verified server-side."
          />
        </Card>

        {/* Section 3: Portfolio & Analytics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PortfolioIcon className="w-5 h-5 text-primary" />
                <CardTitle>Portfolio & Allocation</CardTitle>
              </div>
              <Badge tone="neutral">Ledger Based</Badge>
            </div>
            <CardDescription>
              Weighted-average cost basis, unrealized P&L, and Herfindahl-Hirschman Index (HHI).
            </CardDescription>
          </CardHeader>

          <EmptyState
            title="No portfolio entries are available."
            message="No transactions have been recorded. MarketMind uses an append-only transaction ledger (BUY/SELL) to compute current holdings, cost basis, and concentration metrics at read time."
            icon={<PortfolioIcon className="w-6 h-6 text-text-subtle" />}
            action={
              <Link href="/portfolio">
                <Button variant="secondary" size="sm">
                  Open Portfolio Ledger
                </Button>
              </Link>
            }
            hint="All calculations use fixed-decimal arithmetic to ensure financial precision."
          />
        </Card>

        {/* Section 4: AI Disclosure Research */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon className="w-5 h-5 text-primary" />
                <CardTitle>AI Grounding Engine</CardTitle>
              </div>
              <Badge tone="warning">Abstain-First</Badge>
            </div>
            <CardDescription>
              Evidence-grounded Q&A with machine-checked citations and advice abstention.
            </CardDescription>
          </CardHeader>

          <EmptyState
            title="AI research is not available until its evidence sources are configured."
            message="The AI explanation engine requires approved company news and regulatory disclosure sources (U-02). Per design rules, the system abstains from answering rather than hallucinating or generating uncited claims."
            icon={<StatusIcon className="w-6 h-6 text-text-subtle" />}
            action={
              <Link href="/status">
                <Button variant="secondary" size="sm">
                  Inspect System Status
                </Button>
              </Link>
            }
            hint="Deterministic policy gates block investment advice and price forecasts."
          />
        </Card>
      </div>

      {/* Architecture Readiness & Dataset Summary */}
      <Card className="bg-surface-muted/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-border/60">
          <div>
            <h3 className="text-base font-semibold text-text">
              Architecture Readiness & Ingestion Boundaries
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Current system state verified against Phase 1.1 architecture documentation.
            </p>
          </div>
          <Link href="/status">
            <Button variant="outline" size="sm">
              View Detailed Dataset Matrix
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-md bg-surface border border-border">
            <span className="font-semibold text-text block mb-1">
              Provider Isolation (D-006)
            </span>
            <p className="text-text-muted leading-relaxed">
              Users never trigger live market-data calls on the request path. All reads will be served from PostgreSQL.
            </p>
          </div>

          <div className="p-3 rounded-md bg-surface border border-border">
            <span className="font-semibold text-text block mb-1">
              Licence Gate Enforced (D-014)
            </span>
            <p className="text-text-muted leading-relaxed">
              Adapters require verified licence permissions (`licenseReviewedAt`) before ingestion runs can be scheduled.
            </p>
          </div>

          <div className="p-3 rounded-md bg-surface border border-border">
            <span className="font-semibold text-text block mb-1">
              Abstention Protocol (D-009)
            </span>
            <p className="text-text-muted leading-relaxed">
              Queries without machine-verifiable citations or requesting price predictions result in deterministic abstention.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
