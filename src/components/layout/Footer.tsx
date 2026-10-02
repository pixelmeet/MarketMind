import React from "react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-surface px-4 py-6 md:px-8 text-xs text-text-muted mb-16 lg:mb-0">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Mandatory persistent disclaimer */}
        <div className="flex flex-col gap-1 text-center md:text-left max-w-2xl">
          <p className="font-semibold text-text">
            Mandatory Regulatory Disclaimer
          </p>
          <p className="text-text-muted leading-relaxed">
            MarketMind AI is an educational and financial research platform for Indian equities. It is NOT a registered investment advisor, broker-dealer, or research analyst. All content, data, metrics, indicators, and AI-assisted summaries are strictly for informational and educational purposes. Never base financial or investment decisions solely on this platform.
          </p>
        </div>

        {/* Technical standards and timestamp conventions */}
        <div className="flex flex-col items-center md:items-end gap-1 shrink-0 text-text-subtle text-[11px]">
          <p>Timezone standard: IST trade dates · UTC instants</p>
          <p>Financial precision: Fixed Decimal arithmetic</p>
          <p>© {new Date().getFullYear()} MarketMind AI. Phase 2 Foundation.</p>
        </div>
      </div>
    </footer>
  );
}
