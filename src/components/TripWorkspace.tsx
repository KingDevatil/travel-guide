import { useMemo, useState } from "react";
import { Backpack, BookOpen, CalendarDays, ChevronDown, ChevronRight, CloudSun, ListFilter, Map, MapPin, MoreHorizontal, MoreVertical, Plane, Receipt, Search, Settings, ShieldCheck, Train, UtensilsCrossed, Users } from "lucide-react";
import type { Stop, Trip } from "../domain/models";
import type { ViewMode } from "../types";
import { useItinerary } from "../hooks/useItinerary";
import { StopEditor } from "../features/itinerary/StopEditor";
import { ItineraryTimeline } from "../features/itinerary/ItineraryTimeline";
import { TripMapView } from "../features/map/TripMapView";
import { TripMap } from "../features/map/TripMap";
import { ExpenseList } from "../features/expenses/ExpenseList";
import { PackingList } from "../features/packing/PackingList";
import { ConfirmDialog } from "./ConfirmDialog";

const views: { value: ViewMode; label: string; icon: typeof CalendarDays }[] = [
  { value: "itinerary", label: "行程", icon: CalendarDays }, { value: "map", label: "地图", icon: Map },
  { value: "expenses", label: "账单", icon: Receipt }, { value: "packing", label: "行李", icon: Backpack },
];
const weekday = (value: string) => ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][new Date(`${value}T00:00:00`).getDay()];
const dateLabel = (value: string) => `${Number(value.slice(5, 7))}月${Number(value.slice(8, 10))}日`;
const timeLabel = (value?: string) => value ? new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) : "待定";

function MapArtwork({ stops, legs, day, onSelectStop }: { stops: Parameters<typeof TripMap>[0]["stops"]; legs: Parameters<typeof TripMap>[0]["legs"]; day?: string; onSelectStop: (id: string) => void }) {
  return <div className="planner-map-art" aria-label="可交互行程地图"><TripMap stops={stops} legs={legs} day={day} onSelectStop={onSelectStop} /></div>;
}

