import { useCallback, useEffect, useState } from "react";
import type { Expense, Leg, PackingItem, Stop, Trip } from "../domain/models";
import { getExpenses, getLegs, getPackingItems, getStops } from "../db/trip-repository";
import { formatMoney } from "../domain/money";
import { tripDates } from "../domain/dates";

export function PrintTrip({ trip }: { trip: Trip }) {
  const [stops, setStops] = useState<Stop[]>([]); const [legs, setLegs] = useState<Leg[]>([]); const [expenses, setExpenses] = useState<Expense[]>([]); const [packing, setPacking] = useState<PackingItem[]>([]);
  const load = useCallback(async () => { const [s, l, e, p] = await Promise.all([getStops(trip.id), getLegs(trip.id), getExpenses(trip.id), getPackingItems(trip.id)]); setStops(s); setLegs(l); setExpenses(e); setPacking(p); }, [trip.id]);
  useEffect(() => { void load(); }, [load]);
  return <article className="print-trip"><h1>{trip.title}</h1><p>{trip.startDate} 至 {trip.endDate} · {trip.timezone}</p>{tripDates(trip.startDate, trip.endDate).map((date) => <section key={date}><h2>{date}</h2>{stops.filter((stop) => stop.date === date).map((stop) => <div key={stop.id}><strong>{stop.startsAt?.slice(11, 16) ?? ""} {stop.title}</strong><p>{stop.city} {stop.content} {stop.notes}</p></div>)}</section>)}{legs.length > 0 && <section><h2>交通</h2>{legs.map((leg) => <p key={leg.id}>{stops.find((stop) => stop.id === leg.fromStopId)?.title} → {stops.find((stop) => stop.id === leg.toStopId)?.title} · {leg.mode} {leg.serviceNumber}</p>)}</section>}<section><h2>预算摘要</h2>{expenses.filter((expense) => expense.status !== "cancelled").map((expense) => <p key={expense.id}>{expense.title}：{formatMoney(expense.amountMinor, expense.currency)}（{expense.status}）</p>)}</section><section><h2>行李清单</h2>{packing.map((item) => <p key={item.id}>□ {item.title} × {item.quantity}{item.required ? "（必需）" : ""}</p>)}</section></article>;
}
