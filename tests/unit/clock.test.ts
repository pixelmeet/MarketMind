import { describe, it } from "node:test";
import assert from "node:assert";
import {
  IST_OFFSET_MINUTES,
  IST_OFFSET_MS,
  toTradeDate,
  fromTradeDate,
  isValidTradeDate,
  SystemClock,
  FrozenClock,
} from "@/platform/clock";

describe("Platform: Clock & IST Trade Dates", () => {
  it("enforces exact IST offset of UTC+05:30 (330 minutes)", () => {
    assert.strictEqual(IST_OFFSET_MINUTES, 330);
    assert.strictEqual(IST_OFFSET_MS, 330 * 60 * 1000);
  });

  it("converts UTC instants to IST trade dates across midnight boundary", () => {
    // 18:29:59.999 UTC + 5h30m = 23:59:59.999 IST -> 2026-10-02
    const beforeMidnightUtc = "2026-10-02T18:29:59.999Z";
    assert.strictEqual(toTradeDate(beforeMidnightUtc), "2026-10-02");

    // 18:30:00.000 UTC + 5h30m = 00:00:00.000 IST -> 2026-10-03 (rolls over to next day)
    const exactMidnightUtc = "2026-10-02T18:30:00.000Z";
    assert.strictEqual(toTradeDate(exactMidnightUtc), "2026-10-03");

    // 18:30:00.001 UTC + 5h30m = 00:00:00.001 IST -> 2026-10-03
    const afterMidnightUtc = "2026-10-02T18:30:00.001Z";
    assert.strictEqual(toTradeDate(afterMidnightUtc), "2026-10-03");

    // 00:00:00.000 UTC + 5h30m = 05:30:00.000 IST -> 2026-10-03
    const morningUtc = "2026-10-03T00:00:00.000Z";
    assert.strictEqual(toTradeDate(morningUtc), "2026-10-03");

    // 10:00:00.000 UTC + 5h30m = 15:30:00.000 IST (NSE market close) -> 2026-10-03
    const marketCloseUtc = "2026-10-03T10:00:00.000Z";
    assert.strictEqual(toTradeDate(marketCloseUtc), "2026-10-03");
  });

  it("handles month and year boundaries correctly", () => {
    // End of year: 2026-12-31 18:30:00 UTC is 2027-01-01 00:00:00 IST
    assert.strictEqual(toTradeDate("2026-12-31T18:29:59.000Z"), "2026-12-31");
    assert.strictEqual(toTradeDate("2026-12-31T18:30:00.000Z"), "2027-01-01");

    // Leap year February: 2024-02-28 18:30:00 UTC is 2024-02-29 00:00:00 IST
    assert.strictEqual(toTradeDate("2024-02-28T18:30:00.000Z"), "2024-02-29");
  });

  it("converts trade date back to UTC instant representing start of IST day", () => {
    const tradeDate = "2026-10-03";
    const startOfIstDayUtc = fromTradeDate(tradeDate);

    // 2026-10-03 00:00:00 IST = 2026-10-02 18:30:00.000 UTC
    assert.strictEqual(startOfIstDayUtc.toISOString(), "2026-10-02T18:30:00.000Z");
  });

  it("validates trade date calendar validity including leap years", () => {
    assert.strictEqual(isValidTradeDate("2026-10-02"), true);
    assert.strictEqual(isValidTradeDate("2024-02-29"), true); // 2024 was leap year
    assert.strictEqual(isValidTradeDate("2023-02-29"), false); // 2023 was not leap year
    assert.strictEqual(isValidTradeDate("2026-04-31"), false); // April has 30 days
    assert.strictEqual(isValidTradeDate("2026-13-01"), false); // Invalid month
    assert.strictEqual(isValidTradeDate("invalid-date"), false);
  });

  it("operates deterministically using FrozenClock", () => {
    const fixedInstant = "2026-10-02T09:30:00.000Z";
    const clock = new FrozenClock(fixedInstant);

    assert.strictEqual(clock.nowInstant(), fixedInstant);
    assert.strictEqual(clock.nowTradeDate(), "2026-10-02");

    // Advance clock across midnight boundary
    // 09:30 UTC + 9 hours = 18:30 UTC (which is next IST day 00:00)
    clock.advance(9 * 60 * 60 * 1000);

    assert.strictEqual(clock.nowInstant(), "2026-10-02T18:30:00.000Z");
    assert.strictEqual(clock.nowTradeDate(), "2026-10-03");

    // Set time explicitly
    clock.setTime("2027-01-01T00:00:00.000Z");
    assert.strictEqual(clock.nowInstant(), "2027-01-01T00:00:00.000Z");
    assert.strictEqual(clock.nowTradeDate(), "2027-01-01");
  });

  it("SystemClock returns current instant and trade date", () => {
    const clock = new SystemClock();
    const now = clock.now();
    assert.ok(now instanceof Date);
    assert.ok(isValidTradeDate(clock.nowTradeDate()));
  });
});
