import { toTradeDate } from "./tradeDate";

/**
 * Injectable Clock abstraction.
 * All time-dependent services and domain logic depend on this interface,
 * allowing completely deterministic unit and integration tests.
 */
export interface Clock {
  /**
   * Returns current time as a JavaScript Date (UTC instant).
   */
  now(): Date;

  /**
   * Returns current time as an ISO-8601 UTC instant string (e.g. "2026-10-02T10:30:00.000Z").
   */
  nowInstant(): string;

  /**
   * Returns current trade date in Indian Standard Time (IST) as "YYYY-MM-DD".
   */
  nowTradeDate(): string;

  /**
   * Converts any UTC instant to an IST trade date string ("YYYY-MM-DD").
   */
  toTradeDate(input: Date | string | number): string;
}

/**
 * Standard system clock backed by the machine's real time.
 */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  nowInstant(): string {
    return this.now().toISOString();
  }

  nowTradeDate(): string {
    return toTradeDate(this.now());
  }

  toTradeDate(input: Date | string | number): string {
    return toTradeDate(input);
  }
}

/**
 * Deterministic test clock frozen at a specified point in time.
 * Supports manual advancing for time-travel testing (retries, timeouts, lock expiry).
 */
export class FrozenClock implements Clock {
  private currentTimeMs: number;

  constructor(initialTime: Date | string | number = "2026-10-02T09:30:00.000Z") {
    if (initialTime instanceof Date) {
      this.currentTimeMs = initialTime.getTime();
    } else if (typeof initialTime === "string") {
      this.currentTimeMs = new Date(initialTime).getTime();
    } else {
      this.currentTimeMs = initialTime;
    }
  }

  now(): Date {
    return new Date(this.currentTimeMs);
  }

  nowInstant(): string {
    return this.now().toISOString();
  }

  nowTradeDate(): string {
    return toTradeDate(this.currentTimeMs);
  }

  toTradeDate(input: Date | string | number): string {
    return toTradeDate(input);
  }

  /**
   * Advances the clock forward by the given milliseconds.
   */
  advance(ms: number): void {
    if (ms < 0) {
      throw new Error("[Clock] Cannot advance clock backward in time.");
    }
    this.currentTimeMs += ms;
  }

  /**
   * Sets the clock to a specific instant.
   */
  setTime(time: Date | string | number): void {
    if (time instanceof Date) {
      this.currentTimeMs = time.getTime();
    } else if (typeof time === "string") {
      this.currentTimeMs = new Date(time).getTime();
    } else {
      this.currentTimeMs = time;
    }
  }
}

/**
 * Default global system clock instance.
 */
export const systemClock = new SystemClock();
