export type ViewMode = "itinerary" | "map" | "expenses" | "packing";

export type ScheduleKind = "arrival" | "food" | "train" | "other";

export interface Day {
  id: string;
  date: string;
  weekday: string;
  city: string;
  count: number;
}

export interface ScheduleItem {
  id: string;
  dayId: string;
  time: string;
  title: string;
  location: string;
  kind: ScheduleKind;
  detail: string;
  notes: string;
}

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
