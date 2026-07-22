import { lazy, Suspense, useMemo, useState } from "react";
import type { Trip, Stop } from "../../domain/models";
import { useItinerary } from "../../hooks/useItinerary";
import { StopEditor } from "./StopEditor";
import { LegEditor } from "./LegEditor";
import { tripDates } from "../../domain/dates";
import { ConfirmDialog } from "../../components/ConfirmDialog";
const TripMap = lazy(async () => ({ default: (await import("../map/TripMap")).TripMap }));

export function ItineraryTimeline({ trip, showMap = false }: { trip: Trip; showMap?: boolean }) {
  const { stops, legs, loading, saveStop, saveLeg, moveStop, deleteStop, deleteLeg } = useItinerary(trip.id);
  const [editingStop, setEditingStop] = useState<Stop | null | undefined>(); const [editingLegId, setEditingLegId] = useState<string | null | undefined>(); const [pendingDelete, setPendingDelete] = useState<Stop>(); const dates = useMemo(() => tripDates(trip.startDate, trip.endDate), [trip.endDate, trip.startDate]);
  return <section className="data-timeline" aria-label="行程节点管理"><div className="data-timeline__header"><h3>行程节点与交通</h3><button onClick={() => setEditingStop(null)}>添加节点</button><button onClick={() => setEditingLegId(null)} disabled={stops.length < 2}>添加交通</button></div>
    {loading ? <p>正在加载行程…</p> : dates.map((date) => <div className="data-timeline__day" key={date}><h4>{date}</h4>{stops.filter((stop) => stop.date === date).map((stop, index, dayStops) => <article className="data-timeline__stop" key={stop.id}><div><strong>{stop.title}</strong><span>{stop.city || "未标注城市"} · {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}</span>{stop.startsAt && <span>{stop.startsAt} {stop.endsAt ? `— ${stop.endsAt}` : ""}</span>}</div><div><button onClick={() => setEditingStop(stop)}>编辑</button><button disabled={index === 0} onClick={() => void moveStop(stop, -1)}>上移</button><button disabled={index === dayStops.length - 1} onClick={() => void moveStop(stop, 1)}>下移</button><button onClick={() => setPendingDelete(stop)}>删除</button></div></article>)}</div>)}
    {legs.length > 0 && <section className="data-timeline__legs"><h4>交通段</h4>{legs.map((leg) => <div key={leg.id}><span>{stops.find((stop) => stop.id === leg.fromStopId)?.title} → {stops.find((stop) => stop.id === leg.toStopId)?.title} · {leg.mode}</span><button onClick={() => setEditingLegId(leg.id)}>编辑</button><button onClick={() => void deleteLeg(leg.id)}>删除</button></div>)}</section>}
    {showMap && <Suspense fallback={<p>正在加载地图…</p>}><TripMap stops={stops} legs={legs} onSelectStop={(id) => setEditingStop(stops.find((stop) => stop.id === id))} /></Suspense>}
    {editingStop !== undefined && <StopEditor stop={editingStop ?? undefined} date={trip.startDate} existingStops={stops} onSave={(draft) => saveStop(draft, editingStop ?? undefined)} onClose={() => setEditingStop(undefined)} />}
    {editingLegId !== undefined && <LegEditor leg={editingLegId ? legs.find((leg) => leg.id === editingLegId) : undefined} stops={stops} currency={trip.defaultCurrency} onSave={(draft) => saveLeg(draft, editingLegId ? legs.find((leg) => leg.id === editingLegId) : undefined)} onClose={() => setEditingLegId(undefined)} />}
    <ConfirmDialog open={Boolean(pendingDelete)} title="删除节点？" message="该节点关联的交通段会一并删除；关联消费会保留但不再关联该节点。" confirmLabel="删除节点" onClose={() => setPendingDelete(undefined)} onConfirm={() => { if (pendingDelete) void deleteStop(pendingDelete.id).then(() => setPendingDelete(undefined)); }} />
  </section>;
}