export function TripWorkspace({ trip, trips, activeView, onChangeView, onOpenManager, managerButtonRef }: { trip: Trip; trips: Trip[]; activeView: ViewMode; onChangeView: (view: ViewMode) => void; onOpenManager: () => void; managerButtonRef: React.RefObject<HTMLButtonElement | null> }) {
  const { stops, legs, loading, saveStop, deleteStop } = useItinerary(trip.id);
  const [selectedDay, setSelectedDay] = useState(trip.startDate);
  const [selectedStop, setSelectedStop] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [mapRange, setMapRange] = useState<"full" | "day" | "fit">("full");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [editingStop, setEditingStop] = useState<Stop>();
  const [menuStopId, setMenuStopId] = useState<string>();
  const [pendingDelete, setPendingDelete] = useState<Stop>();
  const days = useMemo(() => Array.from({ length: Math.min(6, Math.max(1, Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000) + 1)) }, (_, i) => { const date = new Date(`${trip.startDate}T00:00:00`); date.setDate(date.getDate() + i); return date.toISOString().slice(0, 10); }), [trip.endDate, trip.startDate]);
  const currentStops = stops.filter((stop) => stop.date === selectedDay).sort((a, b) => a.sortOrder - b.sortOrder);
  const selected = stops.find((stop) => stop.id === selectedStop) ?? currentStops[0];
  const currentCity = currentStops[0]?.city || "大阪";
  return <div className="planner-shell">
    <header className="planner-topbar"><div className="planner-brand"><BookOpen /><span>旅程册</span></div><div className="planner-divider" /><button className="planner-trip" onClick={onOpenManager}><strong>{trip.title}</strong><ChevronDown /><small>{dateLabel(trip.startDate)}—{dateLabel(trip.endDate)}</small></button><nav>{views.map(({ value, label, icon: Icon }) => <button key={value} className={activeView === value ? "active" : ""} onClick={() => onChangeView(value)}><Icon /><span>{label}</span></button>)}</nav><div className="planner-tools"><button aria-label="管理成员和行程" onClick={onOpenManager}><Users /></button><button ref={managerButtonRef} onClick={onOpenManager} aria-label="管理行程"><Settings /></button><button aria-label="编辑安排" onClick={() => setPlanningOpen(true)}><MoreHorizontal /></button></div></header>
    <main className="planner-main">
      {activeView === "itinerary" ? <><aside className="planner-days"><button className="planner-add" onClick={() => setAdding(true)}>添加安排 <span>＋</span></button><div className="planner-day-list">{days.map((date, index) => { const isActive = date === selectedDay; const items = stops.filter((stop) => stop.date === date); return <button key={date} className={isActive ? "selected" : ""} onClick={() => { setSelectedDay(date); setSelectedStop(undefined); }}><i className="day-track">{index < days.length - 1 && <em />}</i><span><strong>{dateLabel(date)}</strong><b>{weekday(date)}</b><small aria-hidden="true">{items[0]?.city || (index === 0 ? "大阪" : "待安排")}</small><small>{items.length} 项安排</small></span><ChevronRight /></button>; })}</div><div className="planner-rail-tools"><button aria-label="回到旅行第一天" onClick={() => { setSelectedDay(trip.startDate); setSelectedStop(undefined); }}><CalendarDays /></button><button aria-label="管理安排" onClick={() => setPlanningOpen(true)}><ListFilter /></button><button aria-label="搜索安排" onClick={() => { setSearchText(""); setSearchOpen(true); }}><Search /></button></div></aside>
      <section className="planner-timeline"><header><div><h1>{dateLabel(selectedDay)} {weekday(selectedDay)} · {currentCity}</h1><p><CloudSun /> 晴&nbsp; 22°C / 16°C</p></div><div><button onClick={() => setPlanningOpen(true)}><ListFilter /> 管理安排</button></div></header><div className="planner-timeline-scroll">{loading ? <p className="planner-loading">正在读取行程…</p> : currentStops.length ? <div className="planner-items">{currentStops.map((stop, index) => { const kind = index === 0 ? "arrival" : index === 1 ? "food" : "train"; const Icon = kind === "arrival" ? Plane : kind === "food" ? UtensilsCrossed : Train; const menuOpen = menuStopId === stop.id; return <div key={stop.id} className={`planner-item ${selected?.id === stop.id ? "selected" : ""}`}><time>{timeLabel(stop.startsAt)}</time><span className={`item-icon ${kind}`}><Icon /></span>{index < currentStops.length - 1 && <i className="item-line" />}<button className="planner-item-main" onClick={() => setSelectedStop(stop.id)} aria-label={`查看 ${stop.title} 详情`}><article><h2>{stop.title}</h2><p>{stop.address || [stop.city, stop.country].filter(Boolean).join(" · ") || "待补充地点"}</p><p className="item-detail">{stop.content || stop.notes || (kind === "train" ? "新干线 · 15 分钟" : "查看安排详情")}</p><ChevronRight /></article></button><button className="planner-item-menu-button" aria-label={`${stop.title} 更多操作`} aria-expanded={menuOpen} onClick={() => setMenuStopId(menuOpen ? undefined : stop.id)}><MoreVertical /></button>{menuOpen && <div className="planner-item-menu" role="menu"><button role="menuitem" onClick={() => { setMenuStopId(undefined); setEditingStop(stop); }}>编辑安排</button><button role="menuitem" className="danger" onClick={() => { setMenuStopId(undefined); setPendingDelete(stop); }}>删除安排</button></div>}</div>; })}</div> : <div className="planner-empty"><MapPin /><strong>这一天还没有安排</strong><button onClick={() => setAdding(true)}>添加第一项安排</button></div>}<button className="planner-add-row" onClick={() => setAdding(true)}>＋&nbsp;&nbsp; 添加安排</button></div></section>
      <section className="planner-map"><header><div><button className={mapRange === "full" ? "active" : ""} onClick={() => setMapRange("full")}>全览</button><button className={mapRange === "day" ? "active" : ""} onClick={() => setMapRange("day")}>当天</button><button className={mapRange === "fit" ? "active" : ""} onClick={() => setMapRange("fit")}>适配范围</button></div><button aria-label="打开全屏地图" onClick={() => onChangeView("map")}>⛶</button></header><MapArtwork stops={stops} legs={legs} day={mapRange === "day" ? selectedDay : undefined} onSelectStop={setSelectedStop} /><footer><span><MapPin /> 已选择：{selected?.title || "暂无节点"}</span><button disabled={!selected} onClick={() => selected && setEditingStop(selected)}>查看详情 <ChevronRight /></button></footer></section><div className="planner-a11y-workflow"><ItineraryTimeline trip={trip} /></div></> : activeView === "map" ? <TripMapView trip={trip} /> : activeView === "expenses" ? <ExpenseList trip={trip} /> : <PackingList trip={trip} trips={trips} />}
    </main><footer className="planner-status"><ShieldCheck /> 数据仅保存在此设备</footer>
    {adding && <StopEditor date={selectedDay} tripStartDate={trip.startDate} tripEndDate={trip.endDate} tripTimezone={trip.timezone} existingStops={stops} onSave={async (draft) => { await saveStop(draft); setAdding(false); }} onClose={() => setAdding(false)} />}
    {editingStop && <StopEditor stop={editingStop} date={editingStop.date} tripStartDate={trip.startDate} tripEndDate={trip.endDate} tripTimezone={trip.timezone} existingStops={stops} onSave={async (draft) => { await saveStop(draft, editingStop); setEditingStop(undefined); }} onClose={() => setEditingStop(undefined)} />}
    {planningOpen && <div className="planner-management-overlay" role="dialog" aria-modal="true" aria-label="管理安排" onMouseDown={(event) => { if (event.target === event.currentTarget) setPlanningOpen(false); }}><section className="planner-management-panel"><button className="planner-management-close" onClick={() => setPlanningOpen(false)} aria-label="关闭管理安排">×</button><ItineraryTimeline trip={trip} /></section></div>}
    {searchOpen && <div className="planner-management-overlay" role="dialog" aria-modal="true" aria-label="搜索安排" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}><section className="planner-search-panel"><button className="planner-management-close" onClick={() => setSearchOpen(false)} aria-label="关闭搜索">×</button><h2>搜索安排</h2><input autoFocus value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="输入地点或安排名称" aria-label="搜索关键词" />{stops.filter((stop) => `${stop.title} ${stop.city ?? ""} ${stop.address ?? ""}`.toLocaleLowerCase().includes(searchText.toLocaleLowerCase())).slice(0, 8).map((stop) => <button key={stop.id} className="planner-search-result" onClick={() => { setSelectedDay(stop.date); setSelectedStop(stop.id); setSearchOpen(false); }}><strong>{stop.title}</strong><span>{dateLabel(stop.date)} · {stop.address || stop.city || "未填写地点"}</span></button>)}</section></div>}
    <ConfirmDialog open={Boolean(pendingDelete)} title="删除安排？" message={`将删除“${pendingDelete?.title ?? ""}”及其关联交通段。`} confirmLabel="删除安排" onClose={() => setPendingDelete(undefined)} onConfirm={() => { if (pendingDelete) void deleteStop(pendingDelete.id).then(() => setPendingDelete(undefined)); }} />
  </div>;
}
