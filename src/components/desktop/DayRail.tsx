import { Plus, Download, Printer, Share2 } from "lucide-react";
import type { Day } from "../../types";

interface DayRailProps {
  days: Day[];
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
  onOpenAdd: () => void;
}

export function DayRail({ days, selectedDayId, onSelectDay, onOpenAdd }: DayRailProps) {
  return (
    <aside className="desktop-day-rail" aria-label="日期导航">
      <button className="desktop-day-rail-add" onClick={onOpenAdd}>
        <Plus aria-hidden="true" />
        <span>添加安排</span>
      </button>

      <div className="desktop-day-rail-list" role="listbox" aria-label="旅行日期">
        {days.map((day, index) => {
          const isActive = day.id === selectedDayId;
          const isLast = index === days.length - 1;
          return (
            <button
              key={day.id}
              className={`desktop-day-item${isActive ? " desktop-day-item--active" : ""}`}
              onClick={() => onSelectDay(day.id)}
              role="option"
              aria-selected={isActive}
            >
              <div className="desktop-day-track">
                <div className={`desktop-day-dot${isActive ? " desktop-day-dot--active" : ""}`} />
                {!isLast && <div className="desktop-day-line" />}
              </div>
              <div className="desktop-day-content">
                <div className="desktop-day-date">{day.date}</div>
                <div className="desktop-day-weekday">{day.weekday}</div>
                <div className="desktop-day-city">{day.city}</div>
                <div className="desktop-day-count">{day.count} 项安排</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="desktop-day-rail-footer">
        <button className="desktop-day-rail-footer-btn" aria-label="下载">
          <Download aria-hidden="true" />
        </button>
        <button className="desktop-day-rail-footer-btn" aria-label="打印">
          <Printer aria-hidden="true" />
        </button>
        <button className="desktop-day-rail-footer-btn" aria-label="分享">
          <Share2 aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
