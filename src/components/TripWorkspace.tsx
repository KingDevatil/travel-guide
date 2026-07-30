import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Backpack, BookOpen, CalendarDays, ChevronDown, ChevronRight, Copy, Download, LayoutDashboard, ListFilter, Map as MapIcon, MapPin, MoreHorizontal, MoreVertical, Plane, Receipt, Search, Settings, ShieldCheck, Train, UtensilsCrossed, Users } from "lucide-react";
import type { Stop, Trip } from "../domain/models";
import type { ViewMode } from "../types";
import { useItinerary } from "../hooks/useItinerary";
import { StopEditor } from "../features/itinerary/StopEditor";
import { ItineraryTimeline } from "../features/itinerary/ItineraryTimeline";
import type { TripMapProps } from "../features/map/TripMap";
import { ConfirmDialog } from "./ConfirmDialog";
import { tripDates } from "../domain/dates";
import { downloadItineraryHtml } from "../features/transfer/export-itinerary-html";
import { useDialogAccessibility } from "../hooks/useDialogAccessibility";
import { TripIcon } from "../features/trips/TripIcon";
import { getTripIconOption } from "../features/trips/trip-icon-options";
import { resolveTripIconName } from "../features/trips/infer-trip-icon";
import { TripOverview } from "../features/trips/TripOverview";

const TripMap = lazy(async () => ({ default: (await import("../features/map/TripMap")).TripMap }));
const TripMapView = lazy(async () => ({ default: (await import("../features/map/TripMapView")).TripMapView }));
const ExpenseList = lazy(async () => ({ default: (await import("../features/expenses/ExpenseList")).ExpenseList }));
const PackingList = lazy(async () => ({ default: (await import("../features/packing/PackingList")).PackingList }));
const EMPTY_STOPS: Stop[] = [];

const views: { value: ViewMode; label: string; icon: typeof CalendarDays }[] = [
  { value: "overview", label: "总览", icon: LayoutDashboard }, { value: "itinerary", label: "行程", icon: CalendarDays }, { value: "map", label: "地图", icon: MapIcon },
  { value: "expenses", label: "账单", icon: Receipt }, { value: "packing", label: "行李", icon: Backpack },
];
const weekday = (value: string) => ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][new Date(`${value}T00:00:00`).getDay()];
const dateLabel = (value: string) => `${Number(value.slice(5, 7))}月${Number(value.slice(8, 10))}日`;
const timeLabel = (value?: string) => value ? new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) : "待定";

function stopVisual(stop: Stop) {
  if (stop.kind === "flight") return { kind: "arrival", Icon: Plane };
  if (stop.kind === "food") return { kind: "food", Icon: UtensilsCrossed };
  if (stop.kind === "train") return { kind: "train", Icon: Train };
  const details = [stop.title, stop.content, stop.notes, stop.address].filter(Boolean).join(" ").toLocaleLowerCase();
  if (/机场|航班|转机|飞行|airport|flight/.test(details)) return { kind: "arrival", Icon: Plane };
  if (/餐|饭|咖啡|美食|restaurant|cafe|dining/.test(details)) return { kind: "food", Icon: UtensilsCrossed };
  if (/车站|列车|火车|高铁|地铁|train|metro|rail/.test(details)) return { kind: "train", Icon: Train };
  return { kind: "place", Icon: MapPin };
}

function MapArtwork({ stops, legs, day, selectedStopId, fitRequest, onSelectStop }: TripMapProps) {
  return <div className="planner-map-art" aria-label="可交互行程地图"><Suspense fallback={<p className="planner-loading">正在加载地图…</p>}><TripMap stops={stops} legs={legs} day={day} selectedStopId={selectedStopId} fitRequest={fitRequest} onSelectStop={onSelectStop} /></Suspense></div>;
}

