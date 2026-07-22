import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { ScheduleItem } from "../../types";

type MapRange = "full" | "day" | "fit";

interface MapCanvasProps {
  items: ScheduleItem[];
  selectedDayId: string;
  selectedScheduleId: string;
}

const MAP_W = 640;
const MAP_H = 520;

const REGIONS = [
  { x: 10, y: 10, w: 130, h: 80, fill: "#dbeafe", label: "濑户内海" },
  { x: 150, y: 8, w: 160, h: 90, fill: "#dcfce7", label: "大阪市区" },
  { x: 330, y: 5, w: 120, h: 70, fill: "#e0e7ff", label: "新大阪" },
  { x: 470, y: 85, w: 150, h: 80, fill: "#fef3c7", label: "山崎" },
  { x: 340, y: 180, w: 160, h: 110, fill: "#fce7f3", label: "京都市区" },
  { x: 180, y: 150, w: 130, h: 90, fill: "#e8f5e9", label: "奈良" },
  { x: 30, y: 180, w: 110, h: 80, fill: "#f3e5f5", label: "和歌山" },
  { x: 260, y: 300, w: 180, h: 110, fill: "#e1f5fe", label: "琵琶湖" },
  { x: 480, y: 190, w: 140, h: 95, fill: "#fff7ed", label: "大津" },
  { x: 20, y: 310, w: 120, h: 80, fill: "#ecfdf5", label: "堺市" },
  { x: 480, y: 310, w: 140, h: 90, fill: "#fdf2f8", label: "宇治" },
  { x: 20, y: 420, w: 200, h: 85, fill: "#f0fdf4", label: "关西国际空港" },
  { x: 250, y: 430, w: 200, h: 75, fill: "#eff6ff", label: "伊势平原" },
  { x: 470, y: 420, w: 155, h: 85, fill: "#fefce8", label: "奈良南部" },
];

const MARKERS = [
  { cx: 80, cy: 55, r: 8, label: "关西机场", type: "arrival" },
  { cx: 390, cy: 40, r: 8, label: "新大阪站", type: "train" },
  { cx: 420, cy: 235, r: 8, label: "京都站", type: "train" },
];

export function MapCanvas({ items, selectedScheduleId }: MapCanvasProps) {
  const [range, setRange] = useState<MapRange>("full");

  const selectedItem = items.find((i) => i.id === selectedScheduleId);

  return (
    <section className="desktop-map" aria-label="行程地图">
      <div className="desktop-map-controls" role="toolbar" aria-label="地图视图控制">
        <button
          className={`desktop-map-ctrl-btn${range === "full" ? " desktop-map-ctrl-btn--active" : ""}`}
          onClick={() => setRange("full")}
        >
          全览
        </button>
        <button
          className={`desktop-map-ctrl-btn${range === "day" ? " desktop-map-ctrl-btn--active" : ""}`}
          onClick={() => setRange("day")}
        >
          当天
        </button>
        <button
          className={`desktop-map-ctrl-btn${range === "fit" ? " desktop-map-ctrl-btn--active" : ""}`}
          onClick={() => setRange("fit")}
        >
          适配范围
        </button>
      </div>

      <div className="desktop-map-display">
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="关西地区行程地图"
        >
          {/* Background regions */}
          {REGIONS.map((r, i) => (
            <g key={`region-${i}`}>
              <rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                rx={10}
                fill={r.fill}
                stroke="#cbd5e1"
                strokeWidth="1"
              />
              <text
                x={r.x + r.w / 2}
                y={r.y + r.h / 2 + 4}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
                fontFamily="Inter, Noto Sans SC, sans-serif"
              >
                {r.label}
              </text>
            </g>
          ))}

          {/* Route lines: dark blue dashed with white backing */}
          <line
            x1={80} y1={55} x2={390} y2={40}
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1={80} y1={55} x2={390} y2={40}
            stroke="#12335f"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="8 4"
          />
          <line
            x1={390} y1={40} x2={420} y2={235}
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1={390} y1={40} x2={420} y2={235}
            stroke="#12335f"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="8 4"
          />

          {/* Airport → Osaka rail connector */}
          <line
            x1={80} y1={55} x2={150} y2={48}
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1={80} y1={55} x2={150} y2={48}
            stroke="#2f8a49"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Markers */}
          {MARKERS.map((m, i) => {
            const fillColor = m.type === "arrival" ? "#ff5a36" : "#12335f";
            return (
              <g key={`marker-${i}`}>
                <circle cx={m.cx} cy={m.cy} r={m.r + 3} fill="#ffffff" />
                <circle cx={m.cx} cy={m.cy} r={m.r} fill={fillColor} />
                <circle cx={m.cx} cy={m.cy} r={m.r - 3} fill="#ffffff" />
                <text
                  x={m.cx}
                  y={m.cy - m.r - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#0b1739"
                  fontWeight="600"
                  fontFamily="Inter, Noto Sans SC, sans-serif"
                >
                  {m.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="desktop-map-selection">
        <span className="desktop-map-selection-label">
          {selectedItem ? `已选择：${selectedItem.title}` : "点击行程节点查看详情"}
        </span>
        {selectedItem && (
          <button className="desktop-map-selection-detail">
            <span>查看详情</span>
            <ChevronRight aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
