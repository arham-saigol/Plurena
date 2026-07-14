export function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function timeAgo(timestamp: number) {
  const seconds = Math.round((timestamp - Date.now()) / 1_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const ranges: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31_536_000], ["month", 2_592_000], ["day", 86_400], ["hour", 3_600], ["minute", 60]];
  for (const [unit, amount] of ranges) if (Math.abs(seconds) >= amount) return formatter.format(Math.round(seconds / amount), unit);
  return formatter.format(seconds, "second");
}

export function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}
