import { describe, expect, it } from "vitest";
import { createItineraryHtml } from "../../src/features/transfer/export-itinerary-html";
import type { PackingItem, Stop, Trip } from "../../src/domain/models";

const trip: Trip = { id: "trip-1", schemaVersion: 1, title: "印尼之旅", startDate: "2026-09-27", endDate: "2026-09-28", timezone: "Asia/Jakarta", defaultCurrency: "IDR", participantIds: [], createdAt: "2026-01-01", updatedAt: "2026-01-01" };
const stop: Stop = { id: "stop-1", tripId: trip.id, date: "2026-09-27", sortOrder: 1, title: "朱安达国际机场", city: "泗水", address: "Sidoarjo", latitude: 0, longitude: 0, startsAt: "2026-09-27T10:00:00+07:00", content: "抵达后前往酒店" };
const packing: PackingItem = { id: "packing-1", tripId: trip.id, category: "证件", title: "护照", quantity: 1, required: true, packed: false, sortOrder: 1 };

describe("itinerary HTML export", () => {
  it("renders every travel day and the packing list without expenses", () => {
    const html = createItineraryHtml(trip, [stop], [packing]);
    expect(html).toContain("朱安达国际机场");
    expect(html).toContain("抵达后前往酒店");
    expect(html).toContain("当天暂无安排");
    expect(html).toContain("护照");
    expect(html).toContain("必带");
    expect(html).not.toContain("账单");
  });
});
