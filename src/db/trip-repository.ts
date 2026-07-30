import { db } from "./travel-db";
import type {
  Trip,
  Participant,
  Stop,
  Leg,
  Expense,
  PackingItem,
} from "../domain/models";
import { notifyTripChanged } from "./change-events";

// ---------------------------------------------------------------------------
// Trip CRUD
// ---------------------------------------------------------------------------

export async function createTrip(trip: Trip): Promise<string> {
  await db.trips.add(trip);
  notifyTripChanged(trip.id);
  return trip.id;
}

export async function getTrip(id: string): Promise<Trip | undefined> {
  return db.trips.get(id);
}

export async function updateTrip(trip: Trip): Promise<void> {
  await db.trips.put(trip);
  notifyTripChanged(trip.id);
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
  notifyTripChanged(id);
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
  notifyTripChanged(id);
}

export async function restoreTrip(id: string): Promise<void> {
  await db.trips.update(id, { archivedAt: undefined, updatedAt: new Date().toISOString() });
  notifyTripChanged(id);
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

  notifyTripChanged(newId);
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
  notifyTripChanged(p.tripId);
}

export async function updateParticipant(p: Participant): Promise<void> {
  await db.participants.put(p);
  notifyTripChanged(p.tripId);
}

export async function deleteParticipant(id: string): Promise<void> {
  let tripId: string | undefined;
  await db.transaction("rw", [db.participants, db.trips, db.expenses], async () => {
    const participant = await db.participants.get(id);
    if (!participant) return;
    tripId = participant.tripId;
    await db.participants.delete(id);
    const trip = await db.trips.get(participant.tripId);
    if (trip) await db.trips.update(trip.id, { participantIds: trip.participantIds.filter((value) => value !== id), updatedAt: new Date().toISOString() });
    const expenses = await db.expenses.where("tripId").equals(participant.tripId).toArray();
    for (const expense of expenses) {
      if (expense.payerParticipantId === id && expense.status === "paid") throw new Error("该成员仍是已支付消费的付款人，无法删除");
      if (expense.beneficiaryParticipantIds.includes(id)) await db.expenses.update(expense.id, { beneficiaryParticipantIds: expense.beneficiaryParticipantIds.filter((value) => value !== id), splitValues: Object.fromEntries(Object.entries(expense.splitValues).filter(([key]) => key !== id)), updatedAt: new Date().toISOString() });
    }
  });
  if (tripId) notifyTripChanged(tripId);
}

export async function copyPackingItems(sourceTripId: string, targetTripId: string): Promise<number> {
  const [source, target] = await Promise.all([getPackingItems(sourceTripId), getPackingItems(targetTripId)]);
  const existing = new Set(target.map((item) => `${item.category}\u0000${item.title}`));
  const additions = source.filter((item) => !existing.has(`${item.category}\u0000${item.title}`)).map((item, index) => ({ ...item, id: crypto.randomUUID(), tripId: targetTripId, packed: false, sortOrder: target.length + index }));
  if (additions.length) await db.packingItems.bulkAdd(additions);
  if (additions.length) notifyTripChanged(targetTripId);
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
  notifyTripChanged(stop.tripId);
}

export async function updateStop(stop: Stop): Promise<void> {
  await db.stops.put(stop);
  notifyTripChanged(stop.tripId);
}

export async function deleteStop(id: string): Promise<void> {
  let tripId: string | undefined;
  await db.transaction("rw", [db.stops, db.legs, db.expenses], async () => {
    const stop = await db.stops.get(id);
    if (!stop) return;
    tripId = stop.tripId;
    const legs = await db.legs
      .where("tripId")
      .equals(stop.tripId)
      .filter((leg) => leg.fromStopId === id || leg.toStopId === id)
      .toArray();
    await db.stops.delete(id);
    await db.legs.bulkDelete(legs.map((leg) => leg.id));
    for (const leg of legs) {
      if (leg.expenseId) {
        await db.expenses.update(leg.expenseId, { legId: undefined, updatedAt: new Date().toISOString() });
      }
    }
    const directlyLinked = await db.expenses.where("stopId").equals(id).toArray();
    for (const expense of directlyLinked) {
      await db.expenses.update(expense.id, { stopId: undefined, updatedAt: new Date().toISOString() });
    }
  });
  if (tripId) notifyTripChanged(tripId);
}

