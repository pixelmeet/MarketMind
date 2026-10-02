import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export function Card({
  children,
  className,
  as: Component = "div",
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        "rounded-lg border border-border bg-surface p-4 md:p-6 text-text transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1 pb-3 mb-3 border-b border-border/60", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  as: Component = "h3",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: React.ElementType }) {
  return (
    <Component
      className={cn("text-base font-semibold text-text leading-tight", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-text-muted", className)} {...props}>
      {children}
    </p>
  );
}
