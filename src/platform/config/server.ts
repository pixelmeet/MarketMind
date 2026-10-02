import { serverEnvSchema, type ServerConfig } from "./schema";

let cachedServerConfig: ServerConfig | null = null;

/**
 * Validates server environment variables using Zod schema.
 * Throws a formatted Error with issues if validation fails.
 * Never prints actual secret values in error messages.
 */
export function validateServerEnv(
  env: Record<string, string | undefined> = process.env
): ServerConfig {
  const result = serverEnvSchema.safeParse(env);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `[Config] Server environment validation failed:\n${errorDetails}\nCheck your environment variables or .env file.`
    );
  }

  const data = result.data;

  return {
    nodeEnv: data.NODE_ENV,
    port: data.PORT,
    logLevel: data.LOG_LEVEL,
    workerMode: data.WORKER_MODE,
    isProduction: data.NODE_ENV === "production",
    isDevelopment: data.NODE_ENV === "development",
    isTest: data.NODE_ENV === "test",
    databaseUrl: data.DATABASE_URL,
    directUrl: data.DIRECT_URL,
  };
}

/**
 * Returns the validated server-side configuration singleton.
 * Guards against being loaded in client-side / browser environments.
 */
export function getServerConfig(): ServerConfig {
  if (typeof window !== "undefined") {
    throw new Error(
      "[Config] Security violation: Attempted to access server-only configuration from client bundle or browser."
    );
  }

  if (!cachedServerConfig) {
    cachedServerConfig = validateServerEnv();
  }

  return cachedServerConfig;
}

/**
 * Resets cached server configuration (used strictly for test isolation).
 */
export function _resetServerConfigForTesting(): void {
  cachedServerConfig = null;
}
