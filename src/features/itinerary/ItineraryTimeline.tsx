import { lazy, Suspense, useMemo, useState } from "react";
import { AlertTriangle, Copy, GripVertical, MapPin, Route } from "lucide-react";
import type { Leg, Trip, Stop } from "../../domain/models";
import { useItinerary } from "../../hooks/useItinerary";
import { StopEditor } from "./StopEditor";
import { LegEditor } from "./LegEditor";
import { tripDates } from "../../domain/dates";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { formatScheduledTimeRange, formatTimezoneLabel } from "../../domain/timezones";
import { analyzeItinerary } from "../../domain/itinerary-analysis";

const TripMap = lazy(async () => ({ default: (await import("../map/TripMap")).TripMap }));
const transportLabels = { walk: "步行", bike: "骑行", bus: "公交", metro: "地铁", taxi: "出租车", drive: "自驾", train: "火车", highSpeedRail: "高铁", flight: "飞机", ferry: "轮渡", other: "其他" } as const;
const stopEndDate = (stop: Stop) => stop.endsAt?.slice(0, 10) || stop.date;

export function ItineraryTimeline({ trip, showMap = false }: { trip: Trip; showMap?: boolean }) {
  const {
    stops,
    legs,
    loading,
    saveStop,
    saveLeg,
    moveStop,
    moveToDate,
    copyStop,
    copyDay,
    moveMany,
    reorderDay,
    deleteStop,
    deleteLeg,
  } = useItinerary(trip.id);
  const [editingStop, setEditingStop] = useState<Stop | null | undefined>();
  const [editingLegId, setEditingLegId] = useState<string | null | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Stop>();
  const [pendingLegDelete, setPendingLegDelete] = useState<Leg>();
  const [guidance, setGuidance] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDate, setBulkDate] = useState(trip.startDate);
  const [draggingId, setDraggingId] = useState<string>();
  const dates = useMemo(() => tripDates(trip.startDate, trip.endDate), [trip.endDate, trip.startDate]);
  const scheduledStops = stops.filter((stop) => !stop.unscheduled);
  const wantToGo = stops.filter((stop) => stop.unscheduled);
  const issues = useMemo(() => analyzeItinerary(stops, legs), [legs, stops]);
  const visibleDates = dates.filter((date) => {
    const hasStartingStop = scheduledStops.some((stop) => stop.date === date);
    const isCoveredByEarlierStop = scheduledStops.some((stop) => stop.date < date && stopEndDate(stop) >= date);
    return hasStartingStop || !isCoveredByEarlierStop;
  });

  const openTransportEditor = () => {
    if (scheduledStops.length < 2) {
      setGuidance(scheduledStops.length === 0 ? "添加交通前，先添加出发地和目的地两个安排。" : "还需要再添加一个安排，才能连接交通。");
      return;
    }
    setGuidance("");
    setEditingLegId(null);
  };

  const toggleSelected = (id: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const dropBefore = async (target: Stop) => {
    const source = stops.find((stop) => stop.id === draggingId);
    setDraggingId(undefined);
    if (!source || source.date !== target.date || source.id === target.id) return;
    const dayStops = scheduledStops.filter((stop) => stop.date === target.date).sort((a, b) => a.sortOrder - b.sortOrder);
    const reordered = dayStops.filter((stop) => stop.id !== source.id);
    reordered.splice(reordered.findIndex((stop) => stop.id === target.id), 0, source);
    await reorderDay(reordered);
  };

  return <section className="data-timeline" aria-label="行程安排管理">
    <div className="data-timeline__header">
      <div><h3>行程安排与交通</h3><p>拖动调整顺序，或复制、改期与批量移动安排。</p></div>
      <button onClick={() => setEditingStop(null)}><MapPin aria-hidden="true" />添加安排</button>
      <button className="secondary-action" onClick={openTransportEditor}><Route aria-hidden="true" />添加交通</button>
    </div>
    {guidance && <div className="flow-guidance" role="status"><span>{guidance}</span><button onClick={() => setEditingStop(null)}>{scheduledStops.length === 0 ? "添加第一项安排" : "再添加一项安排"}</button></div>}
    {selectedIds.size > 0 && <div className="itinerary-bulk-actions" role="toolbar" aria-label="批量操作">
      <strong>已选择 {selectedIds.size} 项</strong>
      <label>移动到
        <select value={bulkDate} onChange={(event) => setBulkDate(event.target.value)}>
          {dates.map((date) => <option key={date} value={date}>{date}</option>)}
        </select>
      </label>
      <button onClick={() => void moveMany([...selectedIds], bulkDate).then(() => setSelectedIds(new Set()))}>确认移动</button>
      <button className="secondary-action" onClick={() => setSelectedIds(new Set())}>取消选择</button>
    </div>}
    {issues.length > 0 && <div className="itinerary-issues" role="status">
      <h4><AlertTriangle aria-hidden="true" />需要留意</h4>
      <ul>{issues.slice(0, 5).map((issue) => <li key={issue.id}><button onClick={() => setEditingStop(stops.find((stop) => stop.id === issue.toStopId))}>{issue.message}</button></li>)}</ul>
    </div>}
    {loading ? <p>正在加载行程…</p> : scheduledStops.length === 0 ? <div className="itinerary-empty"><MapPin aria-hidden="true" /><strong>还没有已排期的安排</strong><p>从搜索城市开始，坐标会自动匹配。</p><button onClick={() => setEditingStop(null)}>添加第一项安排</button></div> : visibleDates.map((date) => {
      const dayStops = scheduledStops.filter((stop) => stop.date === date).sort((a, b) => a.sortOrder - b.sortOrder);
      const nextDate = dates[dates.indexOf(date) + 1];
      const onlyStopEndDate = dayStops.length === 1 ? stopEndDate(dayStops[0]) : date;
      const heading = onlyStopEndDate > date ? `${date} 至 ${onlyStopEndDate}` : date;
      return <div className="data-timeline__day" key={date}>
        <div className="data-timeline__day-heading">
          <h4>{heading}</h4>
          {dayStops.length > 0 && nextDate && <button className="secondary-action" onClick={() => void copyDay(date, nextDate).then((count) => setGuidance(`已复制 ${count} 项安排到 ${nextDate}。`))}><Copy aria-hidden="true" />复制到下一天</button>}
        </div>
        {dayStops.length === 0 ? <p className="empty-day">暂无安排</p> : dayStops.map((stop, index) => <article
          className={`data-timeline__stop ${draggingId === stop.id ? "dragging" : ""}`}
          key={stop.id}
          draggable
          onDragStart={() => setDraggingId(stop.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => void dropBefore(stop)}
        >
          <GripVertical className="data-timeline__drag" aria-label="拖动安排" />
          <label className="data-timeline__select"><input type="checkbox" checked={selectedIds.has(stop.id)} onChange={() => toggleSelected(stop.id)} aria-label={`选择 ${stop.title}`} /></label>
          <div><strong>{stop.title}</strong><span>{stop.address || [stop.city, stop.country].filter(Boolean).join("，") || "地图选点"}</span>{stop.startsAt && <span>{formatScheduledTimeRange(stop.startsAt, stop.endsAt)} · {stop.timezone ? `当地时间 ${formatTimezoneLabel(stop.timezone, stop.date)}` : `行程时区 ${trip.timezone}`}</span>}</div>
          <div className="data-timeline__actions">
            <button onClick={() => setEditingStop(stop)}>编辑</button>
            <button onClick={() => void copyStop(stop.id)}>复制</button>
            <label>改期<select aria-label={`将 ${stop.title} 改期`} value={stop.date} onChange={(event) => void moveToDate(stop.id, event.target.value)}>{dates.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <button disabled={index === 0} onClick={() => void moveStop(stop, -1)}>上移</button>
            <button disabled={index === dayStops.length - 1} onClick={() => void moveStop(stop, 1)}>下移</button>
            <button onClick={() => setPendingDelete(stop)}>删除</button>
          </div>
        </article>)}
      </div>;
    })}
    {wantToGo.length > 0 && <section className="want-to-go-list">
      <h4>想去清单 <small>{wantToGo.length} 项</small></h4>
      <p>这些地点尚未占用行程时间，确定后可直接排入某一天。</p>
      {wantToGo.map((stop) => <article key={stop.id}><div><strong>{stop.title}</strong><span>{stop.address || stop.city}</span></div><label>安排到<select defaultValue="" onChange={(event) => event.target.value && void moveToDate(stop.id, event.target.value)}><option value="">选择日期</option>{dates.map((date) => <option key={date} value={date}>{date}</option>)}</select></label><button onClick={() => setEditingStop(stop)}>编辑</button></article>)}
    </section>}
    {legs.length > 0 && <section className="data-timeline__legs"><h4>交通段</h4>{legs.map((leg) => <div key={leg.id}><span>{stops.find((stop) => stop.id === leg.fromStopId)?.title} → {stops.find((stop) => stop.id === leg.toStopId)?.title} · {transportLabels[leg.mode]}{leg.serviceNumber ? ` · ${leg.serviceNumber}` : ""}</span><button onClick={() => setEditingLegId(leg.id)}>编辑</button><button onClick={() => setPendingLegDelete(leg)}>删除</button></div>)}</section>}
    {showMap && <Suspense fallback={<p>正在加载地图…</p>}><TripMap stops={scheduledStops} legs={legs} onSelectStop={(id) => setEditingStop(stops.find((stop) => stop.id === id))} /></Suspense>}
    {editingStop !== undefined && <StopEditor stop={editingStop ?? undefined} date={trip.startDate} tripStartDate={trip.startDate} tripEndDate={trip.endDate} tripTimezone={trip.timezone} existingStops={stops} onSave={(draft) => saveStop(draft, editingStop ?? undefined)} onClose={() => setEditingStop(undefined)} />}
    {editingLegId !== undefined && <LegEditor leg={editingLegId ? legs.find((leg) => leg.id === editingLegId) : undefined} stops={scheduledStops} currency={trip.defaultCurrency} onSave={(draft) => saveLeg(draft, editingLegId ? legs.find((leg) => leg.id === editingLegId) : undefined)} onClose={() => setEditingLegId(undefined)} />}
    <ConfirmDialog open={Boolean(pendingDelete)} title="删除安排？" message="该安排关联的交通段会一并删除；关联消费会保留但不再关联该安排。" confirmLabel="删除安排" onClose={() => setPendingDelete(undefined)} onConfirm={() => { if (pendingDelete) void deleteStop(pendingDelete.id).then(() => setPendingDelete(undefined)); }} />
    <ConfirmDialog open={Boolean(pendingLegDelete)} title="删除交通段？" message="交通段会被删除；关联消费会保留，但不再关联这段交通。" confirmLabel="删除交通" onClose={() => setPendingLegDelete(undefined)} onConfirm={() => { if (pendingLegDelete) void deleteLeg(pendingLegDelete.id).then(() => setPendingLegDelete(undefined)); }} />
  </section>;
}
