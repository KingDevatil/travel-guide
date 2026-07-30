import { useCallback, useEffect, useState } from "react";
import type { Expense, Leg, PackingItem, Stop, Trip } from "../domain/models";
import { getExpenses, getLegs, getPackingItems, getStops } from "../db/trip-repository";
import { formatMoney } from "../domain/money";
import { tripDates } from "../domain/dates";
import { formatScheduledTimeRange, formatTimezoneLabel } from "../domain/timezones";
import { subscribeTripChanges } from "../db/change-events";

export function PrintTrip({ trip }: { trip: Trip }) {
  const [stops, setStops] = useState<Stop[]>([]); const [legs, setLegs] = useState<Leg[]>([]); const [expenses, setExpenses] = useState<Expense[]>([]); const [packing, setPacking] = useState<PackingItem[]>([]);
  const load = useCallback(async () => { const [s, l, e, p] = await Promise.all([getStops(trip.id), getLegs(trip.id), getExpenses(trip.id), getPackingItems(trip.id)]); setStops(s); setLegs(l); setExpenses(e); setPacking(p); }, [trip.id]);
  useEffect(() => {
    void load();
    const onBeforePrint = () => { void load(); };
    window.addEventListener("beforeprint", onBeforePrint);
    const unsubscribe = subscribeTripChanges((changedTripId) => {
      if (changedTripId === trip.id) void load();
    });
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      unsubscribe();
    };
  }, [load, trip.id]);
  return <article className="print-trip"><h1>{trip.title}</h1><p>{trip.destination ? `${trip.destination} · ` : ""}{trip.startDate} 至 {trip.endDate} · {trip.timezone}</p>{tripDates(trip.startDate, trip.endDate).map((date) => <section key={date}><h2>{date}</h2>{stops.filter((stop) => stop.date === date && !stop.unscheduled).map((stop) => <div key={stop.id}><strong>{stop.startsAt ? formatScheduledTimeRange(stop.startsAt, stop.endsAt) : ""} {stop.title}</strong><p>{stop.city} {stop.timezone ? `· 当地时间 ${formatTimezoneLabel(stop.timezone, stop.date)}` : `· 行程时区 ${trip.timezone}`} {stop.content} {stop.notes}</p>{stop.bookingReference && <p>预订号：{stop.bookingReference}</p>}{stop.contactInfo && <p>联系信息：{stop.contactInfo}</p>}{stop.documentUrl && <p>资料：{stop.documentUrl}</p>}</div>)}</section>)}{stops.some((stop) => stop.unscheduled) && <section><h2>想去清单</h2>{stops.filter((stop) => stop.unscheduled).map((stop) => <p key={stop.id}>{stop.title} · {stop.address || stop.city}</p>)}</section>}{legs.length > 0 && <section><h2>交通</h2>{legs.map((leg) => <div key={leg.id}><p>{stops.find((stop) => stop.id === leg.fromStopId)?.title} → {stops.find((stop) => stop.id === leg.toStopId)?.title} · {leg.mode} {leg.serviceNumber}</p>{leg.bookingReference && <p>预订号：{leg.bookingReference}</p>}{leg.contactInfo && <p>联系信息：{leg.contactInfo}</p>}{leg.documentUrl && <p>资料：{leg.documentUrl}</p>}</div>)}</section>}<section><h2>预算摘要</h2>{trip.budgetMinor !== undefined && <p>总预算：{formatMoney(trip.budgetMinor, trip.defaultCurrency)}</p>}{expenses.filter((expense) => expense.status !== "cancelled").map((expense) => <p key={expense.id}>{expense.title}：{formatMoney(expense.amountMinor, expense.currency)}（{expense.status}）</p>)}</section><section><h2>行李清单</h2>{packing.map((item) => <p key={item.id}>□ {item.title} × {item.quantity}{item.required ? "（必需）" : ""}</p>)}</section></article>;
}
