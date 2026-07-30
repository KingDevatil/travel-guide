export type TripChangeListener = (tripId: string) => void;

const listeners = new Set<TripChangeListener>();

export function notifyTripChanged(tripId: string): void {
  for (const listener of listeners) {
    listener(tripId);
  }
}

export function subscribeTripChanges(listener: TripChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
