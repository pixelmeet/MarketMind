"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavItems, secondaryNavItems } from "./navConfig";
import { cn } from "@/lib/utils";

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-border bg-surface min-h-[calc(100vh-4rem)] p-4">
      <nav aria-label="Primary Navigation" className="flex flex-col flex-1 gap-6">
        <div>
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
            Core Modules
          </div>
          <ul className="space-y-1">
            {primaryNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isActive
                        ? "bg-primary text-primary-fg shadow-xs font-semibold"
                        : "text-text-muted hover:bg-surface-muted hover:text-text"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className={cn("w-5 h-5", isActive ? "text-primary-fg" : "text-text-subtle")} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="pt-4 border-t border-border/60">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
            System & Operations
          </div>
          <ul className="space-y-1">
            {secondaryNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isActive
                        ? "bg-primary text-primary-fg shadow-xs font-semibold"
                        : "text-text-muted hover:bg-surface-muted hover:text-text"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className={cn("w-5 h-5", isActive ? "text-primary-fg" : "text-text-subtle")} />
                    <span>{item.name}</span>
                    {item.isAdminOnly && (
                      <span className="ml-auto text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-surface-muted text-text-subtle border border-border/80">
                        Admin
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Phase notice box */}
        <div className="mt-auto p-3 rounded-md bg-surface-muted border border-border text-xs">
          <div className="font-semibold text-text mb-1 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            Phase 2: Foundation
          </div>
          <p className="text-text-muted text-[11px] leading-relaxed">
            MarketMind AI is running in clean foundation mode. Real data ingestion begins after provider licensing sign-off.
          </p>
        </div>
      </nav>
    </aside>
  );
}
