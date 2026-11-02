import items from "./game/items.json" with { type: "json" };
import { HttpError } from "../http-error";

/** Source-recorded identity only; this does not promote current-patch verification. */
export const isSupportedMarketItem = (id: string) => Object.hasOwn(items, id);

export function requireSupportedMarketItems(ids: readonly string[]) {
  if (ids.some((id) => !isSupportedMarketItem(id)))
    throw new HttpError(400, "An item is not in the supported source catalog. No price requested.");
}
