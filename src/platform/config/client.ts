import { clientEnvSchema, type ClientConfig } from "./schema";

let cachedClientConfig: ClientConfig | null = null;

/**
 * Validates client-safe environment variables.
 * Extracts only keys prefixed with NEXT_PUBLIC_ to guarantee separation from server-only variables.
 */
export function validateClientEnv(
  env: Record<string, string | undefined> = process.env
): ClientConfig {
  // Extract only NEXT_PUBLIC_ variables to enforce strict separation
  const publicOnly: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith("NEXT_PUBLIC_")) {
      publicOnly[key] = value;
    }
  }

  const result = clientEnvSchema.safeParse(publicOnly);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `[Config] Client environment validation failed:\n${errorDetails}`
    );
  }

  return {
    appName: result.data.NEXT_PUBLIC_APP_NAME,
    appUrl: result.data.NEXT_PUBLIC_APP_URL,
  };
}

/**
 * Returns validated client configuration safe for exposure to client bundles.
 */
export function getClientConfig(): ClientConfig {
  if (!cachedClientConfig) {
    cachedClientConfig = validateClientEnv();
  }

  return cachedClientConfig;
}

/**
 * Resets cached client configuration (for testing).
 */
export function _resetClientConfigForTesting(): void {
  cachedClientConfig = null;
}
