import { useCallback, useEffect, useRef, useState } from "react";
import type { Trip } from "../domain/models";
import {
  archiveTrip,
  restoreTrip,
  createTrip,
  deleteTrip,
  duplicateTrip,
  listTrips,
  updateTrip,
} from "../db/trip-repository";

export type TripDraft = Pick<Trip, "title" | "startDate" | "endDate" | "timezone" | "defaultCurrency">;

const starterTrip: TripDraft = {
  title: "日本关西 6 日",
  startDate: "2025-10-12",
  endDate: "2025-10-17",
  timezone: "Asia/Tokyo",
  defaultCurrency: "JPY",
};
const starterInitializedKey = "travel-planner:starter-initialized:v1";

function makeTrip(draft: TripDraft): Trip {
  const now = new Date().toISOString();
  return {
    ...draft,
    id: crypto.randomUUID(),
    schemaVersion: 1,
    participantIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const starterPromise = useRef<Promise<Trip | undefined> | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      setError(undefined);
      setTrips(await listTrips({ includeArchived: true }));
    } catch {
      setError("无法读取本机行程数据，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const add = useCallback(async (draft: TripDraft) => {
    const trip = makeTrip(draft);
    await createTrip(trip);
    await refresh();
    return trip;
  }, [refresh]);

  const ensureStarter = useCallback(async () => {
    if (!starterPromise.current) starterPromise.current = (async () => {
      const existing = await listTrips();
      if (existing.length) {
        localStorage.setItem(starterInitializedKey, "true");
        return existing[0];
      }
      if (localStorage.getItem(starterInitializedKey)) return undefined;
      const trip = await add(starterTrip);
      localStorage.setItem(starterInitializedKey, "true");
      return trip;
    })();
    const pending = starterPromise.current;
    try { return await pending; }
    finally { if (starterPromise.current === pending) starterPromise.current = undefined; }
  }, [add]);

  const save = useCallback(async (trip: Trip) => {
    await updateTrip({ ...trip, updatedAt: new Date().toISOString() });
    await refresh();
  }, [refresh]);

  const duplicate = useCallback(async (trip: Trip) => {
    const id = crypto.randomUUID();
    await duplicateTrip(trip.id, id, `${trip.title} 副本`);
    await refresh();
    return id;
  }, [refresh]);

  const archive = useCallback(async (id: string) => { await archiveTrip(id); await refresh(); }, [refresh]);
  const restore = useCallback(async (id: string) => { await restoreTrip(id); await refresh(); }, [refresh]);
  const remove = useCallback(async (id: string) => { await deleteTrip(id); await refresh(); }, [refresh]);

  return { trips, loading, error, refresh, add, save, duplicate, archive, restore, remove, ensureStarter };
}
