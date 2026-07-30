import { describe, expect, it } from "vitest";
import type { Expense, PackingItem, Stop, Trip } from "../../src/domain/models";
import { calculateTripReadiness } from "../../src/domain/trip-readiness";

const trip: Trip = {
  id: "trip-1",
  schemaVersion: 1,
  title: "上海周末",
  startDate: "2026-08-01",
  endDate: "2026-08-02",
  timezone: "Asia/Shanghai",
  defaultCurrency: "CNY",
  budgetMinor: 100_000,
  participantIds: [],
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-20T00:00:00Z",
};

describe("trip readiness", () => {
  it("summarizes itinerary, budget, packing and backup state", () => {
    const stops: Stop[] = [{
      id: "stop-1",
      tripId: trip.id,
      date: trip.startDate,
      sortOrder: 0,
      title: "外滩",
      latitude: 31.24,
      longitude: 121.49,
    }];
    const expenses: Expense[] = [{
      id: "expense-1",
      tripId: trip.id,
      title: "酒店",
      amountMinor: 40_000,
      currency: "CNY",
      status: "paid",
      category: "住宿",
      beneficiaryParticipantIds: [],
      splitMethod: "equal",
      splitValues: {},
      createdAt: "2026-07-10T00:00:00Z",
      updatedAt: "2026-07-10T00:00:00Z",
    }];
    const packingItems: PackingItem[] = [{
      id: "packing-1",
      tripId: trip.id,
      category: "证件",
      title: "身份证",
      quantity: 1,
      required: true,
      packed: false,
      sortOrder: 0,
    }];

    const readiness = calculateTripReadiness(trip, stops, [], expenses, packingItems);
    expect(readiness).toMatchObject({
      totalDays: 2,
      plannedDays: 1,
      unplannedDays: 1,
      plannedExpenseMinor: 40_000,
      paidExpenseMinor: 40_000,
      budgetRemainingMinor: 60_000,
      requiredPackingItems: 1,
      packedRequiredItems: 0,
      backupNeedsRefresh: true,
    });
  });
});

