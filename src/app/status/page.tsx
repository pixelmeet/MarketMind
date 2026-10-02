import React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FreshnessBadge, type FreshnessState } from "@/components/finance/FreshnessBadge";

interface DatasetRow {
  dataset: string;
  name: string;
  source: string;
  state: FreshnessState;
  decisionRef: string;
  notes: string;
}

const datasets: DatasetRow[] = [
  {
    dataset: "INSTRUMENT_MASTER",
    name: "Equity Instrument Master",
    source: "Pending Provider Selection",
    state: "UNKNOWN",
    decisionRef: "U-01",
    notes: "NSE/BSE equities universe and ISIN mappings. Seed planned for Week 2-3.",
  },
  {
    dataset: "PRICES_DAILY",
    name: "Daily OHLCV History",
    source: "Pending Provider Selection",
    state: "UNKNOWN",
    decisionRef: "U-01",
    notes: "1M/6M/1Y/5Y daily trading bars. Ingestion blocked on licence review gate.",
  },
  {
    dataset: "CORPORATE_ACTIONS",
    name: "Splits, Bonuses & Dividends",
    source: "Pending Selection",
    state: "UNKNOWN",
    decisionRef: "U-04",
    notes: "Adjustment basis for price series and portfolio holdings.",
  },
  {
    dataset: "NEWS",
    name: "Company News Articles",
    source: "Pending Selection",
    state: "UNKNOWN",
    decisionRef: "U-02",
    notes: "Ingestion with strict licence restrictions (FULL_TEXT, SNIPPET_ONLY, LINK_ONLY).",
  },
  {
    dataset: "DISCLOSURES",
    name: "Regulatory Filings",
    source: "Pending Selection",
    state: "UNKNOWN",
    decisionRef: "U-02",
    notes: "Official exchange announcements and corporate filings for AI grounding.",
  },
];

export default function StatusPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Data Status & Ingestion Cadence
            </h1>
            <Badge tone="neutral">Operational Visibility</Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Real-time freshness monitoring and dataset lifecycle status (doc/overview.md §2.7).
          </p>
        </div>

        <FreshnessBadge state="UNKNOWN" lastUpdated="Pre-ingestion baseline" />
      </div>

      {/* Dataset Freshness Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dataset Freshness Registry (DataFreshness Table)</CardTitle>
          <CardDescription>
            Freshness state is a worker-written cache. Programmatic logic always references authoritative fields: lastSuccessAt, lastDataDate, and consecutiveFailures (doc/overview.md §5).
          </CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Dataset Ingestion Freshness Status</caption>
            <thead className="bg-surface-muted/60 text-xs uppercase text-text-muted border-b border-border">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Dataset Identifier</th>
                <th scope="col" className="px-4 py-3 font-semibold">Description</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status Badge</th>
                <th scope="col" className="px-4 py-3 font-semibold">Source Ref</th>
                <th scope="col" className="px-4 py-3 font-semibold">Operational Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {datasets.map((item) => (
                <tr key={item.dataset} className="hover:bg-surface-muted/30 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs font-semibold text-text">
                    {item.dataset}
                  </td>
                  <td className="px-4 py-3.5 text-text">
                    {item.name}
                  </td>
                  <td className="px-4 py-3.5">
                    <FreshnessBadge state={item.state} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-surface-muted text-text-muted border border-border">
                      {item.decisionRef}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-text-muted max-w-sm">
                    {item.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Authority and Recovery Rules Notice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-surface-muted/30">
          <h3 className="text-sm font-semibold text-text mb-1">
            DataFreshness Authority Rules (DM-02)
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            The stored <code className="font-mono text-text">state</code> is a convenience cache written by the worker. The application reads it for badge display. Programmatic logic re-derives from <code className="font-mono text-text">lastSuccessAt</code> and <code className="font-mono text-text">consecutiveFailures</code>.
          </p>
        </Card>

        <Card className="p-4 bg-surface-muted/30">
          <h3 className="text-sm font-semibold text-text mb-1">
            Crashed-Job Recovery (DM-01)
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            All <code className="font-mono text-text">IngestionJob</code> rows carry a <code className="font-mono text-text">lockExpiresAt</code> timestamp. Jobs left RUNNING by an interrupted worker are reclaimed to QUEUED automatically on the next cycle without consuming retry budgets.
          </p>
        </Card>
      </div>
    </div>
  );
}
