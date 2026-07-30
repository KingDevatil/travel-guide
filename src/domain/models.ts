import type { LineString } from "geojson";

export type { LineString } from "geojson";

export type CurrencyCode = string;

export type TripIconName =
  | "map"
  | "flight"
  | "train"
  | "road"
  | "cruise"
  | "nature"
  | "beach"
  | "culture"
  | "food"
  | "camera"
  | "business";

export interface Trip {
  id: string;
  schemaVersion: 1;
  title: string;
  destination?: string;
  icon?: TripIconName;
  startDate: string;
  endDate: string;
  timezone: string;
  defaultCurrency: CurrencyCode;
  budgetMinor?: number;
  categoryBudgetsMinor?: Record<string, number>;
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

export type StopKind =
  | "place"
  | "lodging"
  | "food"
  | "flight"
  | "train"
  | "drive"
  | "activity"
  | "other";

export interface Stop {
  id: string;
  tripId: string;
  date: string;
  sortOrder: number;
  title: string;
  kind?: StopKind;
  unscheduled?: boolean;
  country?: string;
  city?: string;
  address?: string;
  latitude: number;
  longitude: number;
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  content?: string;
  notes?: string;
  bookingReference?: string;
  contactInfo?: string;
  documentUrl?: string;
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
  bookingReference?: string;
  contactInfo?: string;
  documentUrl?: string;
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
