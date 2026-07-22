import { describe, expect, it } from "vitest";
import type { Expense, Participant } from "../../src/domain/models";
import { allocateExpense, settle } from "../../src/features/expenses/settlement";

const people: Participant[] = [{ id: "a", tripId: "t", name: "甲" }, { id: "b", tripId: "t", name: "乙" }, { id: "c", tripId: "t", name: "丙" }];
const base: Expense = { id: "e", tripId: "t", title: "餐费", amountMinor: 100, currency: "CNY", status: "paid", category: "餐饮", payerParticipantId: "a", beneficiaryParticipantIds: ["a", "b", "c"], splitMethod: "equal", splitValues: {}, createdAt: "2026-07-22T00:00:00.000Z", updatedAt: "2026-07-22T00:00:00.000Z" };

describe("expense allocation", () => {
  it("distributes an equal remainder deterministically", () => {
    expect(allocateExpense(base, people)).toEqual({ a: 34, b: 33, c: 33 });
  });

  it("allocates by shares and preserves the smallest currency unit", () => {
    expect(allocateExpense({ ...base, amountMinor: 101, splitMethod: "shares", splitValues: { a: 1, b: 2, c: 1 } }, people)).toEqual({ a: 26, b: 50, c: 25 });
  });

  it("requires percentages to total 100", () => {
    expect(allocateExpense({ ...base, splitMethod: "percentage", splitValues: { a: 50, b: 30, c: 20 } }, people)).toEqual({ a: 50, b: 30, c: 20 });
    expect(() => allocateExpense({ ...base, splitMethod: "percentage", splitValues: { a: 50, b: 30, c: 10 } }, people)).toThrow("100");
  });

  it("requires fixed amounts to equal the expense", () => {
    expect(allocateExpense({ ...base, splitMethod: "fixed", splitValues: { a: 20, b: 30, c: 50 } }, people)).toEqual({ a: 20, b: 30, c: 50 });
    expect(() => allocateExpense({ ...base, splitMethod: "fixed", splitValues: { a: 20, b: 30, c: 40 } }, people)).toThrow("消费金额");
  });

  it("settles only paid expenses and keeps currencies independent", () => {
    const expenses = [base, { ...base, id: "cancelled", amountMinor: 900, status: "cancelled" as const }, { ...base, id: "usd", currency: "USD", amountMinor: 90, payerParticipantId: "b" }];
    const transfers = settle(expenses, people);
    expect(transfers.filter((item) => item.currency === "CNY").reduce((sum, item) => sum + item.amountMinor, 0)).toBe(66);
    expect(transfers.filter((item) => item.currency === "USD").reduce((sum, item) => sum + item.amountMinor, 0)).toBe(60);
  });
});
