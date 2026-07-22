import { Backpack, BookOpen, Map, Receipt, Settings, ShieldCheck } from "lucide-react";
import type { Trip } from "../domain/models";
import type { ViewMode } from "../types";
import { ExpenseList } from "../features/expenses/ExpenseList";
import { ItineraryTimeline } from "../features/itinerary/ItineraryTimeline";
import { TripMapView } from "../features/map/TripMapView";
import { PackingList } from "../features/packing/PackingList";

const views: { value: ViewMode; label: string; icon: typeof BookOpen }[] = [{ value: "itinerary", label: "行程", icon: BookOpen }, { value: "map", label: "地图", icon: Map }, { value: "expenses", label: "账单", icon: Receipt }, { value: "packing", label: "行李", icon: Backpack }];
const formatDate = (value: string) => value.slice(5).replace("-", "/");

export function TripWorkspace({ trip, trips, activeView, onChangeView, onOpenManager, managerButtonRef }: { trip: Trip; trips: Trip[]; activeView: ViewMode; onChangeView: (view: ViewMode) => void; onOpenManager: () => void; managerButtonRef: React.RefObject<HTMLButtonElement | null> }) {
  return <div className="trip-workspace"><header className="app-topbar"><div className="app-brand"><BookOpen aria-hidden="true" /><span>旅程册</span></div><div className="active-trip"><strong>{trip.title}</strong><span>{formatDate(trip.startDate)}–{formatDate(trip.endDate)}</span></div><nav className="primary-nav" aria-label="主导航">{views.map(({ value, label, icon: Icon }) => <button key={value} onClick={() => onChangeView(value)} aria-current={activeView === value ? "page" : undefined}><Icon aria-hidden="true" /><span>{label}</span></button>)}</nav><button ref={managerButtonRef} className="manager-button" onClick={onOpenManager}><Settings aria-hidden="true" /><span>管理行程</span></button></header>
    <main className="workspace-content">{activeView === "itinerary" && <section className="feature-panel itinerary-view"><header className="feature-heading"><div><h2>{trip.title}</h2><p>{trip.startDate} 至 {trip.endDate} · {trip.timezone}</p></div></header><ItineraryTimeline trip={trip} /></section>}{activeView === "map" && <TripMapView trip={trip} />}{activeView === "expenses" && <ExpenseList trip={trip} />}{activeView === "packing" && <PackingList trip={trip} trips={trips} />}</main>
    <footer className="app-status"><ShieldCheck aria-hidden="true" />数据仅保存在此设备，请定期导出备份</footer>
  </div>;
}
