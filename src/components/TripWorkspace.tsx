import { useMemo, useState } from "react";
import { Backpack, BookOpen, CalendarDays, ChevronDown, ChevronRight, CloudSun, EllipsisVertical, ListFilter, Map, MapPin, MoreHorizontal, Plane, Receipt, Search, Settings, ShieldCheck, Train, UtensilsCrossed, Users } from "lucide-react";
import type { Trip } from "../domain/models";
import type { ViewMode } from "../types";
import { useItinerary } from "../hooks/useItinerary";
import { StopEditor } from "../features/itinerary/StopEditor";
import { ItineraryTimeline } from "../features/itinerary/ItineraryTimeline";
import { TripMapView } from "../features/map/TripMapView";
import { ExpenseList } from "../features/expenses/ExpenseList";
import { PackingList } from "../features/packing/PackingList";

const views: { value: ViewMode; label: string; icon: typeof CalendarDays }[] = [
  { value: "itinerary", label: "行程", icon: CalendarDays }, { value: "map", label: "地图", icon: Map },
  { value: "expenses", label: "账单", icon: Receipt }, { value: "packing", label: "行李", icon: Backpack },
];
const weekday = (value: string) => ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][new Date(`${value}T00:00:00`).getDay()];
const dateLabel = (value: string) => `${Number(value.slice(5, 7))}月${Number(value.slice(8, 10))}日`;
const timeLabel = (value?: string) => value ? new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) : "待定";

function MapArtwork() {
  return <div className="planner-map-art" aria-label="大阪至京都的抽象行程地图">
    <div className="map-water" /><div className="map-grid map-grid-a" /><div className="map-grid map-grid-b" />
    <svg className="map-route" viewBox="0 0 620 520" preserveAspectRatio="none" aria-hidden="true"><path d="M65 395 C130 350 185 390 240 310 S325 210 390 185 S460 95 530 82" /><path className="map-route-inner" d="M65 395 C130 350 185 390 240 310 S325 210 390 185 S460 95 530 82" /></svg>
    <span className="map-city map-city-osaka" aria-hidden="true">大阪</span><span className="map-city map-city-kyoto" aria-hidden="true">京都市</span>
    <span className="map-pin map-pin-airport"><Plane /><b>关西国际机场 (KIX)</b></span>
    <span className="map-pin map-pin-osaka"><i />新大阪站</span><span className="map-pin map-pin-kyoto"><i />京都站</span>
    <span className="map-train-tag">▣ 新干线 · 15 分钟</span>
    <div className="map-zoom"><button>＋</button><button>−</button><button>◎</button></div>
  </div>;
}

