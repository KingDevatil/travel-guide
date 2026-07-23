import { describe, expect, it } from "vitest";
import type { Stop } from "../../src/domain/models";
import { mapViewportForStops } from "../../src/features/map/viewport";

const stop = (id: string, longitude: number, latitude: number, date = "2026-10-01"): Stop => ({
  id,
  tripId: "trip",
  date,
  sortOrder: 0,
  title: id,
  longitude,
  latitude,
});

describe("map viewport", () => {
  it("focuses a single place at neighborhood level", () => {
    expect(mapViewportForStops([stop("osaka", 135.5023, 34.6937)])).toEqual({
      type: "center",
      center: [135.5023, 34.6937],
      zoom: 13,
    });
  });

  it("fits tightly around clustered places instead of using the world view", () => {
    expect(mapViewportForStops([
      stop("usj", 135.4323, 34.6654),
      stop("osaka-castle", 135.5259, 34.6873),
      stop("umeda", 135.4983, 34.7055),
    ])).toEqual({
      type: "bounds",
      bounds: [[135.4323, 34.6654], [135.5259, 34.7055]],
      maxZoom: 13,
    });
  });

  it("uses only the selected day's places and has no viewport without places", () => {
    const stops = [
      stop("osaka", 135.5023, 34.6937),
      stop("tokyo", 139.6917, 35.6895, "2026-10-02"),
    ];
    expect(mapViewportForStops(stops, "2026-10-02")).toMatchObject({ type: "center", center: [139.6917, 35.6895] });
    expect(mapViewportForStops(stops, "2026-10-03")).toBeUndefined();
    expect(mapViewportForStops([])).toBeUndefined();
  });
});
