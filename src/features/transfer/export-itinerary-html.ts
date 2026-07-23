import type { PackingItem, Stop, Trip } from "../../domain/models";
import { tripDates } from "../../domain/dates";
import { getPackingItems, getStops } from "../../db/trip-repository";

const escapeHtml = (value: string | undefined) => (value ?? "").replace(/[&<>\"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
})[character] ?? character);

const dateLabel = (date: string) => new Intl.DateTimeFormat("zh-CN", {
  month: "long", day: "numeric", weekday: "long", timeZone: "UTC",
}).format(new Date(`${date}T00:00:00Z`));

const timeLabel = (time?: string) => time ? new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit", minute: "2-digit", hour12: false,
}).format(new Date(time)) : "时间待定";

function renderStop(stop: Stop) {
  const location = stop.address || [stop.city, stop.country].filter(Boolean).join(" · ");
  return `<li class="stop">
    <time>${escapeHtml(timeLabel(stop.startsAt))}${stop.endsAt ? ` — ${escapeHtml(timeLabel(stop.endsAt))}` : ""}</time>
    <div><h3>${escapeHtml(stop.title)}</h3>${location ? `<p class="location">${escapeHtml(location)}</p>` : ""}${stop.content ? `<p>${escapeHtml(stop.content)}</p>` : ""}${stop.notes ? `<p class="notes">备注：${escapeHtml(stop.notes)}</p>` : ""}</div>
  </li>`;
}

export function createItineraryHtml(trip: Trip, stops: Stop[], packingItems: PackingItem[]) {
  const days = tripDates(trip.startDate, trip.endDate).map((date) => {
    const dayStops = stops.filter((stop) => stop.date === date).sort((a, b) => a.sortOrder - b.sortOrder);
    return `<section class="day"><h2>${escapeHtml(dateLabel(date))}</h2>${dayStops.length ? `<ol>${dayStops.map(renderStop).join("")}</ol>` : "<p class=\"empty\">当天暂无安排</p>"}</section>`;
  }).join("");
  const categories = new Map<string, PackingItem[]>();
  packingItems.sort((a, b) => a.sortOrder - b.sortOrder).forEach((item) => {
    const group = categories.get(item.category) ?? [];
    group.push(item);
    categories.set(item.category, group);
  });
  const packing = categories.size ? Array.from(categories, ([category, items]) => `<section class="packing-group"><h3>${escapeHtml(category || "其他")}</h3><ul>${items.map((item) => `<li>${escapeHtml(item.title)}${item.quantity > 1 ? ` × ${item.quantity}` : ""}${item.required ? " <span>必带</span>" : ""}${item.notes ? `<small>${escapeHtml(item.notes)}</small>` : ""}</li>`).join("")}</ul></section>`).join("") : "<p class=\"empty\">暂无行李清单</p>";

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(trip.title)}｜行程单</title><style>
  :root{color:#102047;background:#f4f6fa;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}*{box-sizing:border-box}body{margin:0;line-height:1.6}.page{max-width:860px;margin:0 auto;padding:52px 28px 72px}header{padding:32px;background:linear-gradient(135deg,#102047,#253d73);color:#fff;border-radius:20px}h1{margin:0;font-size:32px;line-height:1.25}header p{margin:10px 0 0;color:#dce7ff}.section-title{margin:46px 0 16px;font-size:22px}.day,.packing-group{padding:24px;background:#fff;border:1px solid #e3e8f1;border-radius:14px;margin:12px 0}.day h2{margin:0 0 14px;font-size:18px}.day ol{list-style:none;padding:0;margin:0}.stop{display:grid;grid-template-columns:110px 1fr;gap:18px;padding:16px 0;border-top:1px solid #edf0f5}.stop:first-child{border-top:0;padding-top:0}.stop time{font-weight:700;color:#f2573e}.stop h3,.packing-group h3{margin:0;color:#102047}.stop p{margin:5px 0 0;color:#4f5e76}.stop .location{color:#697991}.notes{font-size:14px}.packing-group ul{padding-left:20px;margin:10px 0 0}.packing-group li{margin:8px 0}.packing-group span{color:#b74432;font-size:13px}.packing-group small{display:block;color:#697991}.empty{margin:0;color:#697991}@media print{body{background:#fff}.page{max-width:none;padding:0}header{border-radius:0}.day,.packing-group{break-inside:avoid}}
</style></head><body><main class="page"><header><h1>${escapeHtml(trip.title)}</h1><p>${escapeHtml(trip.startDate)} 至 ${escapeHtml(trip.endDate)} · ${escapeHtml(trip.timezone)}</p></header><h2 class="section-title">每日行程</h2>${days}<h2 class="section-title">行李清单</h2>${packing}</main></body></html>`;
}

export async function downloadItineraryHtml(trip: Trip) {
  const [stops, packingItems] = await Promise.all([getStops(trip.id), getPackingItems(trip.id)]);
  const html = createItineraryHtml(trip, stops, packingItems);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${trip.title.replace(/[\\/:*?\"<>|]/g, "-") || "行程"}-行程单.html`;
  link.click();
  URL.revokeObjectURL(url);
}
