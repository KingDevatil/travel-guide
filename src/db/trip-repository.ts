import { db } from "./travel-db";
import type {
  Trip,
  Participant,
  Stop,
  Leg,
  Expense,
  PackingItem,
} from "../domain/models";

// ---------------------------------------------------------------------------
// Trip CRUD
// ---------------------------------------------------------------------------

export async function createTrip(trip: Trip): Promise<string> {
  await db.trips.add(trip);
  return trip.id;
}

export async function getTrip(id: string): Promise<Trip | undefined> {
  return db.trips.get(id);
}

export async function updateTrip(trip: Trip): Promise<void> {
  await db.trips.put(trip);
}

export async function deleteTrip(id: string): Promise<void> {
  await db.transaction(
    "rw",
    [db.trips, db.participants, db.stops, db.legs, db.expenses, db.packingItems],
    async () => {
      await db.trips.delete(id);
      await db.participants.where("tripId").equals(id).delete();
      await db.stops.where("tripId").equals(id).delete();
      await db.legs.where("tripId").equals(id).delete();
      await db.expenses.where("tripId").equals(id).delete();
      await db.packingItems.where("tripId").equals(id).delete();
    },
  );
}

export async function listTrips(options?: {
  includeArchived?: boolean;
}): Promise<Trip[]> {
  const all = await db.trips.orderBy("updatedAt").reverse().toArray();
  if (options?.includeArchived) {
    return all;
  }
  return all.filter((t) => !t.archivedAt);
}

export async function archiveTrip(id: string): Promise<void> {
  await db.trips.update(id, { archivedAt: new Date().toISOString() });
}

export async function restoreTrip(id: string): Promise<void> {
  await db.trips.update(id, { archivedAt: undefined, updatedAt: new Date().toISOString() });
}

