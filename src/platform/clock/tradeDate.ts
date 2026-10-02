/**
 * MarketMind AI — Indian Standard Time (IST) Trade Date Utilities
 * Defined in doc/data-model.md §1 and doc/backend.md §7.3.
 *
 * IST is fixed at UTC+05:30 with no Daylight Saving Time (DST).
 * Trade dates are exchange-day dates (Asia/Kolkata), formatted strictly as `YYYY-MM-DD`.
 * All conversion logic here is machine-timezone independent.
 */

export const IST_OFFSET_MINUTES = 330;
export const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000; // 19,800,000 ms

const TRADE_DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Validates whether a string is a valid ISO date `YYYY-MM-DD` that corresponds to a real calendar date.
 */
export function isValidTradeDate(tradeDate: string): boolean {
  if (!TRADE_DATE_REGEX.test(tradeDate)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = tradeDate.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Validate days in month (including leap years)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

/**
 * Converts any UTC instant (Date, ISO string, or epoch ms) to the corresponding
 * IST trading date formatted as `YYYY-MM-DD`.
 * 
 * Never relies on local machine timezone.
 */
export function toTradeDate(input: Date | string | number): string {
  let epochMs: number;

  if (input instanceof Date) {
    epochMs = input.getTime();
  } else if (typeof input === "string") {
    const parsed = new Date(input);
    if (isNaN(parsed.getTime())) {
      throw new Error(`[Clock] Invalid date string provided to toTradeDate: "${input}"`);
    }
    epochMs = parsed.getTime();
  } else if (typeof input === "number") {
    epochMs = input;
  } else {
    throw new Error("[Clock] Invalid input type provided to toTradeDate.");
  }

  // Shift UTC epoch ms by the fixed IST offset (+05:30)
  const istShifted = new Date(epochMs + IST_OFFSET_MS);

  const year = istShifted.getUTCFullYear();
  const month = String(istShifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istShifted.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Converts a `YYYY-MM-DD` IST trade date to the UTC instant corresponding to
 * the start of that day in IST (00:00:00.000 IST = 18:30:00.000 UTC of previous day).
 */
export function fromTradeDate(tradeDate: string): Date {
  if (!isValidTradeDate(tradeDate)) {
    throw new Error(`[Clock] Invalid trade date format or calendar date: "${tradeDate}". Expected YYYY-MM-DD.`);
  }

  const [yearStr, monthStr, dayStr] = tradeDate.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  // 00:00:00 in IST is (00:00:00 UTC - 5h30m)
  const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - IST_OFFSET_MS);
  return utcDate;
}