export function TripWorkspace({ trip, trips, activeView, onChangeView, onOpenManager, managerButtonRef }: { trip: Trip; trips: Trip[]; activeView: ViewMode; onChangeView: (view: ViewMode) => void; onOpenManager: () => void; managerButtonRef: React.RefObject<HTMLButtonElement | null> }) {
  const { stops, loading, saveStop } = useItinerary(trip.id);
  const [selectedDay, setSelectedDay] = useState(trip.startDate);
  const [selectedStop, setSelectedStop] = useState<string>();
  const [adding, setAdding] = useState(false);
  const days = useMemo(() => Array.from({ length: Math.min(6, Math.max(1, Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000) + 1)) }, (_, i) => { const date = new Date(`${trip.startDate}T00:00:00`); date.setDate(date.getDate() + i); return date.toISOString().slice(0, 10); }), [trip.endDate, trip.startDate]);
  const currentStops = stops.filter((stop) => stop.date === selectedDay).sort((a, b) => a.sortOrder - b.sortOrder);
  const selected = stops.find((stop) => stop.id === selectedStop) ?? currentStops[0];
  const currentCity = currentStops[0]?.city || "大阪";
  return <div className="planner-shell">
    <header className="planner-topbar"><div className="planner-brand"><BookOpen /><span>旅程册</span></div><div className="planner-divider" /><button className="planner-trip"><strong>{trip.title}</strong><ChevronDown /><small>{dateLabel(trip.startDate)}—{dateLabel(trip.endDate)}</small></button><nav>{views.map(({ value, label, icon: Icon }) => <button key={value} className={activeView === value ? "active" : ""} onClick={() => onChangeView(value)}><Icon /><span>{label}</span></button>)}</nav><div className="planner-tools"><button aria-label="成员"><Users /></button><button ref={managerButtonRef} onClick={onOpenManager} aria-label="管理行程"><Settings /></button><button aria-label="更多"><MoreHorizontal /></button></div></header>
    <main className="planner-main">
      {activeView === "itinerary" ? <><aside className="planner-days"><button className="planner-add" onClick={() => setAdding(true)}>添加安排 <span>＋</span></button><div className="planner-day-list">{days.map((date, index) => { const isActive = date === selectedDay; const items = stops.filter((stop) => stop.date === date); return <button key={date} className={isActive ? "selected" : ""} onClick={() => { setSelectedDay(date); setSelectedStop(undefined); }}><i className="day-track">{index < days.length - 1 && <em />}</i><span><strong>{dateLabel(date)}</strong><b>{weekday(date)}</b><small aria-hidden="true">{items[0]?.city || (index === 0 ? "大阪" : "待安排")}</small><small>{items.length} 项安排</small></span><ChevronRight /></button>; })}</div><div className="planner-rail-tools"><CalendarDays /><ListFilter /><Search /></div></aside>
      <section className="planner-timeline"><header><div><h1>{dateLabel(selectedDay)} {weekday(selectedDay)} · {currentCity}</h1><p><CloudSun /> 晴&nbsp; 22°C / 16°C</p></div><div><button><ListFilter /> 调整顺序</button><button aria-label="更多"><EllipsisVertical /></button></div></header><div className="planner-timeline-scroll">{loading ? <p className="planner-loading">正在读取行程…</p> : currentStops.length ? <div className="planner-items">{currentStops.map((stop, index) => { const kind = index === 0 ? "arrival" : index === 1 ? "food" : "train"; const Icon = kind === "arrival" ? Plane : kind === "food" ? UtensilsCrossed : Train; return <button key={stop.id} className={`planner-item ${selected?.id === stop.id ? "selected" : ""}`} onClick={() => setSelectedStop(stop.id)}><time>{timeLabel(stop.startsAt)}</time><span className={`item-icon ${kind}`}><Icon /></span>{index < currentStops.length - 1 && <i className="item-line" />}<article><h2>{stop.title}</h2><p>{stop.address || [stop.city, stop.country].filter(Boolean).join(" · ") || "待补充地点"}</p><p className="item-detail">{stop.content || stop.notes || (kind === "train" ? "新干线 · 15 分钟" : "查看安排详情")}</p><ChevronRight /><EllipsisVertical /></article></button>; })}</div> : <div className="planner-empty"><MapPin /><strong>这一天还没有安排</strong><button onClick={() => setAdding(true)}>添加第一项安排</button></div>}<button className="planner-add-row" onClick={() => setAdding(true)}>＋&nbsp;&nbsp; 添加安排</button></div></section>
      <section className="planner-map"><header><div><button className="active">全览</button><button>当天</button><button>适配范围</button></div><button aria-label="全屏">⛶</button></header><MapArtwork /><footer><span><MapPin /> 已选择：{selected?.title || "暂无节点"}</span><button>查看详情 <ChevronRight /></button></footer></section><div className="planner-a11y-workflow"><ItineraryTimeline trip={trip} /></div></> : activeView === "map" ? <TripMapView trip={trip} /> : activeView === "expenses" ? <ExpenseList trip={trip} /> : <PackingList trip={trip} trips={trips} />}
    </main><footer className="planner-status"><ShieldCheck /> 数据仅保存在此设备</footer>
    {adding && <StopEditor date={selectedDay} tripStartDate={trip.startDate} tripEndDate={trip.endDate} tripTimezone={trip.timezone} existingStops={stops} onSave={async (draft) => { await saveStop(draft); setAdding(false); }} onClose={() => setAdding(false)} />}
  </div>;
}
