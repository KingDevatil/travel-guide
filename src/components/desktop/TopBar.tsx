import { BookOpen, Map, Receipt, Backpack, Users, Settings, MoreHorizontal } from "lucide-react";
import type { ViewMode } from "../../types";

interface TopBarProps {
  activeView: ViewMode;
  onChangeView: (view: ViewMode) => void;
}

const MODES: { key: ViewMode; label: string; Icon: typeof BookOpen }[] = [
  { key: "itinerary", label: "行程", Icon: BookOpen },
  { key: "map", label: "地图", Icon: Map },
  { key: "expenses", label: "账单", Icon: Receipt },
  { key: "packing", label: "行李", Icon: Backpack },
];

export function TopBar({ activeView, onChangeView }: TopBarProps) {
  return (
    <header className="desktop-topbar" role="banner">
      <div className="desktop-topbar-left">
        <div className="desktop-brand">
          <BookOpen aria-hidden="true" />
          <span>旅程册</span>
        </div>
        <div className="desktop-trip-divider" aria-hidden="true" />
        <div className="desktop-trip-info">
          <span className="desktop-trip-name">日本关西 6 日</span>
          <span>10月12日–10月17日</span>
        </div>
      </div>

      <nav className="desktop-mode-tabs" aria-label="视图模式">
        {MODES.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`desktop-mode-tab${activeView === key ? " desktop-mode-tab--active" : ""}`}
            onClick={() => onChangeView(key)}
            aria-pressed={activeView === key}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="desktop-topbar-right">
        <button className="desktop-topbar-btn" aria-label="成员">
          <Users aria-hidden="true" />
        </button>
        <button className="desktop-topbar-btn" aria-label="设置">
          <Settings aria-hidden="true" />
        </button>
        <button className="desktop-topbar-btn" aria-label="更多">
          <MoreHorizontal aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
