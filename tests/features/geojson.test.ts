import { describe, expect, it } from "vitest";
import type { Leg, Stop } from "../../src/domain/models";
import { itineraryGeoJson } from "../../src/features/map/geojson";

const stops: Stop[] = [
  { id: "beijing", tripId: "t", date: "2026-08-01", sortOrder: 0, title: "北京", latitude: 39.9042, longitude: 116.4074 },
  { id: "shanghai", tripId: "t", date: "2026-08-01", sortOrder: 1, title: "上海", latitude: 31.2304, longitude: 121.4737 },
  { id: "tokyo", tripId: "t", date: "2026-08-02", sortOrder: 0, title: "东京", latitude: 35.6762, longitude: 139.6503 },
  { id: "paris", tripId: "t", date: "2026-08-03", sortOrder: 0, title: "巴黎", latitude: 48.8566, longitude: 2.3522 },
  { id: "new-york", tripId: "t", date: "2026-08-04", sortOrder: 0, title: "纽约", latitude: 40.7128, longitude: -74.006 },
];
const legs: Leg[] = [{ id: "flight", tripId: "t", fromStopId: "tokyo", toStopId: "paris", mode: "flight" }];

describe("global WGS84 map data", () => {
  it("keeps mainland China and overseas coordinates in one feature collection", () => {
    const result = itineraryGeoJson(stops, legs);
    expect(result.features.filter((feature) => feature.geometry.type === "Point")).toHaveLength(5);
    expect(result.features.some((feature) => feature.geometry.type === "LineString" && feature.properties?.mode === "flight")).toBe(true);
    expect(result.features.find((feature) => feature.properties?.id === "new-york")?.geometry).toEqual({ type: "Point", coordinates: [-74.006, 40.7128] });
  });

  it("filters points and lines to the selected day", () => {
    const result = itineraryGeoJson(stops, legs, "2026-08-01");
    expect(result.features.map((feature) => feature.properties?.id)).toEqual(["beijing", "shanghai"]);
  });

  it("returns valid collections for empty and single-stop trips", () => {
    expect(itineraryGeoJson([], []).features).toEqual([]);
    expect(itineraryGeoJson(stops.slice(0, 1), []).features).toHaveLength(1);
  });
});
