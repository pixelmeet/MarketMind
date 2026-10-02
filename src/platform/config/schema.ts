import { z } from "zod";

/**
 * Server-only environment variable schema.
 * All variables here are strictly server-side and must never be exposed to client bundles.
 * 
 * Note: Database, authentication, AI, and market-data credentials are NOT required
 * here until their respective decisions are approved and implemented.
 */
export const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
  WORKER_MODE: z
    .enum(["drain-and-exit", "loop"])
    .default("drain-and-exit"),
  // Optional future credentials (strictly optional in Phase 2.1)
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  AUDIT_PSEUDONYM_KEY: z.string().optional(),
});

export type RawServerEnv = z.infer<typeof serverEnvSchema>;

export interface ServerConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  logLevel: "debug" | "info" | "warn" | "error";
  workerMode: "drain-and-exit" | "loop";
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  databaseUrl?: string;
  directUrl?: string;
}

/**
 * Client-safe environment variable schema.
 * Only non-secret, explicitly public variables with the NEXT_PUBLIC_ prefix are permitted.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("MarketMind AI"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type RawClientEnv = z.infer<typeof clientEnvSchema>;

export interface ClientConfig {
  appName: string;
  appUrl: string;
}
