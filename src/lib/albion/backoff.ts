export function retryDelay(headers: Headers, now = Date.now()): number {
  const retry = headers.get("retry-after");
  if (retry) {
    const seconds = Number(retry);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - now;
    if (Number.isFinite(delay)) return Math.max(1000, delay);
  }
  const reset = headers.get("x-ratelimit-reset") ?? headers.get("ratelimit-reset");
  if (reset) {
    const value = Number(reset);
    const delay = Number.isFinite(value)
      ? value > 1000000000
        ? value * 1000 - now
        : value * 1000
      : Date.parse(reset) - now;
    if (Number.isFinite(delay)) return Math.max(1000, delay);
  }
  return 60000;
}
