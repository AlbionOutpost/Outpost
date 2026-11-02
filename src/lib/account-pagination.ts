import { z } from "zod";
import { HttpError } from "./http-error";

const cursorSchema = z.tuple([z.string().datetime(), z.string().min(1).max(100)]);
export const accountPageOrder = [{ updatedAt: "desc" }, { id: "desc" }] as const;
export function accountPageFilter(cursor: string | null) {
  if (!cursor) return {};
  try {
    if (cursor.length > 700) throw new Error();
    const [time, id] = cursorSchema.parse(JSON.parse(decodeURIComponent(cursor)));
    const updatedAt = new Date(time);
    return { OR: [{ updatedAt: { lt: updatedAt } }, { updatedAt, id: { lt: id } }] };
  } catch {
    throw new HttpError(400, "Invalid page cursor");
  }
}
export function accountPage<T extends { id: string; updatedAt: Date }>(rows: T[], limit: number) {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  const cursor =
    rows.length > limit && last
      ? encodeURIComponent(JSON.stringify([last.updatedAt.toISOString(), last.id]))
      : null;
  return { items, cursor };
}
