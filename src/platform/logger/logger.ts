import { redactSensitiveData } from "./redaction";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LogContext {
  requestId?: string;
  module?: string;
  route?: string;
  action?: string;
  userRef?: string;
  jobId?: string;
  providerKey?: string;
  durationMs?: number;
  errorCode?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  requestId?: string;
  module?: string;
  route?: string;
  action?: string;
  userRef?: string;
  jobId?: string;
  providerKey?: string;
  durationMs?: number;
  errorCode?: string;
  details?: Record<string, unknown>;
}

export type LogSink = (line: string) => void;

export interface LoggerOptions {
  level?: LogLevel;
  context?: LogContext;
  sink?: LogSink;
}

export interface Logger {
  debug(msg: string, context?: LogContext): void;
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext): void;
  error(msg: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}

export class StructuredLogger implements Logger {
  private level: LogLevel;
  private baseContext: LogContext;
  private sink: LogSink;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? "info";
    this.baseContext = options.context ?? {};
    this.sink =
      options.sink ??
      ((line: string) => {
        // Output single-line JSON to process.stdout
        process.stdout.write(line + "\n");
      });
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  }

  private write(level: LogLevel, msg: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const merged = { ...this.baseContext, ...(context ?? {}) };

    // Extract known top-level fields
    const {
      requestId,
      module,
      route,
      action,
      userRef,
      jobId,
      providerKey,
      durationMs,
      errorCode,
      ...extra
    } = merged;

    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      msg: String(redactSensitiveData(msg)),
      ...(requestId ? { requestId: String(requestId) } : {}),
      ...(module ? { module: String(module) } : {}),
      ...(route ? { route: String(route) } : {}),
      ...(action ? { action: String(action) } : {}),
      ...(userRef ? { userRef: String(redactSensitiveData(userRef)) } : {}),
      ...(jobId ? { jobId: String(jobId) } : {}),
      ...(providerKey ? { providerKey: String(providerKey) } : {}),
      ...(typeof durationMs === "number" ? { durationMs } : {}),
      ...(errorCode ? { errorCode: String(errorCode) } : {}),
    };

    if (Object.keys(extra).length > 0) {
      entry.details = redactSensitiveData(extra) as Record<string, unknown>;
    }

    const json = JSON.stringify(entry);
    this.sink(json);
  }

  debug(msg: string, context?: LogContext): void {
    this.write("debug", msg, context);
  }

  info(msg: string, context?: LogContext): void {
    this.write("info", msg, context);
  }

  warn(msg: string, context?: LogContext): void {
    this.write("warn", msg, context);
  }

  error(msg: string, context?: LogContext): void {
    this.write("error", msg, context);
  }

  child(context: LogContext): Logger {
    return new StructuredLogger({
      level: this.level,
      context: { ...this.baseContext, ...context },
      sink: this.sink,
    });
  }
}

/**
 * Default global logger singleton.
 */
export const logger = new StructuredLogger({
  level: (process.env.LOG_LEVEL as LogLevel) || "info",
});
