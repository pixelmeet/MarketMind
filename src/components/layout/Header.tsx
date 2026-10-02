"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/components/ui/Icons";
import { FreshnessBadge } from "@/components/finance/FreshnessBadge";

export interface HeaderProps {
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export function Header({
  onMobileMenuToggle,
  isMobileMenuOpen,
}: HeaderProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName || "";
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) {
        e.preventDefault();
        router.push("/markets");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-surface px-4 md:px-6 shadow-xs">
      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-md text-text-muted hover:text-text hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileMenuOpen}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>

        {/* Brand wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-fg font-bold text-base shadow-xs">
            M
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-base tracking-tight text-text leading-tight group-hover:text-primary transition-colors">
              MarketMind <span className="text-primary font-bold">AI</span>
            </span>
            <span className="text-[10px] text-text-subtle font-medium uppercase tracking-wider leading-none">
              Indian Equities
            </span>
          </div>
        </Link>
      </div>

      {/* Global instrument search mock/trigger */}
      <div className="hidden sm:flex flex-1 max-w-md mx-4 lg:mx-8">
        <Link
          href="/markets"
          className="flex items-center w-full justify-between gap-2 px-3 py-1.5 rounded-md border border-border bg-surface-muted/60 text-xs text-text-muted hover:bg-surface-muted hover:border-border-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex items-center gap-2 truncate">
            <SearchIcon className="w-4 h-4 text-text-subtle" />
            <span>Search NSE/BSE stocks (e.g. RELIANCE, TCS)...</span>
          </span>
          <kbd className="hidden md:inline-block rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-mono text-text-subtle">
            /
          </kbd>
        </Link>
      </div>

      {/* Right side items: Data freshness summary & user session */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/status" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full">
          <FreshnessBadge state="UNKNOWN" lastUpdated="Pre-ingestion" />
        </Link>

        <Link
          href="/account"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-text hover:bg-surface-muted transition-colors border border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Account / Session settings"
        >
          <div className="h-6 w-6 rounded-full bg-surface-muted border border-border flex items-center justify-center text-xs font-bold text-text-muted">
            U
          </div>
          <span className="hidden md:inline">Demo User</span>
        </Link>
      </div>
    </header>
  );
}
