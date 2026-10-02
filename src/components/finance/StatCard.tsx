import React from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    isPositive: boolean;
    label?: string;
  };
  asOf?: string;
  description?: string;
  warning?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  asOf,
  description,
  warning,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("flex flex-col justify-between h-full", className)}>
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h3 className="text-sm font-medium text-text-muted">{title}</h3>
          {description && (
            <span
              className="text-xs text-text-subtle cursor-help"
              title={description}
            >
              ℹ
            </span>
          )}
        </div>
        <div className="text-2xl md:text-3xl font-semibold text-text tracking-tight tabular-nums my-1">
          {value}
        </div>
        {change && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium tabular-nums mt-1",
              change.isPositive ? "text-positive" : "text-negative"
            )}
          >
            <span aria-hidden="true">{change.isPositive ? "▲ +" : "▼ −"}</span>
            <span>{change.value}</span>
            {change.label && (
              <span className="text-text-subtle font-normal">
                {change.label}
              </span>
            )}
            <span className="sr-only">
              {change.isPositive ? "Increase of " : "Decrease of "}
              {change.value}
            </span>
          </div>
        )}
        {warning && (
          <div className="mt-2 text-xs font-medium text-warning bg-warning-bg/60 border border-warning/20 rounded px-2 py-1">
            ⚠ {warning}
          </div>
        )}
      </div>
      {asOf && (
        <div className="mt-4 pt-2 border-t border-border/40 text-[11px] text-text-subtle">
          As of: {asOf}
        </div>
      )}
    </Card>
  );
}
