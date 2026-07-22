import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/db/travel-db";
import { addParticipant, archiveTrip, copyPackingItems, deleteParticipant, restoreTrip } from "../../src/db/trip-repository";

const now = "2026-07-22T00:00:00.000Z";
const trip = (id: string) => ({ id, schemaVersion: 1 as const, title: id, startDate: "2026-08-01", endDate: "2026-08-02", timezone: "Asia/Shanghai", defaultCurrency: "CNY", participantIds: [] as string[], createdAt: now, updatedAt: now });

describe("completed trip workflows", () => {
  beforeEach(async () => { await db.delete(); await db.open(); await db.trips.bulkAdd([trip("source"), trip("target")]); });

  it("archives and restores a trip", async () => {
    await archiveTrip("source");
    expect((await db.trips.get("source"))?.archivedAt).toBeTruthy();
    await restoreTrip("source");
    expect((await db.trips.get("source"))?.archivedAt).toBeUndefined();
  });

  it("keeps the trip participant list synchronized", async () => {
    await addParticipant({ id: "p1", tripId: "source", name: "甲" });
    expect((await db.trips.get("source"))?.participantIds).toEqual(["p1"]);
    await deleteParticipant("p1");
    expect((await db.trips.get("source"))?.participantIds).toEqual([]);
  });

  it("prevents deleting the payer of an existing paid expense", async () => {
    await addParticipant({ id: "p1", tripId: "source", name: "甲" });
    await db.expenses.add({ id: "e1", tripId: "source", title: "住宿", amountMinor: 1000, currency: "CNY", status: "paid", category: "住宿", payerParticipantId: "p1", beneficiaryParticipantIds: ["p1"], splitMethod: "equal", splitValues: {}, createdAt: now, updatedAt: now });
    await expect(deleteParticipant("p1")).rejects.toThrow("付款人");
    expect(await db.participants.get("p1")).toBeTruthy();
  });

  it("copies packing items without duplicates and resets completion", async () => {
    await db.packingItems.bulkAdd([{ id: "k1", tripId: "source", category: "证件", title: "护照", quantity: 1, required: true, packed: true, sortOrder: 0 }, { id: "k2", tripId: "source", category: "衣物", title: "外套", quantity: 1, required: false, packed: true, sortOrder: 1 }, { id: "k3", tripId: "target", category: "证件", title: "护照", quantity: 1, required: true, packed: false, sortOrder: 0 }]);
    expect(await copyPackingItems("source", "target")).toBe(1);
    expect(await copyPackingItems("source", "target")).toBe(0);
    const copied = await db.packingItems.where("tripId").equals("target").toArray();
    expect(copied).toHaveLength(2);
    expect(copied.find((item) => item.title === "外套")?.packed).toBe(false);
  });
});
