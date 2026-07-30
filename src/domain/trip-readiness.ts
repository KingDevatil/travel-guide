import type { Expense, Leg, PackingItem, Stop, Trip } from "./models";
import { analyzeItinerary } from "./itinerary-analysis";
import { tripDates } from "./dates";

export interface TripReadiness {
  score: number;
  totalDays: number;
  plannedDays: number;
  unplannedDays: number;
  missingConnections: number;
  conflictCount: number;
  requiredPackingItems: number;
  packedRequiredItems: number;
  plannedExpenseMinor: number;
  paidExpenseMinor: number;
  budgetRemainingMinor?: number;
  backupNeedsRefresh: boolean;
}

export function calculateTripReadiness(
  trip: Trip,
  stops: Stop[],
  legs: Leg[],
  expenses: Expense[],
  packingItems: PackingItem[],
  lastBackupAt?: string,
): TripReadiness {
  const dates = tripDates(trip.startDate, trip.endDate);
  const plannedDates = new Set(stops.filter((stop) => !stop.unscheduled).map((stop) => stop.date));
  const issues = analyzeItinerary(stops, legs);
  const currentCurrencyExpenses = expenses.filter(
    (expense) => expense.currency === trip.defaultCurrency && expense.status !== "cancelled",
  );
  const plannedExpenseMinor = currentCurrencyExpenses.reduce((total, expense) => total + expense.amountMinor, 0);
  const paidExpenseMinor = currentCurrencyExpenses
    .filter((expense) => expense.status === "paid")
    .reduce((total, expense) => total + expense.amountMinor, 0);
  const requiredItems = packingItems.filter((item) => item.required);
  const packedRequiredItems = requiredItems.filter((item) => item.packed).length;
  const plannedDays = dates.filter((date) => plannedDates.has(date)).length;
  const missingConnections = issues.filter((issue) => issue.type === "missing-transport").length;
  const conflictCount = issues.filter((issue) => issue.type !== "missing-transport").length;
  const backupNeedsRefresh = !lastBackupAt || lastBackupAt < trip.updatedAt;

  const itineraryScore = dates.length ? plannedDays / dates.length : 0;
  const connectionScore = issues.length ? Math.max(0, 1 - (missingConnections + conflictCount) / Math.max(1, stops.length)) : 1;
  const packingScore = requiredItems.length ? packedRequiredItems / requiredItems.length : 1;
  const backupScore = backupNeedsRefresh ? 0 : 1;
  const score = Math.round((itineraryScore * 50) + (connectionScore * 25) + (packingScore * 15) + (backupScore * 10));

  return {
    score,
    totalDays: dates.length,
    plannedDays,
    unplannedDays: Math.max(0, dates.length - plannedDays),
    missingConnections,
    conflictCount,
    requiredPackingItems: requiredItems.length,
    packedRequiredItems,
    plannedExpenseMinor,
    paidExpenseMinor,
    budgetRemainingMinor: trip.budgetMinor === undefined ? undefined : trip.budgetMinor - plannedExpenseMinor,
    backupNeedsRefresh,
  };
}

