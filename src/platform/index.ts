/**
 * MarketMind AI — Platform Foundation Module
 * 
 * Central platform layer providing cross-cutting, domain-independent infrastructure:
 * - Configuration validation (server and client separation)
 * - Closed Error Taxonomy and HTTP status mapping
 * - Deterministic Clock and IST Trade Date conversion
 * - Structured JSON Logger with secret redaction
 */

export * from "./config";
export * from "./errors";
export * from "./clock";
export * from "./logger";
