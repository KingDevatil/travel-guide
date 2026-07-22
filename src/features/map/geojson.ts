import type { FeatureCollection, LineString, Point } from "geojson";
import type { Leg, Stop } from "../../domain/models";

export function itineraryGeoJson(stops: Stop[], legs: Leg[], date?: string): FeatureCollection<Point | LineString> {
  const visible = stops.filter((stop) => !date || stop.date === date).sort((a, b) => a.sortOrder - b.sortOrder);
  const features: FeatureCollection<Point | LineString>["features"] = visible.map((stop) => ({ type: "Feature", properties: { id: stop.id, title: stop.title, date: stop.date, city: stop.city ?? "" }, geometry: { type: "Point", coordinates: [stop.longitude, stop.latitude] } }));
  for (const leg of legs) { const from = visible.find((stop) => stop.id === leg.fromStopId); const to = visible.find((stop) => stop.id === leg.toStopId); if (from && to) features.push({ type: "Feature", properties: { id: leg.id, mode: leg.mode }, geometry: { type: "LineString", coordinates: [[from.longitude, from.latitude], [to.longitude, to.latitude]] } }); }
  return { type: "FeatureCollection", features };
}
