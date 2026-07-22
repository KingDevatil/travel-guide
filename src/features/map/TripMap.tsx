import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Leg, Stop } from "../../domain/models";
import { itineraryGeoJson } from "./geojson";
import { mapStyle } from "./map-style";

interface TripMapProps { stops: Stop[]; legs: Leg[]; day?: string; onSelectStop?: (id: string) => void; onPickCoordinates?: (coordinates: { latitude: number; longitude: number }) => void; }
export function TripMap({ stops, legs, day, onSelectStop, onPickCoordinates }: TripMapProps) {
  const host = useRef<HTMLDivElement>(null); const mapRef = useRef<maplibregl.Map | null>(null); const [failed, setFailed] = useState(false);
  useEffect(() => { if (!host.current || mapRef.current) return; const map = new maplibregl.Map({ container: host.current, style: mapStyle, center: [139.6917, 35.6895], zoom: 3 }); map.addControl(new maplibregl.NavigationControl(), "top-right"); map.on("error", () => setFailed(true)); map.on("load", () => { map.addSource("itinerary", { type: "geojson", data: itineraryGeoJson(stops, legs, day) }); map.addLayer({ id: "legs", type: "line", source: "itinerary", filter: ["==", "$type", "LineString"], paint: { "line-color": "#12335f", "line-width": 3, "line-dasharray": [2, 1] } }); map.addLayer({ id: "stops", type: "circle", source: "itinerary", filter: ["==", "$type", "Point"], paint: { "circle-color": "#ff5a36", "circle-radius": 7, "circle-stroke-color": "#fff", "circle-stroke-width": 2 } }); map.on("click", "stops", (event) => { const id = event.features?.[0]?.properties?.id; if (id) onSelectStop?.(id); }); map.on("click", (event) => onPickCoordinates?.({ latitude: event.lngLat.lat, longitude: event.lngLat.lng })); }); mapRef.current = map; return () => { map.remove(); mapRef.current = null; }; }, [day, legs, onPickCoordinates, onSelectStop, stops]);
  useEffect(() => { const map = mapRef.current; if (!map?.isStyleLoaded()) return; const source = map.getSource("itinerary") as maplibregl.GeoJSONSource | undefined; source?.setData(itineraryGeoJson(stops, legs, day)); if (stops.length) { const bounds = new maplibregl.LngLatBounds(); stops.filter((stop) => !day || stop.date === day).forEach((stop) => bounds.extend([stop.longitude, stop.latitude])); if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 50, maxZoom: 12 }); } }, [day, legs, stops]);
  if (failed) return <div className="trip-map__fallback"><p>地图暂时不可用，但行程节点仍可编辑。</p><button onClick={() => { setFailed(false); mapRef.current?.setStyle(mapStyle); }}>重试地图</button></div>;
  return <div className="trip-map" ref={host} aria-label="行程地图" />;
}
