import { describe, it, expect } from "vitest";
import {
  getCurrencyInfo,
  toMinorAmount,
  fromMinorAmount,
  formatMoney,
  parseMoney,
  MoneyOverflowError,
} from "../../src/domain/money";

// ---------------------------------------------------------------------------
// getCurrencyInfo
// ---------------------------------------------------------------------------

describe("getCurrencyInfo", () => {
  it("returns 0 decimals for JPY (zero-decimal currency)", () => {
    const info = getCurrencyInfo("JPY");
    expect(info.decimals).toBe(0);
    expect(info.isKnown).toBe(true);
  });

  it("returns 0 decimals for KRW", () => {
    expect(getCurrencyInfo("KRW").decimals).toBe(0);
    expect(getCurrencyInfo("KRW").isKnown).toBe(true);
  });

  it("returns 0 decimals for VND", () => {
    expect(getCurrencyInfo("VND").decimals).toBe(0);
  });

  it("returns 0 decimals for IDR", () => {
    expect(getCurrencyInfo("IDR").decimals).toBe(0);
  });

  it("returns 3 decimals for BHD (three-decimal currency)", () => {
    const info = getCurrencyInfo("BHD");
    expect(info.decimals).toBe(3);
    expect(info.isKnown).toBe(true);
  });

  it("returns 3 decimals for KWD", () => {
    expect(getCurrencyInfo("KWD").decimals).toBe(3);
  });

  it("returns 3 decimals for OMR", () => {
    expect(getCurrencyInfo("OMR").decimals).toBe(3);
  });

  it("returns 3 decimals for TND", () => {
    expect(getCurrencyInfo("TND").decimals).toBe(3);
  });

  it("returns 2 decimals with isKnown:true for common currencies", () => {
    for (const code of ["CNY", "USD", "EUR", "GBP", "AUD"]) {
      const info = getCurrencyInfo(code);
      expect(info.decimals).toBe(2);
      expect(info.isKnown).toBe(true);
    }
  });

  it("returns 2 decimals with isKnown:false for unknown currency", () => {
    const info = getCurrencyInfo("XYZ");
    expect(info.decimals).toBe(2);
    expect(info.isKnown).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(getCurrencyInfo("jpy")).toEqual(getCurrencyInfo("JPY"));
    expect(getCurrencyInfo("cny")).toEqual(getCurrencyInfo("CNY"));
  });
});

// ---------------------------------------------------------------------------
// toMinorAmount
// ---------------------------------------------------------------------------

describe("toMinorAmount", () => {
  it("converts 12.34 CNY to 1234", () => {
    expect(toMinorAmount(12.34, "CNY")).toBe(1234);
  });

  it("converts 0 CNY to 0", () => {
    expect(toMinorAmount(0, "CNY")).toBe(0);
  });

  it("converts 500 JPY (0 decimals) to 500", () => {
    expect(toMinorAmount(500, "JPY")).toBe(500);
  });

  it("converts 500.00 JPY to 500", () => {
    expect(toMinorAmount(500.0, "JPY")).toBe(500);
  });

  it("handles floating point safely for CNY", () => {
    expect(toMinorAmount(12.345, "CNY")).toBe(1235);
    expect(toMinorAmount(12.344, "CNY")).toBe(1234);
  });

  it("handles 3-decimal currency BHD", () => {
    expect(toMinorAmount(1.234, "BHD")).toBe(1234);
    expect(toMinorAmount(1.2345, "BHD")).toBe(1235);
  });

  it("handles negative amounts", () => {
    expect(toMinorAmount(-12.34, "CNY")).toBe(-1234);
  });

  it("throws on NaN input", () => {
    expect(() => toMinorAmount(NaN, "CNY")).toThrow(MoneyOverflowError);
  });

  it("throws on Infinity input", () => {
    expect(() => toMinorAmount(Infinity, "CNY")).toThrow(MoneyOverflowError);
    expect(() => toMinorAmount(-Infinity, "CNY")).toThrow(MoneyOverflowError);
  });

  it("throws when result exceeds Number.MAX_SAFE_INTEGER", () => {
    const huge = Number.MAX_SAFE_INTEGER;
    expect(() => toMinorAmount(huge, "CNY")).toThrow(MoneyOverflowError);
  });
});

// ---------------------------------------------------------------------------
// fromMinorAmount
// ---------------------------------------------------------------------------