export async function reorderStops(
  stops: { id: string; sortOrder: number }[],
): Promise<void> {
  let tripId: string | undefined;
  await db.transaction("rw", [db.stops], async () => {
    tripId = stops[0] ? (await db.stops.get(stops[0].id))?.tripId : undefined;
    for (const s of stops) {
      await db.stops.update(s.id, { sortOrder: s.sortOrder });
    }
  });
  if (tripId) notifyTripChanged(tripId);
}

async function normalizeDateSortOrder(tripId: string, date: string): Promise<void> {
  const dayStops = await db.stops.where({ tripId, date }).sortBy("sortOrder");
  for (const [sortOrder, stop] of dayStops.entries()) {
    if (stop.sortOrder !== sortOrder) await db.stops.update(stop.id, { sortOrder });
  }
}

export async function moveStopToDate(id: string, date: string): Promise<void> {
  let tripId: string | undefined;
  await db.transaction("rw", [db.stops], async () => {
    const stop = await db.stops.get(id);
    if (!stop || stop.date === date) return;
    tripId = stop.tripId;
    const destination = await db.stops.where({ tripId: stop.tripId, date }).toArray();
    await db.stops.update(id, { date, sortOrder: destination.length, unscheduled: false });
    await normalizeDateSortOrder(stop.tripId, stop.date);
  });
  if (tripId) notifyTripChanged(tripId);
}

export async function duplicateStop(id: string, targetDate?: string): Promise<string> {
  let tripId = "";
  let newId = "";
  await db.transaction("rw", [db.stops], async () => {
    const source = await db.stops.get(id);
    if (!source) throw new Error("安排不存在");
    tripId = source.tripId;
    newId = crypto.randomUUID();
    const date = targetDate ?? source.date;
    const destination = await db.stops.where({ tripId: source.tripId, date }).toArray();
    await db.stops.add({
      ...source,
      id: newId,
      date,
      sortOrder: destination.length,
      title: `${source.title} 副本`,
      unscheduled: targetDate ? false : source.unscheduled,
    });
  });
  notifyTripChanged(tripId);
  return newId;
}

export async function duplicateDay(tripId: string, sourceDate: string, targetDate: string): Promise<number> {
  let copied = 0;
  await db.transaction("rw", [db.stops, db.legs], async () => {
    const sourceStops = await db.stops.where({ tripId, date: sourceDate }).sortBy("sortOrder");
    if (!sourceStops.length) return;
    const destinationStops = await db.stops.where({ tripId, date: targetDate }).toArray();
    const idMap = new Map(sourceStops.map((stop) => [stop.id, crypto.randomUUID()]));
    await db.stops.bulkAdd(sourceStops.map((stop, index) => ({
      ...stop,
      id: idMap.get(stop.id)!,
      date: targetDate,
      sortOrder: destinationStops.length + index,
      unscheduled: false,
    })));
    const sourceIds = new Set(sourceStops.map((stop) => stop.id));
    const sourceLegs = await db.legs.where("tripId").equals(tripId)
      .filter((leg) => sourceIds.has(leg.fromStopId) && sourceIds.has(leg.toStopId))
      .toArray();
    await db.legs.bulkAdd(sourceLegs.map((leg) => ({
      ...leg,
      id: crypto.randomUUID(),
      fromStopId: idMap.get(leg.fromStopId)!,
      toStopId: idMap.get(leg.toStopId)!,
      expenseId: undefined,
    })));
    copied = sourceStops.length;
  });
  if (copied) notifyTripChanged(tripId);
  return copied;
}

export async function bulkMoveStops(ids: string[], targetDate: string): Promise<number> {
  let tripId = "";
  let moved = 0;
  await db.transaction("rw", [db.stops], async () => {
    const selected = (await db.stops.bulkGet(ids)).filter((stop): stop is Stop => Boolean(stop));
    if (!selected.length) return;
    tripId = selected[0].tripId;
    if (selected.some((stop) => stop.tripId !== tripId)) throw new Error("只能批量移动同一行程内的安排");
    const sourceDates = new Set(selected.map((stop) => stop.date));
    const selectedIds = new Set(selected.map((stop) => stop.id));
    const destination = (await db.stops.where({ tripId, date: targetDate }).sortBy("sortOrder"))
      .filter((stop) => !selectedIds.has(stop.id));
    for (const [index, stop] of selected.entries()) {
      await db.stops.update(stop.id, {
        date: targetDate,
        sortOrder: destination.length + index,
        unscheduled: false,
      });
    }
    for (const date of sourceDates) await normalizeDateSortOrder(tripId, date);
    await normalizeDateSortOrder(tripId, targetDate);
    moved = selected.length;
  });
  if (moved) notifyTripChanged(tripId);
  return moved;
}

