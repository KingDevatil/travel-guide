import { ArrowLeft, ExternalLink, MapPin, Navigation, Ticket, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Leg, Stop, Trip } from "../../domain/models";
import { tripDates } from "../../domain/dates";
import { formatScheduledTimeRange, formatTimezoneLabel } from "../../domain/timezones";

function safeLink(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function OnTripMode({ trip, stops, legs, onClose }: { trip: Trip; stops: Stop[]; legs: Leg[]; onClose: () => void }) {
  const dates = useMemo(() => tripDates(trip.startDate, trip.endDate), [trip.endDate, trip.startDate]);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(dates.includes(today) ? today : trip.startDate);
  const dayStops = stops.filter((stop) => !stop.unscheduled && stop.date === date).sort((a, b) => a.sortOrder - b.sortOrder);
  const now = Date.now();
  const nextStop = dayStops.find((stop) => !stop.endsAt || new Date(stop.endsAt).getTime() >= now) ?? dayStops[0];
  const legByStart = new Map(legs.map((leg) => [leg.fromStopId, leg]));

  return <section className="on-trip-mode" aria-label="出行模式">
    <header>
      <button onClick={onClose}><ArrowLeft aria-hidden="true" />返回总览</button>
      <div><span>出行模式</span><strong>{date} · {formatTimezoneLabel(trip.timezone, date)}</strong></div>
      <button className="icon-action" onClick={onClose} aria-label="关闭出行模式"><X /></button>
    </header>
    <nav aria-label="选择出行日期">{dates.map((item) => <button key={item} className={item === date ? "active" : ""} aria-pressed={item === date} onClick={() => setDate(item)}>{Number(item.slice(8))}<small>{item.slice(5, 7)}月</small></button>)}</nav>
    {nextStop ? <article className="on-trip-next">
      <span>接下来</span>
      <h2>{nextStop.title}</h2>
      <p>{nextStop.startsAt ? formatScheduledTimeRange(nextStop.startsAt, nextStop.endsAt) : "时间待定"} · {nextStop.address || nextStop.city || "地点待补充"}</p>
      <div className="on-trip-actions">
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${nextStop.latitude},${nextStop.longitude}`} target="_blank" rel="noreferrer"><Navigation aria-hidden="true" />导航前往</a>
        {safeLink(nextStop.documentUrl) && <a href={safeLink(nextStop.documentUrl)} target="_blank" rel="noreferrer"><Ticket aria-hidden="true" />打开票据</a>}
      </div>
      {(nextStop.bookingReference || nextStop.contactInfo) && <dl>{nextStop.bookingReference && <div><dt>预订号</dt><dd>{nextStop.bookingReference}</dd></div>}{nextStop.contactInfo && <div><dt>联系信息</dt><dd>{nextStop.contactInfo}</dd></div>}</dl>}
    </article> : <div className="on-trip-empty"><MapPin /><strong>这一天还没有安排</strong><p>返回行程页添加地点后，会在这里形成适合路上查看的清单。</p></div>}
    {dayStops.length > 0 && <ol className="on-trip-list">{dayStops.map((stop, index) => {
      const leg = legByStart.get(stop.id);
      return <li key={stop.id} className={stop.id === nextStop?.id ? "current" : ""}>
        <time>{stop.startsAt?.slice(11, 16) || "待定"}</time>
        <div><strong>{stop.title}</strong><span>{stop.address || stop.city}</span>{stop.bookingReference && <small>预订号：{stop.bookingReference}</small>}</div>
        <a aria-label={`导航到 ${stop.title}`} href={`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`} target="_blank" rel="noreferrer"><ExternalLink /></a>
        {leg && index < dayStops.length - 1 && <p className="on-trip-transfer">下一段：{leg.mode}{leg.serviceNumber ? ` · ${leg.serviceNumber}` : ""}</p>}
      </li>;
    })}</ol>}
  </section>;
}
