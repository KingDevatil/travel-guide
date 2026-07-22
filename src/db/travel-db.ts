import Dexie, { type Table } from "dexie";
import type { Trip, Participant, Stop, Leg, Expense, PackingItem } from "../domain/models";

export class TravelDB extends Dexie {
  trips!: Table<Trip, string>;
  participants!: Table<Participant, string>;
  stops!: Table<Stop, string>;
  legs!: Table<Leg, string>;
  expenses!: Table<Expense, string>;
  packingItems!: Table<PackingItem, string>;

  constructor() {
    super("travel-planner");

    this.version(1).stores({
      // &id = primary key, then indexed fields
      trips: "&id, title, archivedAt, createdAt, updatedAt",
      participants: "&id, tripId",
      stops: "&id, tripId, date, sortOrder",
      legs: "&id, tripId, fromStopId, toStopId",
      expenses: "&id, tripId, status, category, stopId",
      packingItems: "&id, tripId, category",
    });
  }
}

/** Singleton database instance. */
export const db = new TravelDB();
