import type { Leg, Stop, TransportMode } from "./models";

const EARTH_RADIUS_KM = 6371;

export interface AdjacentStopPair {
  date: string;
  from: Stop;
  to: Stop;
  leg?: Leg;
  distanceKm: number;
  estimatedMinutes: number;
}

export interface ItineraryIssue {
  id: string;
  type: "overlap" | "missing-transport" | "tight-transfer";
  date: string;
  fromStopId: string;
  toStopId: string;
  message: string;
  distanceKm?: number;
  estimatedMinutes?: number;
}

function radians(value: number): number {
  return value * Math.PI / 180;
}

export function haversineDistanceKm(
  from: Pick<Stop, "latitude" | "longitude">,
  to: Pick<Stop, "latitude" | "longitude">,
): number {
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const halfLatitude = Math.sin(latitudeDelta / 2);
  const halfLongitude = Math.sin(longitudeDelta / 2);
  const value = halfLatitude ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * halfLongitude ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function estimateTravelMinutes(distanceKm: number, mode?: TransportMode): number {
  const safeDistance = Math.max(0, distanceKm);
  const speedByMode: Partial<Record<TransportMode, number>> = {
    walk: 4.5,
    bike: 14,
    bus: 20,
    metro: 28,
    taxi: 30,
    drive: 35,
    train: 80,
    highSpeedRail: 180,
    flight: 550,
    ferry: 25,
  };
  const speed = mode ? speedByMode[mode] : safeDistance <= 1.5 ? 4.5 : safeDistance <= 8 ? 22 : 40;
  const buffer = mode === "flight" ? 120 : mode === "train" || mode === "highSpeedRail" ? 30 : safeDistance > 1.5 ? 10 : 3;
  return Math.max(5, Math.ceil((safeDistance / (speed ?? 30)) * 60 + buffer));
}

function sortStops(stops: Stop[]): Stop[] {
  return [...stops].sort((left, right) => {
    const dateOrder = left.date.localeCompare(right.date);
    if (dateOrder) return dateOrder;
    return left.sortOrder - right.sortOrder;
  });
}

export function adjacentStopPairs(stops: Stop[], legs: Leg[]): AdjacentStopPair[] {
  const scheduled = sortStops(stops.filter((stop) => !stop.unscheduled));
  const legByPair = new Map(legs.map((leg) => [`${leg.fromStopId}:${leg.toStopId}`, leg]));
  const pairs: AdjacentStopPair[] = [];

  for (let index = 1; index < scheduled.length; index += 1) {
    const from = scheduled[index - 1];
    const to = scheduled[index];
    if (from.date !== to.date) continue;
    const leg = legByPair.get(`${from.id}:${to.id}`);
    const distanceKm = haversineDistanceKm(from, to);
    pairs.push({
      date: from.date,
      from,
      to,
      leg,
      distanceKm,
      estimatedMinutes: estimateTravelMinutes(distanceKm, leg?.mode),
    });
  }
  return pairs;
}

function minutesBetween(from?: string, to?: string): number | undefined {
  if (!from || !to) return undefined;
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return undefined;
  return Math.round((end - start) / 60_000);
}

export function analyzeItinerary(stops: Stop[], legs: Leg[]): ItineraryIssue[] {
  const issues: ItineraryIssue[] = [];

  for (const pair of adjacentStopPairs(stops, legs)) {
    const gapMinutes = minutesBetween(pair.from.endsAt, pair.to.startsAt);
    if (gapMinutes !== undefined && gapMinutes < 0) {
      issues.push({
        id: `overlap:${pair.from.id}:${pair.to.id}`,
        type: "overlap",
        date: pair.date,
        fromStopId: pair.from.id,
        toStopId: pair.to.id,
        message: `“${pair.from.title}”与“${pair.to.title}”时间重叠 ${Math.abs(gapMinutes)} 分钟`,
      });
    } else if (gapMinutes !== undefined && gapMinutes < pair.estimatedMinutes) {
      issues.push({
        id: `tight-transfer:${pair.from.id}:${pair.to.id}`,
        type: "tight-transfer",
        date: pair.date,
        fromStopId: pair.from.id,
        toStopId: pair.to.id,
        message: `前往“${pair.to.title}”预计需要 ${pair.estimatedMinutes} 分钟，仅预留 ${gapMinutes} 分钟`,
        distanceKm: pair.distanceKm,
        estimatedMinutes: pair.estimatedMinutes,
      });
    }

    if (!pair.leg && pair.distanceKm >= 0.8) {
      issues.push({
        id: `missing-transport:${pair.from.id}:${pair.to.id}`,
        type: "missing-transport",
        date: pair.date,
        fromStopId: pair.from.id,
        toStopId: pair.to.id,
        message: `“${pair.from.title}”到“${pair.to.title}”相距约 ${pair.distanceKm.toFixed(1)} 公里，尚未添加交通`,
        distanceKm: pair.distanceKm,
        estimatedMinutes: pair.estimatedMinutes,
      });
    }
  }

  return issues;
}

