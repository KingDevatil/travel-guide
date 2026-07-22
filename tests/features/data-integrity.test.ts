import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/db/travel-db";
import { duplicateTrip } from "../../src/db/trip-repository";
import { tripDates } from "../../src/domain/dates";
import { importBackup } from "../../src/features/transfer/import-trip";

const now = "2026-07-22T00:00:00.000Z";

describe("travel data integrity", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("iterates calendar dates without moving a positive-offset trip to the previous day", () => {
    expect(tripDates("2025-10-12", "2025-10-17")).toEqual([
      "2025-10-12", "2025-10-13", "2025-10-14",
      "2025-10-15", "2025-10-16", "2025-10-17",
    ]);
  });

  it("duplicates every relationship using IDs from the copied trip", async () => {
    await db.trips.add({ id: "t1", schemaVersion: 1, title: "Source", startDate: "2026-08-01", endDate: "2026-08-02", timezone: "Asia/Shanghai", defaultCurrency: "CNY", participantIds: ["p1", "p2"], createdAt: now, updatedAt: now });
    await db.participants.bulkAdd([{ id: "p1", tripId: "t1", name: "甲" }, { id: "p2", tripId: "t1", name: "乙" }]);
    await db.stops.bulkAdd([
      { id: "s1", tripId: "t1", date: "2026-08-01", sortOrder: 0, title: "上海", latitude: 31.23, longitude: 121.47 },
      { id: "s2", tripId: "t1", date: "2026-08-02", sortOrder: 0, title: "东京", latitude: 35.68, longitude: 139.69 },
    ]);
    await db.expenses.add({ id: "e1", tripId: "t1", title: "车票", amountMinor: 10000, currency: "CNY", status: "paid", category: "交通", payerParticipantId: "p1", beneficiaryParticipantIds: ["p1", "p2"], splitMethod: "equal", splitValues: {}, legId: "l1", createdAt: now, updatedAt: now });
    await db.legs.add({ id: "l1", tripId: "t1", fromStopId: "s1", toStopId: "s2", mode: "train", expenseId: "e1" });

    await duplicateTrip("t1", "t2", "Copy");

    const copiedTrip = await db.trips.get("t2");
    const people = await db.participants.where("tripId").equals("t2").toArray();
    const stops = await db.stops.where("tripId").equals("t2").toArray();
    const legs = await db.legs.where("tripId").equals("t2").toArray();
    const expenses = await db.expenses.where("tripId").equals("t2").toArray();
    expect(copiedTrip?.participantIds.sort()).toEqual(people.map((person) => person.id).sort());
    expect(stops.map((stop) => stop.id)).toContain(legs[0].fromStopId);
    expect(stops.map((stop) => stop.id)).toContain(legs[0].toStopId);
    expect(expenses[0].id).toBe(legs[0].expenseId);
    expect(legs[0].id).toBe(expenses[0].legId);
    expect(people.map((person) => person.id)).toContain(expenses[0].payerParticipantId);
    expect(expenses[0].beneficiaryParticipantIds.every((id) => people.some((person) => person.id === id))).toBe(true);
  });

  it("validates and remaps all backup references before importing", async () => {
    const backup = {
      format: "travel-planner-backup", schemaVersion: 1, exportedAt: now, appVersion: "1.0.0",
      trip: { id: "t1", schemaVersion: 1, title: "Imported", startDate: "2026-08-01", endDate: "2026-08-02", timezone: "Asia/Shanghai", defaultCurrency: "CNY", participantIds: ["p1", "p2"], createdAt: now, updatedAt: now },
      participants: [{ id: "p1", tripId: "t1", name: "甲" }, { id: "p2", tripId: "t1", name: "乙" }],
      stops: [{ id: "s1", tripId: "t1", date: "2026-08-01", sortOrder: 0, title: "上海", latitude: 31.23, longitude: 121.47 }, { id: "s2", tripId: "t1", date: "2026-08-02", sortOrder: 0, title: "东京", latitude: 35.68, longitude: 139.69 }],
      legs: [{ id: "l1", tripId: "t1", fromStopId: "s1", toStopId: "s2", mode: "train", expenseId: "e1" }],
      expenses: [{ id: "e1", tripId: "t1", title: "车票", amountMinor: 10000, currency: "CNY", status: "paid", category: "交通", payerParticipantId: "p1", beneficiaryParticipantIds: ["p1", "p2"], splitMethod: "equal", splitValues: {}, legId: "l1", createdAt: now, updatedAt: now }],
      packingItems: [{ id: "k1", tripId: "t1", category: "证件", title: "护照", quantity: 1, required: true, packed: false, sortOrder: 0 }],
    };
    const tripId = await importBackup(JSON.stringify(backup));
    const importedTrip = await db.trips.get(tripId);
    const people = await db.participants.where("tripId").equals(tripId).toArray();
    const legs = await db.legs.where("tripId").equals(tripId).toArray();
    const expenses = await db.expenses.where("tripId").equals(tripId).toArray();
    expect(importedTrip?.participantIds.sort()).toEqual(people.map((person) => person.id).sort());
    expect(expenses[0].id).toBe(legs[0].expenseId);
    expect(legs[0].id).toBe(expenses[0].legId);
    expect(people.map((person) => person.id)).toContain(expenses[0].payerParticipantId);
  });

  it("rejects an invalid expense without leaving a partial imported trip", async () => {
    const invalid = { format: "travel-planner-backup", schemaVersion: 1, exportedAt: now, appVersion: "1", trip: { id: "t1", schemaVersion: 1, title: "Bad", startDate: "2026-08-01", endDate: "2026-08-02", timezone: "UTC", defaultCurrency: "USD", participantIds: [], createdAt: now, updatedAt: now }, participants: [], stops: [], legs: [], expenses: [{ nope: true }], packingItems: [] };
    await expect(importBackup(JSON.stringify(invalid))).rejects.toThrow();
    expect(await db.trips.count()).toBe(0);
  });
});
