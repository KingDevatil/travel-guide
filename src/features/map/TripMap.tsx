import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Leg, Stop } from "../../domain/models";
import { itineraryGeoJson } from "./geojson";
import { mapStyle } from "./map-style";
import { mapViewportForStops } from "./viewport";

interface TripMapProps { stops: Stop[]; legs: Leg[]; day?: string; selectedStopId?: string; onSelectStop?: (id: string) => void; onPickCoordinates?: (coordinates: { latitude: number; longitude: number }) => void; }

function focusMap(map: maplibregl.Map, stops: Stop[], day?: string, selectedStopId?: string) {
  const selectedStop = selectedStopId ? stops.find((stop) => stop.id === selectedStopId) : undefined;
  if (selectedStop && Number.isFinite(selectedStop.longitude) && Number.isFinite(selectedStop.latitude)) {
    map.easeTo({ center: [selectedStop.longitude, selectedStop.latitude], zoom: 15 });
    return;
  }
  const viewport = mapViewportForStops(stops, day);
  if (!viewport) return;
  if (viewport.type === "center") {
    map.easeTo({ center: viewport.center, zoom: viewport.zoom });
    return;
  }
  map.fitBounds(viewport.bounds, { padding: 64, maxZoom: viewport.maxZoom });
}

export function TripMap({ stops, legs, day, selectedStopId, onSelectStop, onPickCoordinates }: TripMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const dataRef = useRef({ stops, legs, day, selectedStopId });
  const onSelectStopRef = useRef(onSelectStop);
  const onPickCoordinatesRef = useRef(onPickCoordinates);
  const [failed, setFailed] = useState(false);
  dataRef.current = { stops, legs, day, selectedStopId };
  onSelectStopRef.current = onSelectStop;
  onPickCoordinatesRef.current = onPickCoordinates;

  useEffect(() => {
    if (!host.current || mapRef.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({ container: host.current, style: mapStyle, center: [0, 20], zoom: 1.5 });
    } catch {
      setFailed(true);
      return;
    }
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("error", () => setFailed(true));
    map.on("load", () => {
      const current = dataRef.current;
      map.addSource("itinerary", { type: "geojson", data: itineraryGeoJson(current.stops, current.legs, current.day) });
      map.addLayer({ id: "legs", type: "line", source: "itinerary", filter: ["==", "$type", "LineString"], paint: { "line-color": "#12335f", "line-width": 3, "line-dasharray": [2, 1] } });
      map.addLayer({ id: "stops", type: "circle", source: "itinerary", filter: ["==", "$type", "Point"], paint: { "circle-color": "#ff5a36", "circle-radius": 7, "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
      map.on("click", "stops", (event) => { const id = event.features?.[0]?.properties?.id; if (id) onSelectStopRef.current?.(id); });
      map.on("click", (event) => onPickCoordinatesRef.current?.({ latitude: event.lngLat.lat, longitude: event.lngLat.lng }));
      focusMap(map, current.stops, current.day, current.selectedStopId);
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const source = map.getSource("itinerary") as maplibregl.GeoJSONSource | undefined;
    source?.setData(itineraryGeoJson(stops, legs, day));
    focusMap(map, stops, day, selectedStopId);
  }, [day, legs, selectedStopId, stops]);
  if (failed) return <div className="trip-map__fallback"><p>地图暂时不可用，但行程节点仍可编辑。</p><button onClick={() => { setFailed(false); mapRef.current?.setStyle(mapStyle); }}>重试地图</button></div>;
  return <div className="trip-map" ref={host} aria-label="行程地图" />;
}
