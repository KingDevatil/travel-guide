export function toDateTimeLocalValue(value?: string): string {
  return value?.slice(0, 16) ?? "";
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("zh-CN", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function formatTimezoneLabel(timezone: string, date: string): string {
  try {
    const parts = new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      timeZoneName: "longOffset",
      hour: "2-digit",
    }).formatToParts(new Date(`${date}T12:00:00Z`));
    const offset = parts.find((part) => part.type === "timeZoneName")?.value.replace("GMT", "UTC");
    return offset ? `${timezone}（${offset}）` : timezone;
  } catch {
    return timezone;
  }
}

export function formatScheduledTimeRange(startsAt: string, endsAt?: string): string {
  const startDate = startsAt.slice(0, 10);
  const endDate = endsAt?.slice(0, 10);
  const start = startsAt.slice(11, 16);
  const end = endsAt?.slice(11, 16);
  if (end && endDate && endDate !== startDate) {
    return `${startDate} ${start}—${endDate} ${end}`;
  }
  return end ? `${start}—${end}` : start;
}
