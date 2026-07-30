import type { TripIconName } from "../../domain/models";
import { getTripIconOption } from "./trip-icon-options";

export function TripIcon({ name, className }: { name?: TripIconName; className?: string }) {
  const option = getTripIconOption(name);
  return <option.Icon className={className} aria-hidden="true" />;
}
