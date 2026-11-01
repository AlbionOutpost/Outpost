type Fields = { operation?: string; status?: number; durationMs?: number; code?: string };
export function logEvent(level: "info" | "error", event: string, fields: Fields = {}) {
  if (process.env.NODE_ENV === "test") return;
  const record = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(record);
  else console.info(record);
}
