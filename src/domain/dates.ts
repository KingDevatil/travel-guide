export function tripDates(startDate: string, endDate: string): string[] {
  if (endDate < startDate) return [];
  const dates: string[] = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    const [year, month, day] = current.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    current = next.toISOString().slice(0, 10);
  }
  return dates;
}
