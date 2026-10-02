import React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  hint?: string;
  className?: string;
}

export function EmptyState({
  title,
  message,
  icon,
  action,
  hint,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-6 sm:p-8 rounded-lg border border-dashed border-border bg-surface-muted/30",
        className
      )}
    >
      {icon && (
        <div className="mb-3 text-text-subtle p-3 rounded-full bg-surface-muted/80">
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-text mb-1">{title}</h4>
      <p className="text-sm text-text-muted max-w-md mb-4">{message}</p>
      {action && <div className="mt-1">{action}</div>}
      {hint && <p className="text-xs text-text-subtle mt-3">{hint}</p>}
    </div>
  );
}
