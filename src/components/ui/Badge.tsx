import React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "positive" | "negative" | "warning" | "info" | "primary";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-text-muted border-border",
  positive: "bg-positive-bg text-positive border-positive/30",
  negative: "bg-negative-bg text-negative border-negative/30",
  warning: "bg-warning-bg text-warning border-warning/30",
  info: "bg-info-bg text-info border-info/30",
  primary: "bg-primary/10 text-primary border-primary/30",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border leading-none tracking-wide",
        toneStyles[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
