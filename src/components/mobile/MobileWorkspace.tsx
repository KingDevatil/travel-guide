import { useMemo } from "react";
import {
  BookOpen,
  Search,
  Menu,
  ChevronDown,
  Plus,
  MapPin,
  UtensilsCrossed,
  Train,
  MoreHorizontal,
  Map,
  Receipt,
  Luggage,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import "../../styles/mobile.css";
import type { WorkspaceProps, ScheduleItem, ViewMode } from "../../types";

/* ============================================================
   Helper: Kind badge config
   ============================================================ */
const KIND_CONFIG: Record<
  ScheduleItem["kind"],
  { label: string; icon: typeof MapPin; kindClass: string; circleClass: string }
> = {
  arrival: { label: "抵达", icon: MapPin, kindClass: "mobile-node-kind--arrival", circleClass: "mobile-node-icon-circle--arrival" },
  food: { label: "餐饮", icon: UtensilsCrossed, kindClass: "mobile-node-kind--food", circleClass: "mobile-node-icon-circle--food" },
  train: { label: "铁路", icon: Train, kindClass: "mobile-node-kind--train", circleClass: "mobile-node-icon-circle--train" },
  other: { label: "其他", icon: MapPin, kindClass: "mobile-node-kind--other", circleClass: "mobile-node-icon-circle--other" },
};

/* ============================================================
   Nav config
   ============================================================ */
const NAV_ITEMS: { view: ViewMode; label: string; icon: typeof Map }[] = [
  { view: "itinerary", label: "行程", icon: Calendar },
  { view: "map", label: "地图", icon: Map },
  { view: "expenses", label: "账单", icon: Receipt },
  { view: "packing", label: "行李", icon: Luggage },
];

/* ============================================================
   Placeholder view
   ============================================================ */
function PlaceholderView({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Map;
  title: string;
  desc: string;
}) {
  return (
    <div className="mobile-placeholder">
      <Icon />
      <div className="mobile-placeholder-title">{title}</div>
      <div className="mobile-placeholder-desc">{desc}</div>
    </div>
  );
}
/* ============================================================
   MobileWorkspace
   ============================================================ */
export function MobileWorkspace({
  activeView,
  days,
  items,
  selectedDayId,
  selectedScheduleId,
  onChangeView,
  onSelectDay,
  onSelectSchedule,
  onOpenAdd,
}: WorkspaceProps) {
  const selectedDayItems = useMemo(
    () => items.filter((item) => item.dayId === selectedDayId),
    [items, selectedDayId]
  );

  const selectedDay = useMemo(
    () => days.find((d) => d.id === selectedDayId),
    [days, selectedDayId]
  );

  /* ---- handlers ---- */
  const handleDayKeyDown = (e: React.KeyboardEvent, dayId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectDay(dayId);
    }
  };

  /* ---- Render the selected view ---- */
  const renderContent = () => {
    switch (activeView) {
      case "map":
        return (
          <PlaceholderView
            icon={Map}
            title="地图视图"
            desc="查看行程路线与地点标注"
          />
        );
      case "expenses":
        return (
          <PlaceholderView
            icon={Receipt}
            title="账单视图"
            desc="管理旅行开销与预算"
          />
        );
      case "packing":
        return (
          <PlaceholderView
            icon={Luggage}
            title="行李清单"
            desc="整理出行必备物品"
          />
        );
      case "itinerary":
      default:
        return (
          <div className="mobile-content">
            {selectedDay && (
              <div className="mobile-timeline-day">
                <div className="mobile-timeline-day-header">
                  <span className="mobile-day-label">
                    {selectedDay.date} · {selectedDay.city}
                  </span>
                  <span className="mobile-day-city">
                    {selectedDay.count} 项安排
                  </span>
                </div>
                {selectedDayItems.length > 0 ? (
                  <ul className="mobile-timeline-list">
                    {selectedDayItems.map((item) => {
                      const kindCfg = KIND_CONFIG[item.kind] ?? KIND_CONFIG.other;
                      const KindIcon = kindCfg.icon;
                      const isActive = item.id === selectedScheduleId;
                      return (
                        <li
                          key={item.id}
                          className={"mobile-timeline-node" + (isActive ? " mobile-timeline-node--active" : "")}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelectSchedule(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onSelectSchedule(item.id);
                            }
                          }}
                          aria-current={isActive ? "true" : undefined}
                        >
                          {/* Time column */}
                          <div className="mobile-node-time-col">
                            <span className="mobile-node-time">{item.time}</span>
                          </div>

                          {/* Track / dot column */}
                          <div className="mobile-node-track-col">
                            <span className={"mobile-node-icon-circle " + kindCfg.circleClass}>
                              <KindIcon />
                            </span>
                            <div className="mobile-node-track-line" />
                          </div>

                          {/* Content column */}
                          <div className="mobile-node-content-col">
                            <h4 className="mobile-node-title">{item.title}</h4>
                            <button
                              type="button"
                              className="mobile-node-more-btn"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="更多操作"
                            >
                              <MoreHorizontal />
                            </button>
                            {item.location && (
                              <div className="mobile-node-location">
                                <MapPin size={14} />
                                <span>{item.location}</span>
                              </div>
                            )}
                            <span className={"mobile-node-kind " + kindCfg.kindClass}>
                              {kindCfg.label}
                            </span>
                            {item.notes && (
                              <p className="mobile-node-notes">{item.notes}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="mobile-placeholder" style={{ minHeight: 120 }}>
                    <Calendar />
                    <div className="mobile-placeholder-desc">当天暂无安排</div>
                  </div>
                )}

                {/* Add dashed area at bottom */}
                <div className="mobile-add-area">
                  <button
                    type="button"
                    className="mobile-add-dashed-btn"
                    onClick={onOpenAdd}
                  >
                    <Plus />
                    <span>添加安排</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="mobile-workspace">
      {/* ---- Top bar ---- */}
      <header className="mobile-topbar">
        <div className="mobile-brand">
          <BookOpen className="mobile-brand-icon" />
          <span>旅程册</span>
        </div>
        <div className="mobile-topbar-actions">
          <button type="button" className="mobile-topbar-btn" aria-label="搜索">
            <Search />
          </button>
          <button type="button" className="mobile-topbar-btn" aria-label="菜单">
            <Menu />
          </button>
        </div>
      </header>

      {/* ---- Trip header ---- */}
      <div className="mobile-trip-header">
        <div
          className="mobile-trip-title"
          role="button"
          tabIndex={0}
          aria-label="选择行程"
        >
          <span>日本关西 6 日</span>
          <ChevronDown />
        </div>
        <button type="button" className="mobile-add-btn" onClick={onOpenAdd}>
          <Plus />
          <span>添加安排</span>
        </button>
      </div>

      {/* ---- Date track ---- */}
      <nav className="mobile-date-track" aria-label="日期选择">
        {days.map((day) => {
          const isActive = day.id === selectedDayId;
          return (
            <div
              key={day.id}
              className={"mobile-date-chip" + (isActive ? " mobile-date-chip--active" : "")}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              aria-label={day.date + " " + day.weekday}
              onClick={() => onSelectDay(day.id)}
              onKeyDown={(e) => handleDayKeyDown(e, day.id)}
            >
              <span className="mobile-date-chip-date">
                {day.date.match(/月(\d+)日/)?.[1] ?? day.date}
              </span>
              <span className="mobile-date-chip-weekday">{day.weekday}</span>
            </div>
          );
        })}
      </nav>

      {/* ---- Main content ---- */}
      {renderContent()}

      {/* ---- FAB (only on itinerary view) ---- */}
      {activeView === "itinerary" && (
        <button
          type="button"
          className="mobile-fab"
          onClick={onOpenAdd}
          aria-label="添加安排"
        >
          <Plus />
        </button>
      )}

      {/* ---- Status bar ---- */}
      <div className="mobile-status-bar">
        <ShieldCheck />
        <span>数据仅保存在此设备</span>
      </div>

      {/* ---- Bottom nav ---- */}
      <nav className="mobile-bottom-nav" aria-label="主导航">
        {NAV_ITEMS.map(({ view, label, icon: NavIcon }) => {
          const isActive = view === activeView;
          return (
            <button
              key={view}
              type="button"
              className={"mobile-nav-item" + (isActive ? " mobile-nav-item--active" : "")}
              onClick={() => onChangeView(view)}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <NavIcon />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

