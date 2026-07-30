import { describe, expect, it } from "vitest";
import type { Leg, Stop } from "../../src/domain/models";
import { analyzeItinerary, estimateTravelMinutes, haversineDistanceKm } from "../../src/domain/itinerary-analysis";

function stop(overrides: Partial<Stop>): Stop {
  return {
    id: crypto.randomUUID(),
    tripId: "trip-1",
    date: "2026-08-01",
    sortOrder: 0,
    title: "安排",
    latitude: 31.23,
    longitude: 121.47,
    ...overrides,
  };
}

describe("itinerary analysis", () => {
  it("calculates distances and conservative travel estimates", () => {
    expect(haversineDistanceKm(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    )).toBeCloseTo(111.2, 1);
    expect(estimateTravelMinutes(1, "walk")).toBeGreaterThanOrEqual(15);
  });

  it("flags overlap, tight transfers and missing transport", () => {
    const first = stop({
      id: "first",
      title: "博物馆",
      sortOrder: 0,
      endsAt: "2026-08-01T11:00",
    });
    const second = stop({
      id: "second",
      title: "午餐",
      sortOrder: 1,
      latitude: 31.25,
      longitude: 121.49,
      startsAt: "2026-08-01T10:30",
    });

    const issues = analyzeItinerary([first, second], []);
    expect(issues.map((issue) => issue.type)).toEqual(["overlap", "missing-transport"]);
  });

  it("recognizes a connected pair and ignores the want-to-go list", () => {
    const first = stop({ id: "first", sortOrder: 0 });
    const second = stop({ id: "second", sortOrder: 1, latitude: 31.25, longitude: 121.49 });
    const later = stop({ id: "later", sortOrder: 2, unscheduled: true, latitude: 32, longitude: 122 });
    const leg: Leg = {
      id: "leg-1",
      tripId: "trip-1",
      fromStopId: first.id,
      toStopId: second.id,
      mode: "metro",
    };

    expect(analyzeItinerary([first, second, later], [leg])).toEqual([]);
  });
});

