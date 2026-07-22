import { describe, it, expect, afterAll } from "vitest";
import Dexie from "dexie";

class TestDB extends Dexie {
  constructor() {
    super("__verify_db__");
    this.version(1).stores({
      trips: "&id, title, archivedAt, createdAt, updatedAt",
      participants: "&id, tripId",
      stops: "&id, tripId, date, sortOrder",
      legs: "&id, tripId, fromStopId, toStopId",
      expenses: "&id, tripId, status",
      packingItems: "&id, tripId, category, sortOrder",
    });
  }
}

const db = new TestDB();
const now = new Date().toISOString();

describe("DB layer verification", () => {
  afterAll(async () => {
    await db.delete();
  });

  it("creates and fetches a trip", async () => {
    await db.trips.add({ id: "t1", schemaVersion: 1, title: "日本关西 6 日", startDate: "2025-10-12", endDate: "2025-10-17", timezone: "Asia/Tokyo", defaultCurrency: "JPY", participantIds: [], createdAt: now, updatedAt: now });
    const t = await db.trips.get("t1");
    expect(t?.title).toBe("日本关西 6 日");
  });

  it("queries participants by tripId", async () => {
    await db.participants.bulkAdd([{ id: "p1", tripId: "t1", name: "Alice" }, { id: "p2", tripId: "t1", name: "Bob" }]);
    const parts = await db.participants.where("tripId").equals("t1").toArray();
    expect(parts).toHaveLength(2);
  });

  it("sorts stops by sortOrder", async () => {
    await db.stops.bulkAdd([
      { id: "s1", tripId: "t1", date: "2025-10-12", sortOrder: 1, title: "抵达大阪", latitude: 34.43, longitude: 135.24 },
      { id: "s2", tripId: "t1", date: "2025-10-12", sortOrder: 0, title: "关西机场", latitude: 34.43, longitude: 135.23 },
    ]);
    const sorted = await db.stops.where("tripId").equals("t1").sortBy("sortOrder");
    expect(sorted[0].title).toBe("关西机场");
    expect(sorted[1].title).toBe("抵达大阪");
  });

  it("filters stops by compound index tripId+date", async () => {
    await db.stops.add({ id: "s3", tripId: "t1", date: "2025-10-13", sortOrder: 0, title: "清水寺", latitude: 34.99, longitude: 135.78 });
    const byDate = await db.stops.where({ tripId: "t1", date: "2025-10-12" }).toArray();
    expect(byDate).toHaveLength(2);
  });

  it("cascading deletes trip + children in a transaction", async () => {
    await db.transaction("rw", [db.trips, db.participants, db.stops], async () => {
      await db.trips.delete("t1");
      await db.participants.where("tripId").equals("t1").delete();
      await db.stops.where("tripId").equals("t1").delete();
    });
    const gone = await db.trips.get("t1");
    const pc = await db.participants.where("tripId").equals("t1").count();
    const sc = await db.stops.where("tripId").equals("t1").count();
    expect(gone).toBeUndefined();
    expect(pc).toBe(0);
    expect(sc).toBe(0);
  });

  it("filters archived trips in memory", async () => {
    await db.trips.bulkAdd([
      { id: "t2", schemaVersion: 1, title: "Archived", startDate: "2025-01-01", endDate: "2025-01-05", timezone: "UTC", defaultCurrency: "USD", participantIds: [], archivedAt: now, createdAt: now, updatedAt: now },
      { id: "t3", schemaVersion: 1, title: "Active", startDate: "2025-06-01", endDate: "2025-06-07", timezone: "UTC", defaultCurrency: "USD", participantIds: [], createdAt: now, updatedAt: now },
    ]);
    const all = await db.trips.orderBy("updatedAt").reverse().toArray();
    const active = all.filter(t => !t.archivedAt);
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe("Active");
  });

  it("duplicates trip and remaps child entity IDs", async () => {
    await db.participants.add({ id: "pp1", tripId: "t3", name: "Charlie" });
    await db.stops.add({ id: "ss1", tripId: "t3", date: "2025-06-01", sortOrder: 0, title: "金阁寺", latitude: 35.03, longitude: 135.72 });
    await db.transaction("rw", [db.trips, db.participants, db.stops], async () => {
      const src = await db.trips.get("t3");
      await db.trips.add({ ...src, id: "dup", title: "Copy" });
      const sp = await db.participants.where("tripId").equals("t3").toArray();
      const ss = await db.stops.where("tripId").equals("t3").toArray();
      if (sp.length) await db.participants.add({ ...sp[0], id: "dup-pp1", tripId: "dup" });
      if (ss.length) await db.stops.add({ ...ss[0], id: "dup-ss1", tripId: "dup" });
    });
    const dp = await db.participants.where("tripId").equals("dup").count();
    const ds = await db.stops.where("tripId").equals("dup").count();
    expect(dp).toBe(1);
    expect(ds).toBe(1);
  });

  it("filters expenses by status", async () => {
    await db.expenses.bulkAdd([
      { id: "e1", tripId: "t3", title: "Hotel", amountMinor: 15000, currency: "JPY", status: "paid", category: "住宿", beneficiaryParticipantIds: [], splitMethod: "equal", splitValues: {}, createdAt: now, updatedAt: now },
      { id: "e2", tripId: "t3", title: "Taxi", amountMinor: 3000, currency: "JPY", status: "planned", category: "交通", beneficiaryParticipantIds: [], splitMethod: "equal", splitValues: {}, createdAt: now, updatedAt: now },
    ]);
    const all = await db.expenses.where("tripId").equals("t3").toArray();
    const paid = all.filter(e => e.status === "paid");
    expect(all).toHaveLength(2);
    expect(paid).toHaveLength(1);
    expect(paid[0].title).toBe("Hotel");
  });

  it("sorts packing items by sortOrder", async () => {
    await db.packingItems.bulkAdd([
      { id: "pk1", tripId: "t3", category: "衣物", title: "T恤", quantity: 3, required: true, packed: false, sortOrder: 1 },
      { id: "pk2", tripId: "t3", category: "证件", title: "护照", quantity: 1, required: true, packed: true, sortOrder: 0 },
    ]);
    const pk = await db.packingItems.where("tripId").equals("t3").sortBy("sortOrder");
    expect(pk[0].title).toBe("护照");
    expect(pk[1].title).toBe("T恤");
  });
});
