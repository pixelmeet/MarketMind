/**
 * MarketMind AI — Class composition helper
 * Pure local helper without external dependencies (doc/design.md §3.3).
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
