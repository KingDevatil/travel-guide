import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { Stop, Trip } from "../../domain/models";
import { tripDates } from "../../domain/dates";
import { useItinerary } from "../../hooks/useItinerary";
import { StopEditor } from "../itinerary/StopEditor";
const TripMap = lazy(async () => ({ default: (await import("./TripMap")).TripMap }));

export function TripMapView({ trip }: { trip: Trip }) {
  const { stops, legs, saveStop } = useItinerary(trip.id);
  const dates = tripDates(trip.startDate, trip.endDate);
  const [day, setDay] = useState(trip.startDate);
  const [selectedStopId, setSelectedStopId] = useState<string>();
  const [picking, setPicking] = useState(false);
  const [coordinate, setCoordinate] = useState<{ latitude: number; longitude: number }>();
  const [fitRequest, setFitRequest] = useState(0);
  useEffect(() => {
    setDay(trip.startDate);
    setSelectedStopId(undefined);
    setPicking(false);
    setCoordinate(undefined);
    setFitRequest((value) => value + 1);
  }, [trip.id, trip.startDate]);
  const stopsByDate = useMemo(() => {
    const grouped = new Map<string, Stop[]>();
    for (const stop of stops) {
      const dayStops = grouped.get(stop.date);
      if (dayStops) dayStops.push(stop);
      else grouped.set(stop.date, [stop]);
    }
    for (const dayStops of grouped.values()) dayStops.sort((a, b) => a.sortOrder - b.sortOrder);
    return grouped;
  }, [stops]);
  const selectDay = (nextDay: string) => { setDay(nextDay); setSelectedStopId(undefined); };
  const selectStop = (stop: Stop) => { setDay(stop.date); setSelectedStopId(stop.id); };
  return <section className="feature-panel map-view" aria-label="行程地图视图"><header className="feature-heading"><div><h2>行程地图</h2><p>选择日期聚焦当天安排，选择节点可查看具体位置。</p></div><div className="map-controls"><button aria-pressed={!day} onClick={() => selectDay("")}>全览</button><button onClick={() => setFitRequest((value) => value + 1)}>适配范围</button><button aria-pressed={picking} onClick={() => setPicking((value) => !value)}>{picking ? "请点击地图位置" : "在地图点选节点"}</button></div></header><div className="map-workspace"><aside className="map-day-list" aria-label="按日查看行程">{dates.map((date) => { const dayStops = stopsByDate.get(date) ?? []; const isActive = day === date; return <section key={date} className={isActive ? "active" : ""}><button className="map-day-list__date" onClick={() => selectDay(date)} aria-pressed={isActive}>{date}<small>{dayStops.length} 项安排</small></button>{isActive && <div className="map-day-list__stops">{dayStops.length ? dayStops.map((stop) => <button key={stop.id} className={selectedStopId === stop.id ? "active" : ""} onClick={() => selectStop(stop)}><strong>{stop.title}</strong><span>{stop.address || stop.city || "未填写地点"}</span></button>) : <p>当天暂无安排</p>}</div>}</section>; })}</aside><Suspense fallback={<p>正在加载地图…</p>}><TripMap stops={stops} legs={legs} day={day || undefined} selectedStopId={selectedStopId} fitRequest={fitRequest} onSelectStop={(id) => { const stop = stops.find((item) => item.id === id); if (stop) selectStop(stop); }} onPickCoordinates={picking ? (value) => { setCoordinate(value); setPicking(false); } : undefined} /></Suspense></div>{coordinate && <StopEditor date={day || trip.startDate} tripStartDate={trip.startDate} tripEndDate={trip.endDate} tripTimezone={trip.timezone} initialCoordinates={coordinate} existingStops={stops} onSave={async (draft) => { await saveStop(draft); setCoordinate(undefined); }} onClose={() => setCoordinate(undefined)} />}</section>;
}