// ---------------------------------------------------------------------------
// Legs
// ---------------------------------------------------------------------------

export async function getLegs(tripId: string): Promise<Leg[]> {
  return db.legs.where("tripId").equals(tripId).toArray();
}

export async function addLeg(leg: Leg): Promise<void> {
  await db.legs.add(leg);
  notifyTripChanged(leg.tripId);
}

export async function updateLeg(leg: Leg): Promise<void> {
  await db.legs.put(leg);
  notifyTripChanged(leg.tripId);
}

export async function deleteLeg(id: string): Promise<void> {
  let tripId: string | undefined;
  await db.transaction("rw", [db.legs, db.expenses], async () => {
    const leg = await db.legs.get(id);
    if (!leg) return;
    tripId = leg.tripId;
    await db.legs.delete(id);
    if (leg.expenseId) {
      await db.expenses.update(leg.expenseId, { legId: undefined, updatedAt: new Date().toISOString() });
    }
    const directlyLinked = await db.expenses.where("tripId").equals(leg.tripId).filter((expense) => expense.legId === id).toArray();
    for (const expense of directlyLinked) {
      await db.expenses.update(expense.id, { legId: undefined, updatedAt: new Date().toISOString() });
    }
  });
  if (tripId) notifyTripChanged(tripId);
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
  await db.transaction("rw", [db.expenses, db.legs], async () => {
    await db.expenses.add(expense);
    if (!expense.legId) return;
    const leg = await db.legs.get(expense.legId);
    if (!leg || leg.tripId !== expense.tripId) return;
    if (leg.expenseId && leg.expenseId !== expense.id) {
      await db.expenses.update(leg.expenseId, { legId: undefined, updatedAt: new Date().toISOString() });
    }
    await db.legs.update(leg.id, { expenseId: expense.id });
  });
  notifyTripChanged(expense.tripId);
}

export async function updateExpense(expense: Expense): Promise<void> {
  await db.transaction("rw", [db.expenses, db.legs], async () => {
    const previous = await db.expenses.get(expense.id);
    if (previous?.legId && previous.legId !== expense.legId) {
      const previousLeg = await db.legs.get(previous.legId);
      if (previousLeg?.expenseId === expense.id) {
        await db.legs.update(previousLeg.id, { expenseId: undefined });
      }
    }
    await db.expenses.put(expense);
    if (!expense.legId) return;
    const leg = await db.legs.get(expense.legId);
    if (!leg || leg.tripId !== expense.tripId) return;
    if (leg.expenseId && leg.expenseId !== expense.id) {
      await db.expenses.update(leg.expenseId, { legId: undefined, updatedAt: new Date().toISOString() });
    }
    await db.legs.update(leg.id, { expenseId: expense.id });
  });
  notifyTripChanged(expense.tripId);
}

export async function deleteExpense(id: string): Promise<void> {
  let tripId: string | undefined;
  await db.transaction("rw", [db.expenses, db.legs], async () => {
    const expense = await db.expenses.get(id);
    if (!expense) return;
    tripId = expense.tripId;
    await db.expenses.delete(id);
    const linkedLegs = await db.legs.where("tripId").equals(expense.tripId).filter((leg) => leg.expenseId === id).toArray();
    for (const leg of linkedLegs) {
      await db.legs.update(leg.id, { expenseId: undefined });
    }
  });
  if (tripId) notifyTripChanged(tripId);
}

// ---------------------------------------------------------------------------
// Packing Items
// ---------------------------------------------------------------------------

export async function getPackingItems(tripId: string): Promise<PackingItem[]> {
  return db.packingItems.where("tripId").equals(tripId).sortBy("sortOrder");
}

export async function addPackingItem(item: PackingItem): Promise<void> {
  await db.packingItems.add(item);
  notifyTripChanged(item.tripId);
}

export async function updatePackingItem(item: PackingItem): Promise<void> {
  await db.packingItems.put(item);
  notifyTripChanged(item.tripId);
}

export async function deletePackingItem(id: string): Promise<void> {
  const item = await db.packingItems.get(id);
  if (!item) return;
  await db.packingItems.delete(id);
  notifyTripChanged(item.tripId);
}

export async function bulkAddPackingItems(items: PackingItem[]): Promise<void> {
  await db.packingItems.bulkAdd(items);
  for (const tripId of new Set(items.map((item) => item.tripId))) {
    notifyTripChanged(tripId);
  }
}
