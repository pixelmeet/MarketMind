"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "./Header";
import { SideNav } from "./SideNav";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { primaryNavItems, secondaryNavItems } from "./navConfig";

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text antialiased">
      {/* Skip to main content link for keyboard accessibility (doc/design.md §12.2) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-fg focus:rounded-md focus:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        Skip to main content
      </a>

      {/* Top Application Header */}
      <Header
        isMobileMenuOpen={isMobileDrawerOpen}
        onMobileMenuToggle={() => setIsMobileDrawerOpen((prev) => !prev)}
      />

      {/* Mobile Drawer (Slide-out menu for < lg screens) */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer content */}
          <div className="relative flex flex-col w-72 max-w-[80%] bg-surface border-r border-border p-4 shadow-xl z-50">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="font-semibold text-base">Navigation</span>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-muted"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-col gap-4 mt-4 overflow-y-auto">
              <div>
                <span className="text-[10px] font-semibold text-text-subtle uppercase tracking-wider px-2">
                  Core Modules
                </span>
                <ul className="mt-1 space-y-1">
                  {primaryNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileDrawerOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
                        >
                          <Icon className="w-5 h-5 text-text-subtle" />
                          <span>{item.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="pt-3 border-t border-border">
                <span className="text-[10px] font-semibold text-text-subtle uppercase tracking-wider px-2">
                  System & Operations
                </span>
                <ul className="mt-1 space-y-1">
                  {secondaryNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileDrawerOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
                        >
                          <Icon className="w-5 h-5 text-text-subtle" />
                          <span>{item.name}</span>
                          {item.isAdminOnly && (
                            <span className="ml-auto text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-surface-muted text-text-subtle border border-border">
                              Admin
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-row w-full max-w-screen-2xl mx-auto">
        {/* Desktop Sidebar Navigation */}
        <SideNav />

        {/* Scrollable Main Content */}
        <main id="main" tabIndex={-1} className="flex-1 p-4 md:p-6 lg:p-8 min-w-0 outline-none">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />

      {/* Persistent Footer */}
      <Footer />
    </div>
  );
}
