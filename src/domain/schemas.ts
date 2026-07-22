import { z } from "zod";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const isoDatetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const scheduledDatetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

const idSchema = z.string().min(1, "id must not be empty");

const transportModeSchema = z.enum([
  "walk", "bike", "bus", "metro", "taxi", "drive",
  "train", "highSpeedRail", "flight", "ferry", "other",
]);

const expenseStatusSchema = z.enum(["planned", "paid", "cancelled"]);

const splitMethodSchema = z.enum(["equal", "shares", "percentage", "fixed"]);

const currencyCodeSchema = z.string().min(1, "currency must not be empty").max(10);

export const participantSchema = z.object({
  id: idSchema,
  tripId: idSchema,
  name: z.string().min(1, "participant name must not be empty"),
});

export const stopSchema = z.object({
  id: idSchema,
  tripId: idSchema,
  date: z.string().regex(isoDatePattern, "date must be YYYY-MM-DD"),
  sortOrder: z.number().int().min(0),
  title: z.string().min(1, "stop title must not be empty"),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  startsAt: z.string().regex(scheduledDatetimePattern, "startsAt must be a scheduled datetime").optional(),
  endsAt: z.string().regex(scheduledDatetimePattern, "endsAt must be a scheduled datetime").optional(),
  timezone: z.string().min(1, "timezone must not be empty").optional(),
  content: z.string().optional(),
  notes: z.string().optional(),
});

const coordinatePairSchema = z.tuple([
  z.number().min(-180, "longitude must be >= -180").max(180, "longitude must be <= 180"),
  z.number().min(-90, "latitude must be >= -90").max(90, "latitude must be <= 90"),
]);

const lineStringSchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(coordinatePairSchema)
    .min(2, "LineString must have at least 2 coordinates"),
});

export const legSchema = z.object({
  id: idSchema,
  tripId: idSchema,
  fromStopId: idSchema,
  toStopId: idSchema,
  mode: transportModeSchema,
  departsAt: z.string().regex(scheduledDatetimePattern, "departsAt must be a scheduled datetime").optional(),
  arrivesAt: z.string().regex(scheduledDatetimePattern, "arrivesAt must be a scheduled datetime").optional(),
  serviceNumber: z.string().optional(),
  notes: z.string().optional(),
  routeGeoJson: lineStringSchema.optional(),
  expenseId: idSchema.optional(),
});

export const expenseSchema = z.object({
  id: idSchema,
  tripId: idSchema,
  title: z.string().min(1, "expense title must not be empty"),
  amountMinor: z.number().int("amountMinor must be an integer in smallest currency unit"),
  currency: currencyCodeSchema,
  status: expenseStatusSchema,
  category: z.string().min(1, "category must not be empty"),
  payerParticipantId: idSchema.optional(),
  beneficiaryParticipantIds: z.array(idSchema),
  splitMethod: splitMethodSchema,
  splitValues: z.record(z.string(), z.number()),
  occurredAt: z.string().regex(isoDatetimePattern, "occurredAt must be ISO 8601 datetime").optional(),
  stopId: idSchema.optional(),
  legId: idSchema.optional(),
  notes: z.string().optional(),
  createdAt: z.string().regex(isoDatetimePattern, "createdAt must be ISO 8601 datetime"),
  updatedAt: z.string().regex(isoDatetimePattern, "updatedAt must be ISO 8601 datetime"),
});

export const packingItemSchema = z.object({
  id: idSchema,
  tripId: idSchema,
  category: z.string().min(1, "category must not be empty"),
  title: z.string().min(1, "packing item title must not be empty"),
  quantity: z.number().int().min(1, "quantity must be a positive integer"),
  required: z.boolean(),
  packed: z.boolean(),
  notes: z.string().optional(),
  sortOrder: z.number().int().min(0),
});

export const tripSchema = z.object({
  id: idSchema,
  schemaVersion: z.literal(1),
  title: z.string().min(1, "trip title must not be empty"),
  startDate: z.string().regex(isoDatePattern, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(isoDatePattern, "endDate must be YYYY-MM-DD"),
  timezone: z.string().min(1, "timezone must not be empty"),
  defaultCurrency: currencyCodeSchema,
  participantIds: z.array(idSchema),
  archivedAt: z.string().regex(isoDatetimePattern, "archivedAt must be ISO 8601 datetime").optional(),
  createdAt: z.string().regex(isoDatetimePattern, "createdAt must be ISO 8601 datetime"),
  updatedAt: z.string().regex(isoDatetimePattern, "updatedAt must be ISO 8601 datetime"),
}).refine(
  (data) => data.startDate <= data.endDate,
  { message: "startDate must not be later than endDate", path: ["endDate"] },
);
