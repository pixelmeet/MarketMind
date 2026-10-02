import { describe, it } from "node:test";
import assert from "node:assert";
import {
  validateServerEnv,
  validateClientEnv,
  getServerConfig,
  _resetServerConfigForTesting,
} from "@/platform/config";

describe("Platform: Config", () => {
  it("parses valid server configuration with default values", () => {
    const config = validateServerEnv({});
    assert.strictEqual(config.nodeEnv, "development");
    assert.strictEqual(config.port, 3000);
    assert.strictEqual(config.logLevel, "info");
    assert.strictEqual(config.workerMode, "drain-and-exit");
    assert.strictEqual(config.isProduction, false);
    assert.strictEqual(config.isDevelopment, true);
    assert.strictEqual(config.isTest, false);
  });

  it("parses valid custom server environment variables", () => {
    const config = validateServerEnv({
      NODE_ENV: "production",
      PORT: "8080",
      LOG_LEVEL: "warn",
      WORKER_MODE: "loop",
      DATABASE_URL: "postgresql://localhost:5432/db",
    });

    assert.strictEqual(config.nodeEnv, "production");
    assert.strictEqual(config.port, 8080);
    assert.strictEqual(config.logLevel, "warn");
    assert.strictEqual(config.workerMode, "loop");
    assert.strictEqual(config.isProduction, true);
    assert.strictEqual(config.isDevelopment, false);
    assert.strictEqual(config.databaseUrl, "postgresql://localhost:5432/db");
  });

  it("fails fast on invalid server environment variables", () => {
    assert.throws(
      () => {
        validateServerEnv({
          NODE_ENV: "invalid-env" as unknown as string,
        });
      },
      (err: Error) => {
        assert.match(err.message, /Server environment validation failed/);
        assert.match(err.message, /NODE_ENV/);
        return true;
      }
    );

    assert.throws(
      () => {
        validateServerEnv({
          PORT: "not-a-number",
        });
      },
      (err: Error) => {
        assert.match(err.message, /PORT/);
        return true;
      }
    );

    assert.throws(
      () => {
        validateServerEnv({
          PORT: "70000", // Out of port range (max 65535)
        });
      },
      (err: Error) => {
        assert.match(err.message, /PORT/);
        return true;
      }
    );
  });

  it("never prints actual secret values in error messages", () => {
    const secretValue = "super-secret-password-12345";
    try {
      validateServerEnv({
        PORT: secretValue, // Intentionally pass secret to invalid field
      });
      assert.fail("Should have thrown validation error");
    } catch (err: unknown) {
      const message = (err as Error).message;
      assert.doesNotMatch(message, new RegExp(secretValue));
    }
  });

  it("parses valid client configuration with defaults", () => {
    const config = validateClientEnv({});
    assert.strictEqual(config.appName, "MarketMind AI");
    assert.strictEqual(config.appUrl, "http://localhost:3000");
  });

  it("parses valid custom client configuration", () => {
    const config = validateClientEnv({
      NEXT_PUBLIC_APP_NAME: "Custom MarketMind",
      NEXT_PUBLIC_APP_URL: "https://marketmind.internal",
    });
    assert.strictEqual(config.appName, "Custom MarketMind");
    assert.strictEqual(config.appUrl, "https://marketmind.internal");
  });

  it("fails fast on invalid client configuration (e.g. malformed URL)", () => {
    assert.throws(
      () => {
        validateClientEnv({
          NEXT_PUBLIC_APP_URL: "not-a-valid-url",
        });
      },
      (err: Error) => {
        assert.match(err.message, /Client environment validation failed/);
        assert.match(err.message, /NEXT_PUBLIC_APP_URL/);
        return true;
      }
    );
  });

  it("enforces server and client environment-variable separation", () => {
    // Client validator strictly ignores server-only variables
    const clientConfig = validateClientEnv({
      SECRET_SERVER_KEY: "secret-value",
      DATABASE_URL: "postgresql://localhost:5432/db",
      NEXT_PUBLIC_APP_NAME: "MarketMind Client",
    });

    assert.strictEqual(clientConfig.appName, "MarketMind Client");
    assert.strictEqual((clientConfig as unknown as Record<string, unknown>).SECRET_SERVER_KEY, undefined);
    assert.strictEqual((clientConfig as unknown as Record<string, unknown>).DATABASE_URL, undefined);
  });

  it("guards getServerConfig against browser window access", () => {
    _resetServerConfigForTesting();

    // Simulate browser window
    const originalWindow = globalThis.window;
    try {
      (globalThis as unknown as { window: Record<string, unknown> }).window = {};
      assert.throws(
        () => {
          getServerConfig();
        },
        (err: Error) => {
          assert.match(err.message, /Security violation/);
          return true;
        }
      );
    } finally {
      (globalThis as unknown as { window: unknown }).window = originalWindow;
      _resetServerConfigForTesting();
    }
  });
});
