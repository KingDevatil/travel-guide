import { lazy, Suspense, useMemo, useState } from "react";
import { MapPin, Route } from "lucide-react";
import type { Trip, Stop } from "../../domain/models";
import { useItinerary } from "../../hooks/useItinerary";
import { StopEditor } from "./StopEditor";
import { LegEditor } from "./LegEditor";
import { tripDates } from "../../domain/dates";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { formatScheduledTimeRange, formatTimezoneLabel } from "../../domain/timezones";

const TripMap = lazy(async () => ({ default: (await import("../map/TripMap")).TripMap }));
const transportLabels = { walk: "步行", bike: "骑行", bus: "公交", metro: "地铁", taxi: "出租车", drive: "自驾", train: "火车", highSpeedRail: "高铁", flight: "飞机", ferry: "轮渡", other: "其他" } as const;

function stopEndDate(stop: Stop): string {
  return stop.endsAt?.slice(0, 10) || stop.date;
}

export function ItineraryTimeline({ trip, showMap = false }: { trip: Trip; showMap?: boolean }) {
  const { stops, legs, loading, saveStop, saveLeg, moveStop, deleteStop, deleteLeg } = useItinerary(trip.id);
  const [editingStop, setEditingStop] = useState<Stop | null | undefined>();
  const [editingLegId, setEditingLegId] = useState<string | null | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Stop>();
  const [guidance, setGuidance] = useState("");
  const dates = useMemo(() => tripDates(trip.startDate, trip.endDate), [trip.endDate, trip.startDate]);

  const openTransportEditor = () => {
    if (stops.length < 2) {
      setGuidance(stops.length === 0 ? "添加交通前，先添加出发地和目的地两个节点。" : "还需要再添加一个节点，才能连接交通。" );
      return;
    }
    setGuidance("");
    setEditingLegId(null);
  };

  return <section className="data-timeline" aria-label="行程节点管理">
    <div className="data-timeline__header"><div><h3>行程节点与交通</h3><p>按顺序添加目的地，再连接城市间交通。</p></div><button onClick={() => setEditingStop(null)}><MapPin aria-hidden="true" />添加节点</button><button className="secondary-action" onClick={openTransportEditor}><Route aria-hidden="true" />添加交通</button></div>
    {guidance && <div className="flow-guidance" role="status"><span>{guidance}</span><button onClick={() => setEditingStop(null)}>{stops.length === 0 ? "添加第一个节点" : "再添加一个节点"}</button></div>}
    {loading ? <p>正在加载行程…</p> : stops.length === 0 ? <div className="itinerary-empty"><MapPin aria-hidden="true" /><strong>还没有行程节点</strong><p>从搜索城市开始，坐标会自动匹配。</p><button onClick={() => setEditingStop(null)}>添加第一个节点</button></div> : dates.filter((date) => {
      const hasStartingStop = stops.some((stop) => stop.date === date);
      const isCoveredByEarlierStop = stops.some((stop) => stop.date < date && stopEndDate(stop) >= date);
      return hasStartingStop || !isCoveredByEarlierStop;
    }).map((date) => {
      const dayStops = stops.filter((stop) => stop.date === date);
      const onlyStopEndDate = dayStops.length === 1 ? stopEndDate(dayStops[0]) : date;
      const dateLabel = onlyStopEndDate > date ? `${date} 至 ${onlyStopEndDate}` : date;
      return <div className="data-timeline__day" key={date}><h4>{dateLabel}</h4>{dayStops.length === 0 ? <p className="empty-day">暂无安排</p> : dayStops.map((stop, index) => <article className="data-timeline__stop" key={stop.id}><div><strong>{stop.title}</strong><span>{stop.address || [stop.city, stop.country].filter(Boolean).join("，") || "地图选点"}</span>{stop.address && <span>{[stop.city, stop.country].filter(Boolean).join("，")}</span>}{stop.startsAt && <span>{formatScheduledTimeRange(stop.startsAt, stop.endsAt)} · {stop.timezone ? `当地时间 ${formatTimezoneLabel(stop.timezone, stop.date)}` : `行程时区 ${trip.timezone}`}</span>}</div><div><button onClick={() => setEditingStop(stop)}>编辑</button><button disabled={index === 0} onClick={() => void moveStop(stop, -1)}>上移</button><button disabled={index === dayStops.length - 1} onClick={() => void moveStop(stop, 1)}>下移</button><button onClick={() => setPendingDelete(stop)}>删除</button></div></article>)}</div>;
    })}
    {legs.length > 0 && <section className="data-timeline__legs"><h4>交通段</h4>{legs.map((leg) => <div key={leg.id}><span>{stops.find((stop) => stop.id === leg.fromStopId)?.title} → {stops.find((stop) => stop.id === leg.toStopId)?.title} · {transportLabels[leg.mode]}</span><button onClick={() => setEditingLegId(leg.id)}>编辑</button><button onClick={() => void deleteLeg(leg.id)}>删除</button></div>)}</section>}
    {showMap && <Suspense fallback={<p>正在加载地图…</p>}><TripMap stops={stops} legs={legs} onSelectStop={(id) => setEditingStop(stops.find((stop) => stop.id === id))} /></Suspense>}
    {editingStop !== undefined && <StopEditor stop={editingStop ?? undefined} date={trip.startDate} tripStartDate={trip.startDate} tripEndDate={trip.endDate} tripTimezone={trip.timezone} existingStops={stops} onSave={(draft) => saveStop(draft, editingStop ?? undefined)} onClose={() => setEditingStop(undefined)} />}
    {editingLegId !== undefined && <LegEditor leg={editingLegId ? legs.find((leg) => leg.id === editingLegId) : undefined} stops={stops} currency={trip.defaultCurrency} onSave={(draft) => saveLeg(draft, editingLegId ? legs.find((leg) => leg.id === editingLegId) : undefined)} onClose={() => setEditingLegId(undefined)} />}
    <ConfirmDialog open={Boolean(pendingDelete)} title="删除节点？" message="该节点关联的交通段会一并删除；关联消费会保留但不再关联该节点。" confirmLabel="删除节点" onClose={() => setPendingDelete(undefined)} onConfirm={() => { if (pendingDelete) void deleteStop(pendingDelete.id).then(() => setPendingDelete(undefined)); }} />
  </section>;
}
