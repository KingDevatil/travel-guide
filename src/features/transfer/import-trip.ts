import { z } from "zod";
import { db } from "../../db/travel-db";
import { expenseSchema, legSchema, packingItemSchema, participantSchema, stopSchema, tripSchema } from "../../domain/schemas";
import type { TravelBackup } from "./export-trip";

const backupSchema = z.object({
  format: z.literal("travel-planner-backup"),
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  appVersion: z.string().min(1),
  trip: tripSchema,
  participants: z.array(participantSchema),
  stops: z.array(stopSchema),
  legs: z.array(legSchema),
  expenses: z.array(expenseSchema),
  packingItems: z.array(packingItemSchema),
});

function required(map: Map<string, string>, id: string, label: string) {
  const value = map.get(id);
  if (!value) throw new Error(`${label}引用无效`);
  return value;
}

export async function importBackup(raw: string) {
  if (raw.length > 5_000_000) throw new Error("备份文件过大");
  const backup = backupSchema.parse(JSON.parse(raw)) as TravelBackup;
  const originalTripId = backup.trip.id;
  const belongsToTrip = (value: { tripId: string }) => value.tripId === originalTripId;
  if (![...backup.participants, ...backup.stops, ...backup.legs, ...backup.expenses, ...backup.packingItems].every(belongsToTrip)) {
    throw new Error("备份包含其他行程的数据");
  }

  const tripId = crypto.randomUUID();
  const idMap = new Map<string, string>([[originalTripId, tripId]]);
  for (const item of [...backup.participants, ...backup.stops, ...backup.legs, ...backup.expenses, ...backup.packingItems]) {
    idMap.set(item.id, crypto.randomUUID());
  }

  const now = new Date().toISOString();
  const participants = backup.participants.map((item) => ({ ...item, id: required(idMap, item.id, "参与人"), tripId }));
  const stops = backup.stops.map((item) => ({ ...item, id: required(idMap, item.id, "节点"), tripId }));
  const legs = backup.legs.map((item) => ({
    ...item,
    id: required(idMap, item.id, "交通段"),
    tripId,
    fromStopId: required(idMap, item.fromStopId, "出发节点"),
    toStopId: required(idMap, item.toStopId, "到达节点"),
    expenseId: item.expenseId ? required(idMap, item.expenseId, "交通费用") : undefined,
  }));
  const expenses = backup.expenses.map((item) => ({
    ...item,
    id: required(idMap, item.id, "消费"),
    tripId,
    payerParticipantId: item.payerParticipantId ? required(idMap, item.payerParticipantId, "付款人") : undefined,
    beneficiaryParticipantIds: item.beneficiaryParticipantIds.map((id) => required(idMap, id, "受益人")),
    stopId: item.stopId ? required(idMap, item.stopId, "消费节点") : undefined,
    legId: item.legId ? required(idMap, item.legId, "消费交通段") : undefined,
  }));
  const packingItems = backup.packingItems.map((item) => ({ ...item, id: required(idMap, item.id, "行李"), tripId }));
  const trip = {
    ...backup.trip,
    id: tripId,
    title: `${backup.trip.title}（导入副本）`,
    participantIds: backup.trip.participantIds.map((id) => required(idMap, id, "行程参与人")),
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction("rw", [db.trips, db.participants, db.stops, db.legs, db.expenses, db.packingItems], async () => {
    await db.trips.add(trip);
    await db.participants.bulkAdd(participants);
    await db.stops.bulkAdd(stops);
    await db.legs.bulkAdd(legs);
    await db.expenses.bulkAdd(expenses);
    await db.packingItems.bulkAdd(packingItems);
  });
  return tripId;
}
