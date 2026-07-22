import type { CurrencyCode } from "./models";

/**
 * Common currency decimal places.
 * - 0 decimals: JPY, KRW, VND, IDR, etc.
 * - 2 decimals: most major currencies (CNY, USD, EUR, GBP, AUD, etc.) — the default
 * - 3 decimals: BHD, KWD, OMR, TND
 */
const DECIMAL_TABLE: Record<string, number> = {
  // zero-decimal currencies
  JPY: 0, KRW: 0, VND: 0, IDR: 0,
  CLP: 0, PYG: 0, UGX: 0, ISK: 0,
  // three-decimal currencies
  BHD: 3, KWD: 3, OMR: 3, TND: 3,
  // common 2-decimal currencies (explicitly known)
  CNY: 2, USD: 2, EUR: 2, GBP: 2, AUD: 2,
};

const DEFAULT_DECIMALS = 2;

export interface CurrencyInfo {
  decimals: number;
  isKnown: boolean;
}

export function getCurrencyInfo(code: CurrencyCode): CurrencyInfo {
  const upper = code.toUpperCase();
  const decimals = DECIMAL_TABLE[upper];
  if (decimals !== undefined) {
    return { decimals, isKnown: true };
  }
  return { decimals: DEFAULT_DECIMALS, isKnown: false };
}

export class MoneyOverflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyOverflowError";
  }
}

export function toMinorAmount(major: number, currency: CurrencyCode): number {
  if (!Number.isFinite(major)) {
    throw new MoneyOverflowError("Amount must be a finite number");
  }
  const { decimals } = getCurrencyInfo(currency);
  const factor = 10 ** decimals;
  const result = Math.round(major * factor);
  if (!Number.isSafeInteger(result)) {
    throw new MoneyOverflowError(
      `Amount ${major} ${currency} exceeds safe integer range (result: ${result})`,
    );
  }
  return result;
}

export function fromMinorAmount(minor: number, currency: CurrencyCode): string {
  if (!Number.isFinite(minor)) {
    throw new MoneyOverflowError("Amount must be a finite number");
  }
  if (!Number.isSafeInteger(minor)) {
    throw new MoneyOverflowError(
      `Amount ${minor} exceeds safe integer range`,
    );
  }
  const { decimals } = getCurrencyInfo(currency);
  if (decimals === 0) {
    return String(minor);
  }
  const factor = 10 ** decimals;
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const intPart = String(Math.floor(abs / factor));
  const fracPart = String(abs % factor).padStart(decimals, "0");
  return sign + intPart + "." + fracPart;
}

export function formatMoney(minor: number, currency: CurrencyCode): string {
  return fromMinorAmount(minor, currency) + " " + currency.toUpperCase();
}

/**
 * Normalize an amount string by removing thousands separators while
 * preserving the decimal dot. Returns null when the input contains
 * multiple decimal dots (ambiguous / invalid).
 */
function normaliseAmount(raw: string): string | null {
  let s = raw.trim();
  if (!s) return s;

  const dotPositions: number[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ".") dotPositions.push(i);
  }

  // Multiple decimal dots: invalid input, reject
  if (dotPositions.length > 1) {
    return null;
  }

  // Remove non-digit separators (commas, spaces, middle dots, etc.)
  s = s.replace(/[,'`\s\u00B7]/g, "");

  if (dotPositions.length === 1) {
    const idx = dotPositions[0];
    const rawAfter = raw.slice(idx + 1);
    const cleanAfter = rawAfter.replace(/[,'`\s\u00B7]/g, "");
    if (/^\d{1,3}$/.test(cleanAfter)) {
      const before = raw.slice(0, idx).replace(/[,'`\s\u00B7]/g, "");
      return before + "." + cleanAfter;
    }
  }

  return s;
}

/**
 * Parse a money string like "12.34 CNY" or "1,000 JPY" into its
 * minor-unit integer and currency code.
 */
export function parseMoney(input: string): { amountMinor: number; currency: CurrencyCode } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Split at last whitespace before the currency code
  const lastSpace = trimmed.search(/\s+(?=[A-Za-z]{2,10}\s*$)/);
  if (lastSpace === -1) return null;

  const amountPart = trimmed.slice(0, lastSpace);
  const currencyPart = trimmed.slice(lastSpace).trim();

  if (!/^[A-Za-z]{2,10}$/.test(currencyPart)) return null;

  let sign = 1;
  let amt = amountPart.trim();
  if (amt.startsWith("-")) { sign = -1; amt = amt.slice(1); }
  else if (amt.startsWith("+")) { amt = amt.slice(1); }

  const amountStr = normaliseAmount(amt);
  if (amountStr === null) return null;

  const currency = currencyPart.toUpperCase();

  const major = Number.parseFloat(amountStr);
  if (!Number.isFinite(major)) return null;

  try {
    const amountMinor = sign * toMinorAmount(major, currency);
    return { amountMinor, currency };
  } catch {
    return null;
  }
}