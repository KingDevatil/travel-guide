import { AlertTriangle, Backpack, CalendarDays, CheckCircle2, ChevronRight, Map, Navigation, Receipt, ShieldCheck, Ticket } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Expense, Leg, PackingItem, Stop, Trip } from "../../domain/models";
import type { ViewMode } from "../../types";
import { getExpenses, getPackingItems } from "../../db/trip-repository";
import { subscribeTripChanges } from "../../db/change-events";
import { calculateTripReadiness } from "../../domain/trip-readiness";
import { analyzeItinerary } from "../../domain/itinerary-analysis";
import { formatMoney } from "../../domain/money";
import { OnTripMode } from "./OnTripMode";

export function TripOverview({
  trip,
  stops,
  legs,
  onChangeView,
  onSelectDay,
}: {
  trip: Trip;
  stops: Stop[];
  legs: Leg[];
  onChangeView: (view: ViewMode) => void;
  onSelectDay: (date: string) => void;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [onTrip, setOnTrip] = useState(false);
  const load = useCallback(async () => {
    const [nextExpenses, nextPacking] = await Promise.all([getExpenses(trip.id), getPackingItems(trip.id)]);
    setExpenses(nextExpenses);
    setPackingItems(nextPacking);
  }, [trip.id]);
  useEffect(() => {
    setOnTrip(false);
    void load();
    return subscribeTripChanges((changedTripId) => {
      if (changedTripId === trip.id) void load();
    });
  }, [load, trip.id]);

  const backupAt = localStorage.getItem(`travel-backup-${trip.id}`) ?? undefined;
  const readiness = useMemo(
    () => calculateTripReadiness(trip, stops, legs, expenses, packingItems, backupAt),
    [backupAt, expenses, legs, packingItems, stops, trip],
  );
  const issues = useMemo(() => analyzeItinerary(stops, legs), [legs, stops]);
  const today = new Date().toISOString().slice(0, 10);
  const focusDate = today >= trip.startDate && today <= trip.endDate ? today : trip.startDate;
  const focusStops = stops.filter((stop) => !stop.unscheduled && stop.date === focusDate).sort((a, b) => a.sortOrder - b.sortOrder);
  const bookingCount = [...stops, ...legs].filter((item) => item.bookingReference || item.documentUrl).length;

  if (onTrip) return <OnTripMode trip={trip} stops={stops} legs={legs} onClose={() => setOnTrip(false)} />;

  return <section className="trip-overview" aria-label="旅行总览">
    <header className="overview-hero">
      <div><span>{trip.destination || "目的地待补充"}</span><h1>{trip.title}</h1><p>{trip.startDate} 至 {trip.endDate} · {readiness.totalDays} 天</p></div>
      <div className="readiness-score" aria-label={`行程准备度 ${readiness.score}%`}><strong>{readiness.score}%</strong><span>准备度</span></div>
      <button onClick={() => setOnTrip(true)}><Navigation aria-hidden="true" />进入出行模式</button>
    </header>
    <div className="overview-metrics">
      <button onClick={() => onChangeView("itinerary")}><CalendarDays /><span>已规划天数</span><strong>{readiness.plannedDays} / {readiness.totalDays}</strong><small>{readiness.unplannedDays ? `还有 ${readiness.unplannedDays} 天待安排` : "每天都有安排"}</small><ChevronRight /></button>
      <button onClick={() => onChangeView("expenses")}><Receipt /><span>默认币种支出</span><strong>{formatMoney(readiness.plannedExpenseMinor, trip.defaultCurrency)}</strong><small>{readiness.budgetRemainingMinor === undefined ? "尚未设置总预算" : `剩余 ${formatMoney(readiness.budgetRemainingMinor, trip.defaultCurrency)}`}</small><ChevronRight /></button>
      <button onClick={() => onChangeView("packing")}><Backpack /><span>必带物品</span><strong>{readiness.packedRequiredItems} / {readiness.requiredPackingItems}</strong><small>{readiness.requiredPackingItems ? "已收拾 / 必带" : "尚未标记必带物品"}</small><ChevronRight /></button>
      <button onClick={() => onChangeView("map")}><Map /><span>交通衔接</span><strong>{readiness.missingConnections ? `${readiness.missingConnections} 段待补` : "已检查"}</strong><small>{readiness.conflictCount ? `${readiness.conflictCount} 个时间风险` : "未发现明显冲突"}</small><ChevronRight /></button>
    </div>
    <div className="overview-grid">
      <section className="overview-card">
        <header><div><span>重点日期</span><h2>{focusDate === today ? "今天的安排" : "第一天安排"}</h2></div><button onClick={() => { onSelectDay(focusDate); onChangeView("itinerary"); }}>查看日程</button></header>
        {focusStops.length ? <ol>{focusStops.slice(0, 4).map((stop) => <li key={stop.id}><time>{stop.startsAt?.slice(11, 16) || "待定"}</time><div><strong>{stop.title}</strong><span>{stop.address || stop.city || "地点待补充"}</span></div>{(stop.bookingReference || stop.documentUrl) && <Ticket aria-label="含预订资料" />}</li>)}</ol> : <div className="overview-empty"><CalendarDays /><strong>这一天还没有安排</strong><button onClick={() => { onSelectDay(focusDate); onChangeView("itinerary"); }}>去添加</button></div>}
      </section>
      <section className="overview-card overview-checks">
        <header><div><span>出发前检查</span><h2>还需要处理</h2></div></header>
        <ul>
          <li className={readiness.unplannedDays ? "warning" : "done"}>{readiness.unplannedDays ? <AlertTriangle /> : <CheckCircle2 />}<span>{readiness.unplannedDays ? `${readiness.unplannedDays} 天还没有安排` : "每天已有安排"}</span></li>
          <li className={issues.length ? "warning" : "done"}>{issues.length ? <AlertTriangle /> : <CheckCircle2 />}<span>{issues.length ? `${issues.length} 个交通或时间提示` : "交通与时间未见明显问题"}</span></li>
          <li className={readiness.backupNeedsRefresh ? "warning" : "done"}>{readiness.backupNeedsRefresh ? <ShieldCheck /> : <CheckCircle2 />}<span>{readiness.backupNeedsRefresh ? "行程更新后尚未导出备份" : "已有当前版本备份"}</span></li>
          <li className={bookingCount ? "done" : ""}><Ticket /><span>{bookingCount ? `已保存 ${bookingCount} 项预订资料` : "未保存预订号或电子票链接"}</span></li>
        </ul>
      </section>
    </div>
  </section>;
}

