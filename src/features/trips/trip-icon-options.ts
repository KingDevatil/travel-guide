import {
  BriefcaseBusiness,
  Camera,
  CarFront,
  Landmark,
  MapPinned,
  Mountain,
  Plane,
  Ship,
  TrainFront,
  Umbrella,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { TripIconName } from "../../domain/models";

export interface TripIconOption {
  value: TripIconName;
  label: string;
  Icon: LucideIcon;
}

export const DEFAULT_TRIP_ICON: TripIconName = "map";

export const TRIP_ICON_OPTIONS: readonly TripIconOption[] = [
  { value: "map", label: "城市漫游", Icon: MapPinned },
  { value: "flight", label: "航空", Icon: Plane },
  { value: "train", label: "铁路", Icon: TrainFront },
  { value: "road", label: "自驾", Icon: CarFront },
  { value: "cruise", label: "邮轮", Icon: Ship },
  { value: "nature", label: "山野", Icon: Mountain },
  { value: "beach", label: "海岛", Icon: Umbrella },
  { value: "culture", label: "人文", Icon: Landmark },
  { value: "food", label: "美食", Icon: UtensilsCrossed },
  { value: "camera", label: "摄影", Icon: Camera },
  { value: "business", label: "商务", Icon: BriefcaseBusiness },
] as const;

const optionByName = new Map(TRIP_ICON_OPTIONS.map((option) => [option.value, option]));

export function getTripIconOption(name?: TripIconName) {
  return optionByName.get(name ?? DEFAULT_TRIP_ICON) ?? optionByName.get(DEFAULT_TRIP_ICON)!;
}
