import { lazy, Suspense, useState } from "react";
import type { Trip } from "../../domain/models";
import { tripDates } from "../../domain/dates";
import { useItinerary } from "../../hooks/useItinerary";
import { StopEditor } from "../itinerary/StopEditor";
const TripMap = lazy(async () => ({ default: (await import("./TripMap")).TripMap }));

export function TripMapView({ trip }: { trip: Trip }) {
  const { stops, legs, saveStop } = useItinerary(trip.id);
  const [day, setDay] = useState("");
  const [picking, setPicking] = useState(false);
  const [coordinate, setCoordinate] = useState<{ latitude: number; longitude: number }>();
  return <section className="feature-panel map-view" aria-label="行程地图视图"><header className="feature-heading"><div><h2>行程地图</h2><p>自动聚焦行程地点 · 坐标使用 WGS84</p></div><div className="map-controls"><label>范围<select value={day} onChange={(event) => setDay(event.target.value)}><option value="">全览</option>{tripDates(trip.startDate, trip.endDate).map((date) => <option key={date}>{date}</option>)}</select></label><button aria-pressed={picking} onClick={() => setPicking((value) => !value)}>{picking ? "请点击地图位置" : "在地图点选节点"}</button></div></header><Suspense fallback={<p>正在加载地图…</p>}><TripMap stops={stops} legs={legs} day={day || undefined} onPickCoordinates={picking ? (value) => { setCoordinate(value); setPicking(false); } : undefined} /></Suspense>{coordinate && <StopEditor date={day || trip.startDate} tripStartDate={trip.startDate} tripEndDate={trip.endDate} tripTimezone={trip.timezone} initialCoordinates={coordinate} existingStops={stops} onSave={(draft) => saveStop(draft)} onClose={() => setCoordinate(undefined)} />}</section>;
}
