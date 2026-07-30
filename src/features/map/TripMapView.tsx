import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { Stop, Trip } from "../../domain/models";
import { tripDates } from "../../domain/dates";
import { useItinerary } from "../../hooks/useItinerary";
import { StopEditor } from "../itinerary/StopEditor";
import { adjacentStopPairs } from "../../domain/itinerary-analysis";
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
  const routePairs = useMemo(() => adjacentStopPairs(day ? stops.filter((stop) => stop.date === day) : stops, legs), [day, legs, stops]);
  const selectDay = (nextDay: string) => { setDay(nextDay); setSelectedStopId(undefined); };
  const selectStop = (stop: Stop) => { setDay(stop.date); setSelectedStopId(stop.id); };
  return <section className="feature-panel map-view" aria-label="行程地图视图">
    <header className="feature-heading"><div><h2>行程地图</h2><p>查看当天地点、相邻距离与保守交通时间；实际路况请在出发前用导航确认。</p></div><div className="map-controls"><button aria-pressed={!day} onClick={() => selectDay("")}>全览</button><button onClick={() => setFitRequest((value) => value + 1)}>适配范围</button><button aria-pressed={picking} onClick={() => setPicking((value) => !value)}>{picking ? "请点击地图位置" : "在地图添加安排"}</button></div></header>
    <div className="map-workspace"><aside className="map-day-list" aria-label="按日查看行程">{dates.map((date) => { const dayStops = (stopsByDate.get(date) ?? []).filter((stop) => !stop.unscheduled); const isActive = day === date; return <section key={date} className={isActive ? "active" : ""}><button className="map-day-list__date" onClick={() => selectDay(date)} aria-pressed={isActive}>{date}<small>{dayStops.length} 项安排</small></button>{isActive && <div className="map-day-list__stops">{dayStops.length ? dayStops.map((stop) => <button key={stop.id} className={selectedStopId === stop.id ? "active" : ""} onClick={() => selectStop(stop)}><strong>{stop.title}</strong><span>{stop.address || stop.city || "未填写地点"}</span></button>) : <div className="map-day-empty"><p>当天暂无安排</p><button onClick={() => setPicking(true)}>在地图添加第一项</button></div>}</div>}</section>; })}</aside><Suspense fallback={<p>正在加载地图…</p>}><TripMap stops={stops.filter((stop) => !stop.unscheduled)} legs={legs} day={day || undefined} selectedStopId={selectedStopId} fitRequest={fitRequest} onSelectStop={(id) => { const stop = stops.find((item) => item.id === id); if (stop) selectStop(stop); }} onPickCoordinates={picking ? (value) => { setCoordinate(value); setPicking(false); } : undefined} /></Suspense></div>
    {routePairs.length > 0 && <section className="route-guidance" aria-label="相邻安排路线">
      <h3>相邻安排</h3>
      <div>{routePairs.map((pair) => {
        const navigationUrl = `https://www.google.com/maps/dir/?api=1&origin=${pair.from.latitude},${pair.from.longitude}&destination=${pair.to.latitude},${pair.to.longitude}`;
        return <article key={`${pair.from.id}-${pair.to.id}`}><div><strong>{pair.from.title} → {pair.to.title}</strong><span>约 {pair.distanceKm.toFixed(1)} 公里 · 预留约 {pair.estimatedMinutes} 分钟{pair.leg ? ` · 已记录 ${pair.leg.mode}` : " · 未记录交通"}</span></div><a href={navigationUrl} target="_blank" rel="noreferrer">打开导航</a></article>;
      })}</div>
    </section>}
    {coordinate && <StopEditor date={day || trip.startDate} tripStartDate={trip.startDate} tripEndDate={trip.endDate} tripTimezone={trip.timezone} initialCoordinates={coordinate} existingStops={stops} onSave={async (draft) => { await saveStop(draft); setCoordinate(undefined); }} onClose={() => setCoordinate(undefined)} />}
  </section>;
}