describe("fromMinorAmount", () => {
  it("formats 1234 CNY as '12.34'", () => {
    expect(fromMinorAmount(1234, "CNY")).toBe("12.34");
  });

  it("formats 0 CNY as '0.00'", () => {
    expect(fromMinorAmount(0, "CNY")).toBe("0.00");
  });

  it("formats 500 JPY as '500'", () => {
    expect(fromMinorAmount(500, "JPY")).toBe("500");
  });

  it("formats 0 JPY as '0'", () => {
    expect(fromMinorAmount(0, "JPY")).toBe("0");
  });

  it("formats 1234 BHD as '1.234'", () => {
    expect(fromMinorAmount(1234, "BHD")).toBe("1.234");
  });

  it("handles sub-decimal values for CNY", () => {
    expect(fromMinorAmount(1, "CNY")).toBe("0.01");
    expect(fromMinorAmount(99, "CNY")).toBe("0.99");
  });

  it("handles negative amounts", () => {
    expect(fromMinorAmount(-1234, "CNY")).toBe("-12.34");
  });

  it("has no floating-point precision loss for large amounts", () => {
    expect(fromMinorAmount(999999999999, "CNY")).toBe("9999999999.99");
  });

  it("pads fraction with leading zeros", () => {
    expect(fromMinorAmount(5, "CNY")).toBe("0.05");
    expect(fromMinorAmount(100, "CNY")).toBe("1.00");
  });

  it("throws on NaN input", () => {
    expect(() => fromMinorAmount(NaN, "CNY")).toThrow(MoneyOverflowError);
  });

  it("throws on Infinity input", () => {
    expect(() => fromMinorAmount(Infinity, "CNY")).toThrow(MoneyOverflowError);
  });

  it("throws on non-safe-integer input", () => {
    const unsafe = Number.MAX_SAFE_INTEGER + 1;
    expect(() => fromMinorAmount(unsafe, "CNY")).toThrow(MoneyOverflowError);
  });
});

// ---------------------------------------------------------------------------
// formatMoney
// ---------------------------------------------------------------------------

describe("formatMoney", () => {
  it("formats 1234 CNY as '12.34 CNY'", () => {
    expect(formatMoney(1234, "CNY")).toBe("12.34 CNY");
  });

  it("formats 500 JPY as '500 JPY'", () => {
    expect(formatMoney(500, "JPY")).toBe("500 JPY");
  });

  it("uppercases the currency code", () => {
    expect(formatMoney(100, "cny")).toBe("1.00 CNY");
  });

  it("handles negative amounts", () => {
    expect(formatMoney(-500, "CNY")).toBe("-5.00 CNY");
  });
});

// ---------------------------------------------------------------------------
// parseMoney
// ---------------------------------------------------------------------------

describe("parseMoney", () => {
  it("parses '12.34 CNY' to 1234 minor units", () => {
    const result = parseMoney("12.34 CNY");
    expect(result).toEqual({ amountMinor: 1234, currency: "CNY" });
  });

  it("parses '500 JPY' to 500 minor units (0-decimal)", () => {
    const result = parseMoney("500 JPY");
    expect(result).toEqual({ amountMinor: 500, currency: "JPY" });
  });

  it("parses '1,234 CNY' with comma separator", () => {
    const result = parseMoney("1,234 CNY");
    expect(result).toEqual({ amountMinor: 123400, currency: "CNY" });
  });

  it("parses '-12.34 CNY' negative amount", () => {
    const result = parseMoney("-12.34 CNY");
    expect(result).toEqual({ amountMinor: -1234, currency: "CNY" });
  });

  it("parses '+5.00 USD' with explicit plus", () => {
    const result = parseMoney("+5.00 USD");
    expect(result).toEqual({ amountMinor: 500, currency: "USD" });
  });

  it("parses with space separator in amount", () => {
    const result = parseMoney("1 234 CNY");
    expect(result).toEqual({ amountMinor: 123400, currency: "CNY" });
  });

  it("lowercases currency codes", () => {
    const result = parseMoney("12.34 cny");
    expect(result).toEqual({ amountMinor: 1234, currency: "CNY" });
  });

  it("returns null for empty string", () => {
    expect(parseMoney("")).toBeNull();
  });

  it("returns null for string without currency", () => {
    expect(parseMoney("12.34")).toBeNull();
  });

  it("returns null for invalid format", () => {
    expect(parseMoney("abc def")).toBeNull();
  });

  it("returns null for input with multiple decimal points", () => {
    expect(parseMoney("1.2.3 CNY")).toBeNull();
    expect(parseMoney("12.34.56 USD")).toBeNull();
  });

  it("round-trips fromMinor -> parseMoney for CNY", () => {
    const formatted = fromMinorAmount(1234, "CNY");
    const parsed = parseMoney(formatted + " CNY");
    expect(parsed).toEqual({ amountMinor: 1234, currency: "CNY" });
  });

  it("round-trips fromMinor -> parseMoney for JPY", () => {
    const formatted = fromMinorAmount(500, "JPY");
    const parsed = parseMoney(formatted + " JPY");
    expect(parsed).toEqual({ amountMinor: 500, currency: "JPY" });
  });
});
