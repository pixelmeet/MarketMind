"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavItems } from "./navConfig";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface px-2 py-1 shadow-md safe-area-pb"
    >
      <ul className="flex items-center justify-around">
        {primaryNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-1 rounded-md text-[11px] font-medium transition-colors min-h-[48px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-text-muted hover:text-text"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className={cn("w-5 h-5 mb-0.5", isActive ? "text-primary" : "text-text-subtle")} />
                <span className="truncate max-w-[64px]">{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