export function TripWorkspace({ trip, trips, activeView, onChangeView, onSaveTrip, onOpenManager, onOpenParticipants, managerButtonRef }: { trip: Trip; trips: Trip[]; activeView: ViewMode; onChangeView: (view: ViewMode) => void; onSaveTrip: (trip: Trip) => Promise<void>; onOpenManager: () => void; onOpenParticipants: () => void; managerButtonRef: React.RefObject<HTMLButtonElement | null> }) {
  const { stops, legs, loading, saveStop, copyStop, moveToDate, deleteStop } = useItinerary(trip.id);
  const [selectedDay, setSelectedDay] = useState(trip.startDate);
  const [selectedStop, setSelectedStop] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [mapRange, setMapRange] = useState<"full" | "day">("full");
  const [mapFitRequest, setMapFitRequest] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [editingStop, setEditingStop] = useState<Stop>();
  const [menuStopId, setMenuStopId] = useState<string>();
  const [pendingDelete, setPendingDelete] = useState<Stop>();
  const planningPanelRef = useDialogAccessibility<HTMLElement>(planningOpen, () => setPlanningOpen(false));
  const searchPanelRef = useDialogAccessibility<HTMLElement>(searchOpen, () => setSearchOpen(false));
  useEffect(() => {
    setSelectedDay(trip.startDate);
    setSelectedStop(undefined);
    setAdding(false);
    setPlanningOpen(false);
    setMapRange("full");
    setMapFitRequest((value) => value + 1);
    setSearchOpen(false);
    setSearchText("");
    setEditingStop(undefined);
    setMenuStopId(undefined);
    setPendingDelete(undefined);
  }, [trip.id, trip.startDate]);
  const days = useMemo(() => tripDates(trip.startDate, trip.endDate), [trip.endDate, trip.startDate]);
  const { stopsByDate, stopById } = useMemo(() => {
    const byDate = new Map<string, Stop[]>();
    const byId = new Map<string, Stop>();
    for (const stop of stops) {
      byId.set(stop.id, stop);
      if (stop.unscheduled) continue;
      const grouped = byDate.get(stop.date);
      if (grouped) grouped.push(stop);
      else byDate.set(stop.date, [stop]);
    }
    for (const grouped of byDate.values()) grouped.sort((a, b) => a.sortOrder - b.sortOrder);
    return { stopsByDate: byDate, stopById: byId };
  }, [stops]);
  const currentStops = stopsByDate.get(selectedDay) ?? EMPTY_STOPS;
  const selected = (selectedStop ? stopById.get(selectedStop) : undefined) ?? currentStops[0];
  const searchResults = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase();
    if (!query) return stops.slice(0, 8);
    return stops.filter((stop) => `${stop.title} ${stop.city ?? ""} ${stop.address ?? ""}`.toLocaleLowerCase().includes(query)).slice(0, 8);
  }, [searchText, stops]);
  const currentCity = currentStops[0]?.city || "待安排";
  const tripIcon = resolveTripIconName(trip);
  return <div className="planner-shell">
    <header className="planner-topbar"><div className="planner-brand"><BookOpen /><span>旅程册</span></div><div className="planner-divider" /><button className="planner-trip" onClick={onOpenManager}><span className="planner-trip__icon" role="img" aria-label={`行程图标：${getTripIconOption(tripIcon).label}`}><TripIcon name={tripIcon} /></span><span className="planner-trip__copy"><strong>{trip.title}</strong><small>{dateLabel(trip.startDate)}—{dateLabel(trip.endDate)}</small></span><ChevronDown /></button><nav aria-label="主要功能">{views.map(({ value, label, icon: Icon }) => <button key={value} className={activeView === value ? "active" : ""} aria-current={activeView === value ? "page" : undefined} onClick={() => onChangeView(value)}><Icon /><span>{label}</span></button>)}</nav><div className="planner-tools"><button aria-label="管理 AA 费用成员" onClick={onOpenParticipants}><Users /></button><button ref={managerButtonRef} onClick={onOpenManager} aria-label="管理行程"><Settings /></button><button aria-label="管理安排" onClick={() => setPlanningOpen(true)}><MoreHorizontal /></button></div></header>
    <main className="planner-main">
      {activeView === "overview" ? <TripOverview trip={trip} stops={stops} legs={legs} onChangeView={onChangeView} onSelectDay={(date) => { setSelectedDay(date); setSelectedStop(undefined); }} /> : activeView === "itinerary" ? <><aside className="planner-days"><button className="planner-add" onClick={() => setAdding(true)}>添加安排 <span>＋</span></button><div className="planner-day-list">{days.map((date, index) => { const isActive = date === selectedDay; const items = stopsByDate.get(date) ?? EMPTY_STOPS; return <button key={date} className={isActive ? "selected" : ""} aria-pressed={isActive} onClick={() => { setSelectedDay(date); setSelectedStop(undefined); }}><i className="day-track">{index < days.length - 1 && <em />}</i><span><strong>{dateLabel(date)}</strong><b>{weekday(date)}</b><small aria-hidden="true">{items[0]?.city || "待安排"}</small><small>{items.length} 项安排</small></span><ChevronRight /></button>; })}</div><div className="planner-date-jump"><label>跳转日期<input type="date" min={trip.startDate} max={trip.endDate} value={selectedDay} onChange={(event) => { setSelectedDay(event.target.value); setSelectedStop(undefined); }} /></label></div><div className="planner-rail-tools"><button aria-label="回到旅行第一天" onClick={() => { setSelectedDay(trip.startDate); setSelectedStop(undefined); }}><CalendarDays /></button><button aria-label="管理安排" onClick={() => setPlanningOpen(true)}><ListFilter /></button><button aria-label="搜索安排" onClick={() => { setSearchText(""); setSearchOpen(true); }}><Search /></button></div></aside>
      <section className="planner-timeline"><header><div><h1>{dateLabel(selectedDay)} {weekday(selectedDay)} · {currentCity}</h1><p>{currentStops.length} 项安排</p></div><div><button onClick={() => void downloadItineraryHtml(trip)}><Download /> 导出行程单</button><button onClick={() => setPlanningOpen(true)}><ListFilter /> 管理安排</button></div></header><div className="planner-timeline-scroll">{loading ? <p className="planner-loading">正在读取行程…</p> : currentStops.length ? <div className="planner-items">{currentStops.map((stop, index) => { const { kind, Icon } = stopVisual(stop); const menuOpen = menuStopId === stop.id; return <div key={stop.id} className={`planner-item ${selected?.id === stop.id ? "selected" : ""}`}><time>{timeLabel(stop.startsAt)}</time><span className={`item-icon ${kind}`}><Icon /></span>{index < currentStops.length - 1 && <i className="item-line" />}<button className="planner-item-main" onClick={() => setSelectedStop(stop.id)} aria-label={`选中 ${stop.title}`}><article><h2>{stop.title}</h2><p>{stop.address || [stop.city, stop.country].filter(Boolean).join(" · ") || "待补充地点"}</p><p className="item-detail">{stop.content || stop.notes || (kind === "train" ? "交通安排" : "查看安排详情")}</p><ChevronRight /></article></button><button className="planner-item-menu-button" aria-label={`${stop.title} 更多操作`} aria-expanded={menuOpen} onClick={() => setMenuStopId(menuOpen ? undefined : stop.id)}><MoreVertical /></button>{menuOpen && <div className="planner-item-menu" role="menu"><button role="menuitem" onClick={() => { setMenuStopId(undefined); setEditingStop(stop); }}>编辑安排</button><button role="menuitem" onClick={() => { setMenuStopId(undefined); void copyStop(stop.id); }}><Copy aria-hidden="true" />复制安排</button><label>移动日期<select value={stop.date} onChange={(event) => { setMenuStopId(undefined); void moveToDate(stop.id, event.target.value); }}>{days.map((date) => <option key={date} value={date}>{date}</option>)}</select></label><button role="menuitem" className="danger" onClick={() => { setMenuStopId(undefined); setPendingDelete(stop); }}>删除安排</button></div>}</div>; })}</div> : <div className="planner-empty"><MapPin /><strong>这一天还没有安排</strong><button onClick={() => setAdding(true)}>添加第一项安排</button></div>}<button className="planner-add-row" onClick={() => setAdding(true)}>＋&nbsp;&nbsp; 添加安排</button></div></section>
      <section className="planner-map"><header><div><button className={mapRange === "full" ? "active" : ""} aria-pressed={mapRange === "full"} onClick={() => setMapRange("full")}>全览</button><button className={mapRange === "day" ? "active" : ""} aria-pressed={mapRange === "day"} onClick={() => setMapRange("day")}>当天</button><button onClick={() => setMapFitRequest((value) => value + 1)}>适配范围</button></div><button aria-label="打开全屏地图" onClick={() => onChangeView("map")}>⛶</button></header><MapArtwork stops={stops.filter((stop) => !stop.unscheduled)} legs={legs} day={mapRange === "day" ? selectedDay : undefined} selectedStopId={selectedStop} fitRequest={mapFitRequest} onSelectStop={(id) => { setSelectedStop(id); const stop = stopById.get(id); if (stop) setSelectedDay(stop.date); }} /><footer><span><MapPin /> 已选择：{selected?.title || "暂无安排"}</span><button disabled={!selected} onClick={() => selected && setEditingStop(selected)}>查看详情 <ChevronRight /></button></footer></section></> : <Suspense fallback={<p className="planner-loading planner-loading--panel">正在加载功能…</p>}>{activeView === "map" ? <TripMapView trip={trip} /> : activeView === "expenses" ? <ExpenseList trip={trip} onUpdateTrip={onSaveTrip} /> : <PackingList trip={trip} trips={trips} />}</Suspense>}
    </main><footer className="planner-status"><ShieldCheck /> 数据仅保存在此设备</footer>
    {adding && <StopEditor date={selectedDay} tripStartDate={trip.startDate} tripEndDate={trip.endDate} tripTimezone={trip.timezone} existingStops={stops} onSave={async (draft) => { await saveStop(draft); setAdding(false); }} onClose={() => setAdding(false)} />}
    {editingStop && <StopEditor stop={editingStop} date={editingStop.date} tripStartDate={trip.startDate} tripEndDate={trip.endDate} tripTimezone={trip.timezone} existingStops={stops} onSave={async (draft) => { await saveStop(draft, editingStop); setEditingStop(undefined); }} onClose={() => setEditingStop(undefined)} />}
    {planningOpen && <div className="planner-management-overlay" role="dialog" aria-modal="true" aria-label="管理安排" onMouseDown={(event) => { if (event.target === event.currentTarget) setPlanningOpen(false); }}><section ref={planningPanelRef} className="planner-management-panel"><button className="planner-management-close" onClick={() => setPlanningOpen(false)} aria-label="关闭管理安排">×</button><ItineraryTimeline trip={trip} /></section></div>}
    {searchOpen && <div className="planner-management-overlay" role="dialog" aria-modal="true" aria-label="搜索安排" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}><section ref={searchPanelRef} className="planner-search-panel"><button className="planner-management-close" onClick={() => setSearchOpen(false)} aria-label="关闭搜索">×</button><h2>搜索安排</h2><input autoFocus value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="输入地点或安排名称" aria-label="搜索关键词" />{searchResults.map((stop) => <button key={stop.id} className="planner-search-result" onClick={() => { setSelectedDay(stop.date); setSelectedStop(stop.id); setSearchOpen(false); }}><strong>{stop.title}</strong><span>{dateLabel(stop.date)} · {stop.address || stop.city || "未填写地点"}</span></button>)}</section></div>}
    <ConfirmDialog open={Boolean(pendingDelete)} title="删除安排？" message={`将删除“${pendingDelete?.title ?? ""}”及其关联交通段。`} confirmLabel="删除安排" onClose={() => setPendingDelete(undefined)} onConfirm={() => { if (pendingDelete) void deleteStop(pendingDelete.id).then(() => setPendingDelete(undefined)); }} />
  </div>;
}
