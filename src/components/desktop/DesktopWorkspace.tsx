import "../../styles/desktop.css";
import type { WorkspaceProps } from "../../types";
import { TopBar } from "./TopBar";
import { DayRail } from "./DayRail";
import { Timeline } from "./Timeline";
import { MapCanvas } from "./MapCanvas";
import { Map, Receipt, Backpack, ShieldCheck } from "lucide-react";

export function DesktopWorkspace(props: WorkspaceProps) {
  const {
    activeView,
    days,
    items,
    selectedDayId,
    selectedScheduleId,
    onChangeView,
    onSelectDay,
    onSelectSchedule,
    onOpenAdd,
  } = props;

  return (
    <div className="desktop-workspace">
      <TopBar activeView={activeView} onChangeView={onChangeView} />

      {activeView === "itinerary" && (
        <div className="desktop-main">
          <DayRail
            days={days}
            selectedDayId={selectedDayId}
            onSelectDay={onSelectDay}
            onOpenAdd={onOpenAdd}
          />
          <Timeline
            days={days}
            items={items}
            selectedDayId={selectedDayId}
            selectedScheduleId={selectedScheduleId}
            onSelectSchedule={onSelectSchedule}
            onOpenAdd={onOpenAdd}
          />
          <MapCanvas
            items={items}
            selectedDayId={selectedDayId}
            selectedScheduleId={selectedScheduleId}
          />
        </div>
      )}

      {activeView === "map" && (
        <div className="desktop-main">
          <div className="desktop-map" style={{ borderLeft: "none", flex: "1 1 100%" }}>
            <div className="desktop-map-controls" role="toolbar" aria-label="地图视图控制">
              <button className="desktop-map-ctrl-btn desktop-map-ctrl-btn--active">全览</button>
              <button className="desktop-map-ctrl-btn">当天</button>
              <button className="desktop-map-ctrl-btn">适配范围</button>
            </div>
            <div className="desktop-placeholder">
              <Map aria-hidden="true" />
              <span className="desktop-placeholder-title">全屏地图视图</span>
              <span className="desktop-placeholder-desc">地图功能开发中，请切换至行程模式查看</span>
            </div>
          </div>
        </div>
      )}

      {activeView === "expenses" && (
        <div className="desktop-main">
          <div className="desktop-placeholder" style={{ flex: 1 }}>
            <Receipt aria-hidden="true" />
            <span className="desktop-placeholder-title">账单管理</span>
            <span className="desktop-placeholder-desc">旅行开支记录功能即将上线</span>
          </div>
        </div>
      )}

      {activeView === "packing" && (
        <div className="desktop-main">
          <div className="desktop-placeholder" style={{ flex: 1 }}>
            <Backpack aria-hidden="true" />
            <span className="desktop-placeholder-title">行李清单</span>
            <span className="desktop-placeholder-desc">出行物品核对功能即将上线</span>
          </div>
        </div>
      )}

      <div className="desktop-status-bar">
        <ShieldCheck aria-hidden="true" />
        <span>数据仅保存在此设备</span>
      </div>
    </div>
  );
}
