import { describe, expect, it } from "vitest";
import { formatScheduledTimeRange, formatTimezoneLabel, isValidTimezone, toDateTimeLocalValue } from "../../src/domain/timezones";

describe("node timezone helpers", () => {
  it("formats local wall time without converting it through the device timezone", () => {
    expect(formatScheduledTimeRange("2026-10-01T09:00", "2026-10-01T10:30")).toBe("09:00—10:30");
    expect(toDateTimeLocalValue("2026-10-01T09:00:00+07:00")).toBe("2026-10-01T09:00");
  });

  it("shows the destination offset for the scheduled date", () => {
    expect(formatTimezoneLabel("Asia/Bangkok", "2026-10-01")).toBe("Asia/Bangkok（UTC+07:00）");
    expect(formatTimezoneLabel("Europe/Paris", "2026-07-01")).toBe("Europe/Paris（UTC+02:00）");
  });

  it("validates IANA timezone identifiers", () => {
    expect(isValidTimezone("Asia/Tokyo")).toBe(true);
    expect(isValidTimezone("Not/A_Timezone")).toBe(false);
  });
});
