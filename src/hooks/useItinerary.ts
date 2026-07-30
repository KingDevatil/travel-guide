import { useCallback, useEffect, useState } from "react";
import type { Leg, Stop } from "../domain/models";
import { subscribeTripChanges } from "../db/change-events";
import { addExpense, addLeg, addStop, bulkMoveStops, deleteLeg, deleteStop, duplicateDay, duplicateStop, getExpenses, getLegs, getStops, moveStopToDate, reorderStops, updateExpense, updateLeg, updateStop } from "../db/trip-repository";

export type StopDraft = Omit<Stop, "id" | "tripId" | "sortOrder">;
export type LegDraft = Omit<Leg, "id" | "tripId"> & { expenseAmountMinor?: number; expenseCurrency?: string };

export function useItinerary(tripId?: string) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [loading, setLoading] = useState(Boolean(tripId));
  const refresh = useCallback(async () => {
    if (!tripId) { setStops([]); setLegs([]); setLoading(false); return; }
    setLoading(true);
    const [nextStops, nextLegs] = await Promise.all([getStops(tripId), getLegs(tripId)]);
    setStops(nextStops); setLegs(nextLegs); setLoading(false);
  }, [tripId]);
  useEffect(() => {
    void refresh();
    return subscribeTripChanges((changedTripId) => {
      if (changedTripId === tripId) void refresh();
    });
  }, [refresh, tripId]);
  const saveStop = useCallback(async (draft: StopDraft, current?: Stop) => {
    if (!tripId) throw new Error("请选择行程");
    if (draft.endsAt && draft.startsAt && draft.endsAt < draft.startsAt) throw new Error("结束时间不能早于开始时间");
    if (current) await updateStop({ ...current, ...draft });
    else await addStop({ ...draft, id: crypto.randomUUID(), tripId, sortOrder: stops.filter((stop) => stop.date === draft.date).length });
    await refresh();
  }, [refresh, stops, tripId]);
  const saveLeg = useCallback(async (draft: LegDraft, current?: Leg) => {
    if (!tripId) throw new Error("请选择行程");
    if (!draft.fromStopId || !draft.toStopId || draft.fromStopId === draft.toStopId) throw new Error("请选择两个不同的行程安排");
    if (draft.arrivesAt && draft.departsAt && draft.arrivesAt < draft.departsAt) throw new Error("到达时间不能早于出发时间");
    const { expenseAmountMinor, expenseCurrency, ...legDraft } = draft;
    const leg: Leg = current ? { ...current, ...legDraft } : { ...legDraft, id: crypto.randomUUID(), tripId };
    if (expenseAmountMinor !== undefined && expenseCurrency) {
      const now = new Date().toISOString();
      const expenseId = current?.expenseId ?? crypto.randomUUID();
      const existingExpense = current?.expenseId
        ? (await getExpenses(tripId)).find((expense) => expense.id === current.expenseId)
        : undefined;
      leg.expenseId = expenseId;
      const expense = {
        id: expenseId,
        tripId,
        title: `交通：${leg.serviceNumber || leg.mode}`,
        amountMinor: expenseAmountMinor,
        currency: expenseCurrency,
        status: "planned" as const,
        category: "交通",
        beneficiaryParticipantIds: existingExpense?.beneficiaryParticipantIds ?? [],
        splitMethod: existingExpense?.splitMethod ?? "equal" as const,
        splitValues: existingExpense?.splitValues ?? {},
        legId: leg.id,
        payerParticipantId: existingExpense?.payerParticipantId,
        notes: existingExpense?.notes,
        createdAt: existingExpense?.createdAt ?? now,
        updatedAt: now,
      };
      if (existingExpense) await updateExpense(expense);
      else await addExpense(expense);
    }
    if (current) await updateLeg(leg); else await addLeg(leg);
    await refresh();
  }, [refresh, tripId]);
  const moveStop = useCallback(async (stop: Stop, direction: -1 | 1) => {
    const dayStops = stops.filter((item) => item.date === stop.date);
    const index = dayStops.findIndex((item) => item.id === stop.id); const other = dayStops[index + direction];
    if (!other) return;
    await reorderStops(dayStops.map((item, order) => item.id === stop.id ? { id: item.id, sortOrder: other.sortOrder } : item.id === other.id ? { id: item.id, sortOrder: stop.sortOrder } : { id: item.id, sortOrder: order }));
    await refresh();
  }, [refresh, stops]);
  const moveToDate = useCallback(async (id: string, date: string) => {
    await moveStopToDate(id, date);
    await refresh();
  }, [refresh]);
  const copyStop = useCallback(async (id: string, date?: string) => {
    const newId = await duplicateStop(id, date);
    await refresh();
    return newId;
  }, [refresh]);
  const copyDay = useCallback(async (sourceDate: string, targetDate: string) => {
    if (!tripId) return 0;
    const copied = await duplicateDay(tripId, sourceDate, targetDate);
    await refresh();
    return copied;
  }, [refresh, tripId]);
  const moveMany = useCallback(async (ids: string[], date: string) => {
    const moved = await bulkMoveStops(ids, date);
    await refresh();
    return moved;
  }, [refresh]);
  const reorderDay = useCallback(async (orderedStops: Stop[]) => {
    await reorderStops(orderedStops.map((stop, sortOrder) => ({ id: stop.id, sortOrder })));
    await refresh();
  }, [refresh]);
  return {
    stops,
    legs,
    loading,
    refresh,
    saveStop,
    saveLeg,
    moveStop,
    moveToDate,
    copyStop,
    copyDay,
    moveMany,
    reorderDay,
    deleteStop: async (id: string) => { await deleteStop(id); await refresh(); },
    deleteLeg: async (id: string) => { await deleteLeg(id); await refresh(); },
  };
}
