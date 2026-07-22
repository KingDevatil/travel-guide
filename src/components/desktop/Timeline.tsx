import { Plane, UtensilsCrossed, Train, GripVertical, Plus, CloudSun } from "lucide-react";
import type { Day, ScheduleItem, ScheduleKind } from "../../types";

interface TimelineProps {
  days: Day[];
  items: ScheduleItem[];
  selectedDayId: string;
  selectedScheduleId: string;
  onSelectSchedule: (scheduleId: string) => void;
  onOpenAdd: () => void;
}

const KIND_CONFIG: Record<ScheduleKind, { label: string; className: string; Icon: typeof Plane }> = {
  arrival: { label: "抵达", className: "desktop-node-kind-badge--arrival", Icon: Plane },
  food: { label: "餐饮", className: "desktop-node-kind-badge--food", Icon: UtensilsCrossed },
  train: { label: "铁路", className: "desktop-node-kind-badge--train", Icon: Train },
  other: { label: "其他", className: "desktop-node-kind-badge--other", Icon: GripVertical },
};

function getSelectedDay(days: Day[], dayId: string): Day | undefined {
  return days.find((d) => d.id === dayId);
}

function getDayItems(items: ScheduleItem[], dayId: string): ScheduleItem[] {
  return items.filter((item) => item.dayId === dayId);
}

export function Timeline({
  days,
  items,
  selectedDayId,
  selectedScheduleId,
  onSelectSchedule,
  onOpenAdd,
}: TimelineProps) {
  const currentDay = getSelectedDay(days, selectedDayId);
  const dayItems = getDayItems(items, selectedDayId);

  const dayHeader = currentDay
    ? `${currentDay.date} ${currentDay.weekday} · ${currentDay.city}`
    : "";

  return (
    <section className="desktop-timeline" aria-label="安排时间线">
      <div className="desktop-timeline-header">
        <div className="desktop-timeline-day-label">
          <span className="desktop-timeline-date">{dayHeader}</span>
          <span className="desktop-timeline-weather">
            <CloudSun aria-hidden="true" />
            <span>晴 18°–24°</span>
          </span>
        </div>
        <div className="desktop-timeline-actions">
          <button className="desktop-timeline-action-btn">
            <GripVertical aria-hidden="true" />
            <span>调整顺序</span>
          </button>
        </div>
      </div>

      <div className="desktop-timeline-scroll">
        {dayItems.length === 0 ? (
          <div className="desktop-placeholder" style={{ padding: "60px 0" }}>
            <Plus aria-hidden="true" style={{ width: 40, height: 40 }} />
            <span className="desktop-placeholder-title">暂无安排</span>
            <span className="desktop-placeholder-desc">点击左侧"添加安排"开始规划</span>
          </div>
        ) : (
          <div className="desktop-timeline-list" role="listbox" aria-label="日程列表">
            {dayItems.map((item, index) => {
              const isSelected = item.id === selectedScheduleId;
              const config = KIND_CONFIG[item.kind] ?? KIND_CONFIG.other;
              const Icon = config.Icon;

              return (
                <button
                  key={item.id}
                  className={`desktop-timeline-node${isSelected ? " desktop-timeline-node--selected" : ""}`}
                  onClick={() => onSelectSchedule(item.id)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="desktop-node-time-col">
                    <span className="desktop-node-time">{item.time}</span>
                  </div>
                  <div className="desktop-node-track-col">
                    <div className={`desktop-node-kind-badge ${config.className}`}>
                      <Icon aria-hidden="true" />
                    </div>
                    {index < dayItems.length - 1 && <div className="desktop-node-line" />}
                  </div>
                  <div className="desktop-node-content-col">
                    <div className="desktop-node-card">
                      <div className="desktop-node-title">{item.title}</div>
                      <div className="desktop-node-location">{item.location}</div>
                      <div className="desktop-node-detail">{item.detail}</div>
                      {item.notes && <div className="desktop-node-notes">{item.notes}</div>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="desktop-timeline-add-area">
          <button className="desktop-timeline-add-btn" onClick={onOpenAdd}>
            <Plus aria-hidden="true" />
            <span>添加安排</span>
          </button>
        </div>
      </div>
    </section>
  );
}
