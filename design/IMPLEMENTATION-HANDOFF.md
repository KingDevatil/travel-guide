# 旅程册第一阶段 · 子代理实现交接

本文件由主代理根据桌面与移动概念图拆解。执行子代理只需读取本文，不读取 PNG。

## 1. 全局尺寸与断点

- 页面占满视口，背景严格为 `#FFFFFF`，正文不得出现横向页面滚动。
- 桌面断点：`min-width: 1024px`。
- 桌面顶栏：76px；底部设备状态栏：56px；中间工作区高度为剩余视口。
- 桌面主区列宽：日期轨 `clamp(250px, 20vw, 310px)`；时间线 `minmax(460px, 40vw)`；地图 `minmax(420px, 1fr)`。
- 移动端：360–1023px；内容单列，最大内容宽度 720px 并居中。
- 移动顶栏 72px；行程标题/主操作区约 82px；日期横轨约 104px；设备状态条 42px；底部导航 76px，并处理安全区 `env(safe-area-inset-bottom)`。
- 移动正文必须为底部状态条、底栏和 FAB 预留至少 150px 空间。

## 2. 颜色与排版令牌

- `--color-bg: #ffffff`
- `--color-text: #0b1739`
- `--color-muted: #647087`
- `--color-border: #e2e5ea`
- `--color-soft: #f7f8fa`
- `--color-primary: #ff5a36`
- `--color-primary-soft: #fff1ec`
- `--color-success: #2f8a49`
- `--color-success-soft: #edf7e9`
- `--color-map-line: #12335f`
- 字体：`Inter, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`。
- 页面品牌 28–32px / 700；行程标题 24–28px / 700；日标题 22–26px / 700；节点标题 18–21px / 650；正文 14–16px；控件 14px / 600。
- 图标统一 20–24px，圆角描边，视觉线宽约 1.75px；不得使用 Emoji 作为正式图标。
- 全局焦点环：2px `#ff5a36`，外偏移 2px。

## 3. 桌面画面拆解

### 顶栏

- 左到右：品牌“旅程册”及书本标志；当前行程“日本关西 6 日”与日期；居中的四项一级入口“行程 / 地图 / 账单 / 行李”；右侧只保留成员、设置、更多。
- 当前入口“行程”使用珊瑚橙文字/图标，底部 3px 指示线；其他入口深海军蓝。
- 顶栏只有下边框，无阴影、无渐变。

### 左侧日期轨

- 顶部为占满内边距的珊瑚橙“添加安排”按钮，48px 高。
- 三个日期行以垂直细线串联，节点圆点 10px；当前日期有 `#fff1ec` 浅色横向背景、左侧 3px 橙色轨道、橙色实心点。
- 每行显示日期、星期、城市、安排数量；高度约 126px，不使用独立浮动卡片。
- 底部可放三个无文字工具图标，但不能抢占视觉焦点。

### 中间时间线

- 顶部 92px：左侧“10月12日 周一 · 大阪”和天气；右侧“调整顺序”及更多。
- 内容时间列约 96px；轨道/图标列约 48px；节点内容占余宽。
- 09:40 抵达大阪、18:30 道顿堀晚餐、10:15 前往京都。
- 节点以 1px 暖灰边框的开放列表行呈现，最小高度 140px；当前节点用橙色边框和左侧橙色细线，不使用厚重阴影。
- 类型圆标：抵达为橙色、餐饮为海军蓝、铁路为绿色；圆标 40px。
- 底部有 72px 高虚线“添加安排”区域。

### 右侧地图视觉画布

- 不是实际地图 SDK。使用浅蓝/浅绿/暖灰的抽象街区背景、深蓝路线、白色描边和三个标记点，清楚表现大阪机场→新大阪→京都。
- 顶部 64px 控制条：“全览 / 当天 / 适配范围”，当前“全览”深色描边。
- 底部 56px 选择状态：“已选择：抵达大阪”与“查看详情”。
- 地图不得出现“真实地图已加载”等误导文案。

