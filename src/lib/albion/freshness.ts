export function sourceTimestamp(date: string) {
  return Date.parse(date + (/[Zz]|[+-]\d{2}:\d{2}$/.test(date) ? "" : "Z"));
}
export function isStale(date: string, now = Date.now()) {
  const stamp = sourceTimestamp(date);
  return !Number.isFinite(stamp) || now - stamp > 3600000 || stamp - now > 300000;
}
