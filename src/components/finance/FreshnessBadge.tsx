import React from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export type FreshnessState = "FRESH" | "STALE" | "FAILING" | "UNKNOWN";

export interface FreshnessBadgeProps {
  state: FreshnessState;
  lastUpdated?: string;
  className?: string;
}

const stateConfig: Record<
  FreshnessState,
  { label: string; tone: BadgeTone; icon: string; description: string }
> = {
  FRESH: {
    label: "Fresh",
    tone: "positive",
    icon: "●",
    description: "Data is up to date",
  },
  STALE: {
    label: "Stale",
    tone: "warning",
    icon: "▲",
    description: "Newer data expected",
  },
  FAILING: {
    label: "Failing",
    tone: "negative",
    icon: "■",
    description: "Updates failing",
  },
  UNKNOWN: {
    label: "Not Configured",
    tone: "neutral",
    icon: "○",
    description: "Status unknown or not configured",
  },
};

export function FreshnessBadge({
  state,
  lastUpdated,
  className,
}: FreshnessBadgeProps) {
  const config = stateConfig[state];

  return (
    <Badge
      tone={config.tone}
      className={cn("font-medium", className)}
      title={`${config.description}${lastUpdated ? ` (as of ${lastUpdated})` : ""}`}
    >
      <span aria-hidden="true" className="text-[9px]">
        {config.icon}
      </span>
      <span>{config.label}</span>
      {lastUpdated && (
        <span className="text-text-subtle font-normal">· {lastUpdated}</span>
      )}
    </Badge>
  );
}