export async function duplicateTrip(
  sourceId: string,
  newId: string,
  newTitle: string,
): Promise<string> {
  await db.transaction(
    "rw",
    [db.trips, db.participants, db.stops, db.legs, db.expenses, db.packingItems],
    async () => {
      const source = await db.trips.get(sourceId);
      if (!source) throw new Error("Source trip not found");

      const now = new Date().toISOString();
      const newTrip: Trip = {
        ...source,
        id: newId,
        title: newTitle,
        archivedAt: undefined,
        createdAt: now,
        updatedAt: now,
      };
      await db.trips.add(newTrip);

      const [participants, stops, legs, expenses, packingItems] =
        await Promise.all([
          db.participants.where("tripId").equals(sourceId).toArray(),
          db.stops.where("tripId").equals(sourceId).toArray(),
          db.legs.where("tripId").equals(sourceId).toArray(),
          db.expenses.where("tripId").equals(sourceId).toArray(),
          db.packingItems.where("tripId").equals(sourceId).toArray(),
        ]);

      const idMap = new Map<string, string>([[sourceId, newId]]);
      for (const item of [...participants, ...stops, ...legs, ...expenses, ...packingItems]) {
        idMap.set(item.id, crypto.randomUUID());
      }

      const newParticipants = participants.map((p) => {
        return { ...p, id: idMap.get(p.id)!, tripId: newId };
      });

      const newStops = stops.map((s) => {
        return { ...s, id: idMap.get(s.id)!, tripId: newId };
      });

      const newLegs = legs.map((l) => ({
        ...l,
        id: idMap.get(l.id)!,
        tripId: newId,
        fromStopId: idMap.get(l.fromStopId) ?? l.fromStopId,
        toStopId: idMap.get(l.toStopId) ?? l.toStopId,
        expenseId: l.expenseId
          ? (idMap.get(l.expenseId) ?? l.expenseId)
          : undefined,
      }));

      const newExpenses = expenses.map((e) => {
        return {
          ...e,
          id: idMap.get(e.id)!,
          tripId: newId,
          payerParticipantId: e.payerParticipantId
            ? (idMap.get(e.payerParticipantId) ?? e.payerParticipantId)
            : undefined,
          beneficiaryParticipantIds: e.beneficiaryParticipantIds.map(
            (bid) => idMap.get(bid) ?? bid,
          ),
          stopId: e.stopId ? (idMap.get(e.stopId) ?? e.stopId) : undefined,
          legId: e.legId ? (idMap.get(e.legId) ?? e.legId) : undefined,
        };
      });

      const newPackingItems = packingItems.map((pi) => ({
        ...pi,
        id: idMap.get(pi.id)!,
        tripId: newId,
      }));

      newTrip.participantIds = source.participantIds.map((id) => idMap.get(id) ?? id);
      await db.trips.put(newTrip);

      await Promise.all([
        db.participants.bulkAdd(newParticipants),
        db.stops.bulkAdd(newStops),
        db.legs.bulkAdd(newLegs),
        db.expenses.bulkAdd(newExpenses),
        db.packingItems.bulkAdd(newPackingItems),
      ]);
    },
  );

  return newId;
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export async function getParticipants(tripId: string): Promise<Participant[]> {
  return db.participants.where("tripId").equals(tripId).toArray();
}

export async function addParticipant(p: Participant): Promise<void> {
  await db.transaction("rw", [db.participants, db.trips], async () => {
    await db.participants.add(p);
    const trip = await db.trips.get(p.tripId);
    if (trip && !trip.participantIds.includes(p.id)) await db.trips.update(p.tripId, { participantIds: [...trip.participantIds, p.id], updatedAt: new Date().toISOString() });
  });
}

export async function updateParticipant(p: Participant): Promise<void> {
  await db.participants.put(p);
}

export async function deleteParticipant(id: string): Promise<void> {
  await db.transaction("rw", [db.participants, db.trips, db.expenses], async () => {
    const participant = await db.participants.get(id);
    if (!participant) return;
    await db.participants.delete(id);
    const trip = await db.trips.get(participant.tripId);
    if (trip) await db.trips.update(trip.id, { participantIds: trip.participantIds.filter((value) => value !== id), updatedAt: new Date().toISOString() });
    const expenses = await db.expenses.where("tripId").equals(participant.tripId).toArray();
    for (const expense of expenses) {
      if (expense.payerParticipantId === id && expense.status === "paid") throw new Error("该成员仍是已支付消费的付款人，无法删除");
      if (expense.beneficiaryParticipantIds.includes(id)) await db.expenses.update(expense.id, { beneficiaryParticipantIds: expense.beneficiaryParticipantIds.filter((value) => value !== id), splitValues: Object.fromEntries(Object.entries(expense.splitValues).filter(([key]) => key !== id)), updatedAt: new Date().toISOString() });
    }
  });
}

export async function copyPackingItems(sourceTripId: string, targetTripId: string): Promise<number> {
  const [source, target] = await Promise.all([getPackingItems(sourceTripId), getPackingItems(targetTripId)]);
  const existing = new Set(target.map((item) => `${item.category}\u0000${item.title}`));
  const additions = source.filter((item) => !existing.has(`${item.category}\u0000${item.title}`)).map((item, index) => ({ ...item, id: crypto.randomUUID(), tripId: targetTripId, packed: false, sortOrder: target.length + index }));
  if (additions.length) await db.packingItems.bulkAdd(additions);
  return additions.length;
}

// ---------------------------------------------------------------------------
// Stops
// ---------------------------------------------------------------------------

export async function getStops(tripId: string): Promise<Stop[]> {
  return db.stops.where("tripId").equals(tripId).sortBy("sortOrder");
}

export async function getStopsByDate(
  tripId: string,
  date: string,
): Promise<Stop[]> {
  return db.stops.where({ tripId, date }).sortBy("sortOrder");
}

export async function addStop(stop: Stop): Promise<void> {
  await db.stops.add(stop);
}

export async function updateStop(stop: Stop): Promise<void> {
  await db.stops.put(stop);
}

export async function deleteStop(id: string): Promise<void> {
  await db.transaction("rw", [db.stops, db.legs], async () => {
    await db.stops.delete(id);
    await db.legs.where("fromStopId").equals(id).delete();
    await db.legs.where("toStopId").equals(id).delete();
  });
}

export async function reorderStops(
  stops: { id: string; sortOrder: number }[],
): Promise<void> {
  await db.transaction("rw", [db.stops], async () => {
    for (const s of stops) {
      await db.stops.update(s.id, { sortOrder: s.sortOrder });
    }
  });
}

// ---------------------------------------------------------------------------
// Legs
// ---------------------------------------------------------------------------

export async function getLegs(tripId: string): Promise<Leg[]> {
  return db.legs.where("tripId").equals(tripId).toArray();
}

export async function addLeg(leg: Leg): Promise<void> {
  await db.legs.add(leg);
}

export async function updateLeg(leg: Leg): Promise<void> {
  await db.legs.put(leg);
}

export async function deleteLeg(id: string): Promise<void> {
  await db.legs.delete(id);
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export async function getExpenses(
  tripId: string,
  status?: string,
): Promise<Expense[]> {
  let collection = db.expenses.where("tripId").equals(tripId);
  if (status) {
    collection = collection.and((e) => e.status === status);
  }
  return collection.toArray();
}

export async function addExpense(expense: Expense): Promise<void> {
  await db.expenses.add(expense);
}

export async function updateExpense(expense: Expense): Promise<void> {
  await db.expenses.put(expense);
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id);
}

// ---------------------------------------------------------------------------
// Packing Items
// ---------------------------------------------------------------------------

export async function getPackingItems(tripId: string): Promise<PackingItem[]> {
  return db.packingItems.where("tripId").equals(tripId).sortBy("sortOrder");
}

export async function addPackingItem(item: PackingItem): Promise<void> {
  await db.packingItems.add(item);
}

export async function updatePackingItem(item: PackingItem): Promise<void> {
  await db.packingItems.put(item);
}

export async function deletePackingItem(id: string): Promise<void> {
  await db.packingItems.delete(id);
}

export async function bulkAddPackingItems(items: PackingItem[]): Promise<void> {
  await db.packingItems.bulkAdd(items);
}
