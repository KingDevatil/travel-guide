import type { Stop } from "../../domain/models";

export type MapViewport =
  | { type: "center"; center: [number, number]; zoom: number }
  | { type: "bounds"; bounds: [[number, number], [number, number]]; maxZoom: number };

export function mapViewportForStops(stops: Stop[], day?: string): MapViewport | undefined {
  const coordinates = stops
    .filter((stop) => (!day || stop.date === day) && Number.isFinite(stop.longitude) && Number.isFinite(stop.latitude))
    .map((stop) => [stop.longitude, stop.latitude] as [number, number]);

  if (coordinates.length === 0) return undefined;

  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);

  if (west === east && south === north) {
    return { type: "center", center: [west, south], zoom: 13 };
  }

  return {
    type: "bounds",
    bounds: [[west, south], [east, north]],
    maxZoom: 13,
  };
}
