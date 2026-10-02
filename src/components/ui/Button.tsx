import React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-fg hover:opacity-95 active:opacity-90 border-transparent shadow-xs",
  secondary: "bg-surface-muted text-text hover:bg-border/40 border-border active:bg-border/60",
  outline: "bg-transparent text-text hover:bg-surface-muted border-border-strong active:bg-surface-muted/80",
  ghost: "bg-transparent text-text hover:bg-surface-muted border-transparent active:bg-surface-muted/80",
  destructive: "bg-negative text-white hover:opacity-95 border-transparent active:opacity-90",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs font-medium",
  md: "px-3.5 py-2 text-sm font-medium",
  lg: "px-4 py-2.5 text-base font-medium",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors cursor-pointer select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