## 4. 移动画面拆解

- 顶栏左侧品牌“旅程册”，右侧仅搜索与菜单；无桌面一级导航。
- 第二行左侧“日本关西 6 日”及下拉箭头，右侧珊瑚橙“添加安排”按钮。
- 日期横轨显示 12/周一、13/周二、14/周三；当前日期橙色边框和浅橙底；每个触控区至少 72×72px。
- 时间线无外层卡片。时间列约 64px，轨道图标列 52px，正文列占余宽；节点间用浅灰分隔线。
- 节点显示标题、地点、类型/交通、备注、更多按钮；移动端隐藏桌面地图。
- 右下 FAB 64px，位于设备状态条上方，不遮挡第三个节点。
- 设备状态条文字“数据仅保存在此设备”，白底、上边框、绿色图标。
- 底部四项导航固定：“行程 / 地图 / 账单 / 行李”；当前项橙色图标/文字与顶部 3px 指示线。
- 点击地图/账单/行李后，在同一主内容区域显示各自的轻量占位视图和明确返回/切换能力；底栏状态同步。

## 5. 交互与数据契约

- 共享类型：`ViewMode = "itinerary" | "map" | "expenses" | "packing"`；`Day`；`ScheduleItem`。
- 根组件持有 `activeView`、`selectedDayId`、`selectedScheduleId`、`scheduleItems` 和添加对话框开关。
- 日期切换更新选中日期；节点点击更新选中节点与地图底部状态；一级/底部导航更新同一个 `activeView`。
- 添加安排表单至少包含时间、标题、地点、类型、备注；提交后追加到当前日期并选中新节点；支持 Escape 关闭和基础字段校验。
- 组件通过 props/callback 接收状态，不在多个组件各自复制同一状态。

## 6. 文件所有权建议

- 基础代理：项目根配置、`src/App.tsx`、`src/main.tsx`、`src/types.ts`、`src/data/*`、`src/index.css`、测试配置与根级测试。
- 桌面代理：`src/components/desktop/*`、`src/styles/desktop.css`。
- 移动交互代理：`src/components/mobile/*`、`src/components/dialogs/*`、`src/styles/mobile.css`。

所有代理不得修改不属于自己的文件；缺少接口时先按本文契约实现并在汇报中说明。

## 7. 并行组件接口（必须一致）

基础代理在 `src/types.ts` 导出：

```ts
export type ViewMode = "itinerary" | "map" | "expenses" | "packing";
export type ScheduleKind = "arrival" | "food" | "train" | "other";
export interface Day { id: string; date: string; weekday: string; city: string; count: number; }
export interface ScheduleItem { id: string; dayId: string; time: string; title: string; location: string; kind: ScheduleKind; detail: string; notes: string; }
export type NewScheduleItem = Omit<ScheduleItem, "id">;
export interface WorkspaceProps {
  activeView: ViewMode;
  days: Day[];
  items: ScheduleItem[];
  selectedDayId: string;
  selectedScheduleId: string;
  onChangeView: (view: ViewMode) => void;
  onSelectDay: (dayId: string) => void;
  onSelectSchedule: (scheduleId: string) => void;
  onOpenAdd: () => void;
}
```

- 桌面代理必须从 `src/components/desktop/DesktopWorkspace.tsx` 导出命名组件 `DesktopWorkspace(props: WorkspaceProps)`。
- 移动代理必须从 `src/components/mobile/MobileWorkspace.tsx` 导出命名组件 `MobileWorkspace(props: WorkspaceProps)`。
- 移动代理必须从 `src/components/dialogs/AddScheduleDialog.tsx` 导出命名组件，props 为：

```ts
{ open: boolean; dayId: string; onClose: () => void; onAdd: (item: NewScheduleItem) => void }
```

- `App.tsx` 同时渲染桌面和移动组件，用 CSS 媒体查询决定显示，不在 JS 中读取视口宽度。
