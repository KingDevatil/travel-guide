import type { LineString } from "geojson";

export type { LineString } from "geojson";

export type CurrencyCode = string;

export interface Trip {
  id: string;
  schemaVersion: 1;
  title: string;
  startDate: string;
  endDate: string;
  timezone: string;
  defaultCurrency: CurrencyCode;
  participantIds: string[];
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  tripId: string;
  name: string;
}

export interface Stop {
  id: string;
  tripId: string;
  date: string;
  sortOrder: number;
  title: string;
  country?: string;
  city?: string;
  latitude: number;
  longitude: number;
  startsAt?: string;
  endsAt?: string;
  content?: string;
  notes?: string;
}

export type TransportMode =
  | "walk" | "bike" | "bus" | "metro" | "taxi" | "drive"
  | "train" | "highSpeedRail" | "flight" | "ferry" | "other";

export interface Leg {
  id: string;
  tripId: string;
  fromStopId: string;
  toStopId: string;
  mode: TransportMode;
  departsAt?: string;
  arrivesAt?: string;
  serviceNumber?: string;
  notes?: string;
  routeGeoJson?: LineString;
  expenseId?: string;
}

export type ExpenseStatus = "planned" | "paid" | "cancelled";
export type SplitMethod = "equal" | "shares" | "percentage" | "fixed";

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amountMinor: number;
  currency: CurrencyCode;
  status: ExpenseStatus;
  category: string;
  payerParticipantId?: string;
  beneficiaryParticipantIds: string[];
  splitMethod: SplitMethod;
  splitValues: Record<string, number>;
  occurredAt?: string;
  stopId?: string;
  legId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackingItem {
  id: string;
  tripId: string;
  category: string;
  title: string;
  quantity: number;
  required: boolean;
  packed: boolean;
  notes?: string;
  sortOrder: number;
}
