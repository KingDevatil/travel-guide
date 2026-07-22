import { describe, it, expect } from "vitest";
import {
  tripSchema,
  participantSchema,
  stopSchema,
  legSchema,
  expenseSchema,
  packingItemSchema,
} from "../../src/domain/schemas";

// ---------------------------------------------------------------------------
// Trip
// ---------------------------------------------------------------------------

const validTrip = {
  id: "trip-1",
  schemaVersion: 1 as const,
  title: "\u65E5\u672C\u5173\u897F 6 \u65E5",
  startDate: "2024-10-12",
  endDate: "2024-10-17",
  timezone: "Asia/Tokyo",
  defaultCurrency: "CNY",
  participantIds: ["p1", "p2"],
  createdAt: "2024-09-01T00:00:00Z",
  updatedAt: "2024-09-01T00:00:00Z",
};

describe("tripSchema", () => {
  it("accepts a fully valid trip", () => {
    const result = tripSchema.safeParse(validTrip);
    expect(result.success).toBe(true);
  });

  it("accepts a trip with optional archivedAt", () => {
    const result = tripSchema.safeParse({
      ...validTrip,
      archivedAt: "2024-10-18T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when startDate is later than endDate", () => {
    const result = tripSchema.safeParse({
      ...validTrip,
      startDate: "2024-10-20",
      endDate: "2024-10-17",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("endDate");
    }
  });

  it("accepts when startDate equals endDate (single-day trip)", () => {
    const result = tripSchema.safeParse({
      ...validTrip,
      startDate: "2024-10-12",
      endDate: "2024-10-12",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when schemaVersion is not 1", () => {
    const result = tripSchema.safeParse({
      ...validTrip,
      schemaVersion: 2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = tripSchema.safeParse({ ...validTrip, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = tripSchema.safeParse({
      ...validTrip,
      startDate: "12/10/2024",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing timezone", () => {
    const result = tripSchema.safeParse({ ...validTrip, timezone: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty defaultCurrency", () => {
    const result = tripSchema.safeParse({ ...validTrip, defaultCurrency: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const noId = Object.fromEntries(Object.entries(validTrip).filter(([key]) => key !== "id"));
    const result = tripSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Participant
// ---------------------------------------------------------------------------

describe("participantSchema", () => {
  const validParticipant = {
    id: "p1",
    tripId: "trip-1",
    name: "Alice",
  };

  it("accepts a valid participant", () => {
    const result = participantSchema.safeParse(validParticipant);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = participantSchema.safeParse({
      ...validParticipant,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty id", () => {
    const result = participantSchema.safeParse({
      ...validParticipant,
      id: "",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Stop
// ---------------------------------------------------------------------------

const validStop = {
  id: "stop-1",
  tripId: "trip-1",
  date: "2024-10-12",
  sortOrder: 0,
  title: "\u62B5\u8FBE\u5927\u962A",
  latitude: 34.6937,
  longitude: 135.5023,
};

describe("stopSchema", () => {
  it("accepts a valid stop", () => {
    const result = stopSchema.safeParse(validStop);
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = stopSchema.safeParse({ ...validStop, title: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a stop with all optional fields", () => {
    const result = stopSchema.safeParse({
      ...validStop,
      country: "JP",
      city: "Osaka",
      startsAt: "2024-10-12T09:40",
      endsAt: "2024-10-12T11:00",
      timezone: "Asia/Tokyo",
      content: "Arrive at KIX",
      notes: "Pick up JR Pass",
    });
    expect(result.success).toBe(true);
  });

  it("keeps accepting legacy scheduled datetimes with an explicit offset", () => {
    expect(stopSchema.safeParse({ ...validStop, startsAt: "2024-10-12T09:40:00+09:00" }).success).toBe(true);
  });

  it("rejects an empty node timezone", () => {
    expect(stopSchema.safeParse({ ...validStop, timezone: "" }).success).toBe(false);
  });

  it("rejects latitude below -90", () => {
    const tests = [-90.1, -100, -999];
    for (const lat of tests) {
      const result = stopSchema.safeParse({ ...validStop, latitude: lat });
      expect(result.success).toBe(false);
    }
  });

  it("rejects latitude above 90", () => {
    const tests = [90.1, 100, 999];
    for (const lat of tests) {
      const result = stopSchema.safeParse({ ...validStop, latitude: lat });
      expect(result.success).toBe(false);
    }
  });

  it("accepts latitude boundary values", () => {
    for (const lat of [-90, 90]) {
      const result = stopSchema.safeParse({ ...validStop, latitude: lat });
      expect(result.success).toBe(true);
    }
  });

  it("rejects longitude below -180", () => {
    const result = stopSchema.safeParse({ ...validStop, longitude: -180.1 });
    expect(result.success).toBe(false);
  });

  it("rejects longitude above 180", () => {
    const result = stopSchema.safeParse({ ...validStop, longitude: 180.1 });
    expect(result.success).toBe(false);
  });

  it("accepts longitude boundary values", () => {
    for (const lon of [-180, 180]) {
      const result = stopSchema.safeParse({ ...validStop, longitude: lon });
      expect(result.success).toBe(true);
    }
  });

  it("rejects missing required fields", () => {
    const noId = Object.fromEntries(Object.entries(validStop).filter(([key]) => key !== "id"));
    const result = stopSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = stopSchema.safeParse({ ...validStop, date: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer sortOrder", () => {
    const result = stopSchema.safeParse({ ...validStop, sortOrder: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects negative sortOrder", () => {
    const result = stopSchema.safeParse({ ...validStop, sortOrder: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts sortOrder of 0", () => {
    const result = stopSchema.safeParse({ ...validStop, sortOrder: 0 });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Leg
// ---------------------------------------------------------------------------

const validLeg = {
  id: "leg-1",
  tripId: "trip-1",
  fromStopId: "stop-1",
  toStopId: "stop-2",
  mode: "train" as const,
};

const validLineString = {
  type: "LineString" as const,
  coordinates: [
    [135.5023, 34.6937],
    [135.7588, 35.0211],
  ],
};

describe("legSchema", () => {
  it("accepts a valid leg with minimal fields", () => {
    const result = legSchema.safeParse(validLeg);
    expect(result.success).toBe(true);
  });

  it("rejects empty fromStopId", () => {
    const result = legSchema.safeParse({ ...validLeg, fromStopId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty toStopId", () => {
    const result = legSchema.safeParse({ ...validLeg, toStopId: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a leg with valid LineString", () => {
    const result = legSchema.safeParse({
      ...validLeg,
      routeGeoJson: validLineString,
    });
    expect(result.success).toBe(true);
  });

  it("rejects LineString with wrong type", () => {
    const result = legSchema.safeParse({
      ...validLeg,
      routeGeoJson: { type: "Point", coordinates: [135.5, 34.7] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects LineString with fewer than 2 coordinates", () => {
    const result = legSchema.safeParse({
      ...validLeg,
      routeGeoJson: { type: "LineString", coordinates: [[135.5, 34.7]] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects LineString with latitude out of bounds", () => {
    const result = legSchema.safeParse({
      ...validLeg,
      routeGeoJson: {
        type: "LineString",
        coordinates: [
          [135.5, 34.7],
          [135.8, 91],
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects LineString with longitude out of bounds", () => {
    const result = legSchema.safeParse({
      ...validLeg,
      routeGeoJson: {
        type: "LineString",
        coordinates: [
          [135.5, 34.7],
          [181, 35.0],
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid mode", () => {
    const result = legSchema.safeParse({ ...validLeg, mode: "rocket" });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = legSchema.safeParse({
      ...validLeg,
      departsAt: "2024-10-13T10:15:00+09:00",
      arrivesAt: "2024-10-13T11:00:00+09:00",
      serviceNumber: "HARUKA 12",
      notes: "Reserved seat",
      expenseId: "exp-1",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Expense
// ---------------------------------------------------------------------------

const validExpense = {
  id: "exp-1",
  tripId: "trip-1",
  title: "\u9053\u987F\u5800\u665A\u9910",
  amountMinor: 4500,
  currency: "JPY",
  status: "paid" as const,
  category: "food",
  beneficiaryParticipantIds: ["p1", "p2"],
  splitMethod: "equal" as const,
  splitValues: { p1: 2250, p2: 2250 },
  createdAt: "2024-10-12T18:30:00+09:00",
  updatedAt: "2024-10-12T18:30:00+09:00",
};

describe("expenseSchema", () => {
  it("accepts a valid expense", () => {
    const result = expenseSchema.safeParse(validExpense);
    expect(result.success).toBe(true);
  });

  it("accepts all expense statuses", () => {
    for (const status of ["planned", "paid", "cancelled"] as const) {
      const result = expenseSchema.safeParse({ ...validExpense, status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid expense status", () => {
    const result = expenseSchema.safeParse({ ...validExpense, status: "refunded" });
    expect(result.success).toBe(false);
  });

  it("accepts all split methods", () => {
    for (const method of ["equal", "shares", "percentage", "fixed"] as const) {
      const result = expenseSchema.safeParse({ ...validExpense, splitMethod: method });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid split method", () => {
    const result = expenseSchema.safeParse({ ...validExpense, splitMethod: "byPerson" });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer amountMinor", () => {
    const result = expenseSchema.safeParse({ ...validExpense, amountMinor: 45.5 });
    expect(result.success).toBe(false);
  });

  it("accepts zero amountMinor", () => {
    const result = expenseSchema.safeParse({ ...validExpense, amountMinor: 0 });
    expect(result.success).toBe(true);
  });

  it("accepts negative amountMinor (refund)", () => {
    const result = expenseSchema.safeParse({ ...validExpense, amountMinor: -1000 });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = expenseSchema.safeParse({ ...validExpense, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty category", () => {
    const result = expenseSchema.safeParse({ ...validExpense, category: "" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PackingItem
// ---------------------------------------------------------------------------

const validPackingItem = {
  id: "pack-1",
  tripId: "trip-1",
  category: "\u8863\u7269",
  title: "\u6362\u6D17\u8863\u7269",
  quantity: 3,
  required: true,
  packed: false,
  sortOrder: 0,
};

describe("packingItemSchema", () => {
  it("accepts a valid packing item", () => {
    const result = packingItemSchema.safeParse(validPackingItem);
    expect(result.success).toBe(true);
  });

  it("rejects quantity of 0", () => {
    const result = packingItemSchema.safeParse({ ...validPackingItem, quantity: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = packingItemSchema.safeParse({ ...validPackingItem, quantity: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer quantity", () => {
    const result = packingItemSchema.safeParse({ ...validPackingItem, quantity: 1.5 });
    expect(result.success).toBe(false);
  });

  it("accepts quantity of 1", () => {
    const result = packingItemSchema.safeParse({ ...validPackingItem, quantity: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = packingItemSchema.safeParse({ ...validPackingItem, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty category", () => {
    const result = packingItemSchema.safeParse({ ...validPackingItem, category: "" });
    expect(result.success).toBe(false);
  });

  it("accepts all boolean combinations for required/packed", () => {
    expect(packingItemSchema.safeParse({ ...validPackingItem, required: true, packed: true }).success).toBe(true);
    expect(packingItemSchema.safeParse({ ...validPackingItem, required: false, packed: true }).success).toBe(true);
    expect(packingItemSchema.safeParse({ ...validPackingItem, required: false, packed: false }).success).toBe(true);
  });
});
