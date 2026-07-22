import type { Day, ScheduleItem } from "../types.ts";

export const defaultDays: Day[] = [
  { id: "day-1", date: "10月12日", weekday: "周一", city: "大阪", count: 3 },
  { id: "day-2", date: "10月13日", weekday: "周二", city: "京都", count: 0 },
  { id: "day-3", date: "10月14日", weekday: "周三", city: "京都", count: 0 },
];

export const defaultItems: ScheduleItem[] = [
  {
    id: "item-1",
    dayId: "day-1",
    time: "09:40",
    title: "抵达大阪",
    location: "关西国际机场",
    kind: "arrival",
    detail: "乘坐CA123航班从上海浦东出发",
    notes: "提前到达入境大厅，准备海关申报",
  },
  {
    id: "item-2",
    dayId: "day-1",
    time: "18:30",
    title: "道顿堀晚餐",
    location: "大阪市中央区道顿堀",
    kind: "food",
    detail: "品尝章鱼烧、大阪烧等地道美食",
    notes: "推荐店铺：くれおーる（Creole）道顿堀店",
  },
  {
    id: "item-3",
    dayId: "day-1",
    time: "10:15",
    title: "前往京都",
    location: "新大阪站",
    kind: "train",
    detail: "乘坐JR京都线新快速，约28分钟",
    notes: "建议购买ICOCA卡方便出行",
  },
];
