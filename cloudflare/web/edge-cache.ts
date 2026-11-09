/* Public answers kept in the edge cache for signed-out visitors. Each entry is a GET route whose
 * response depends only on the listed, validated query parameters — never on the visitor — so
 * one answer serves everyone and repeat requests skip the rate-limit object, the render object
 * and the data worker. Anything carrying an account cookie (which can see private builds, comps
 * and Teams) always goes to the app.
 *
 * Search returns user-made public builds and comps, so its TTL is short: a build made private or
 * hidden by moderation drops out of signed-out search within two minutes.
 *
 * Market Explorer's two reads keep their server cache lives: prices 60 s, history 5 min. The item
 * database's price line keeps 2 min, as the scans do: each price shows its own observation age. */
import {
  craftCategoryIds,
  gearCategoryIds,
  type CraftCategory,
} from "../../src/lib/albion/craft-categories";
import { cities } from "../../src/lib/albion/region-config";
import { ITEM_PRICE_BATCH } from "../../src/lib/albion/item-prices";

const regions = new Set(["europe", "americas", "asia"]);
const itemId = /^[A-Z0-9_@]{3,100}$/;
const marketCities = new Set<string>(cities);
type Rule = { ttl: number; key: (params: URLSearchParams) => string | null };
const rules: Record<string, Rule> = {
  "/api/search": {
    ttl: 120,
    key: (params) => {
      const q = (params.get("q") || "").trim().toLowerCase().replace(/\s+/g, " ");
      return q.length >= 2 && q.length <= 100 ? `q=${encodeURIComponent(q)}` : null;
    },
  },
  "/api/landing": {
    ttl: 120,
    key: (params) => {
      const region = params.get("region") || "";
      return regions.has(region) ? `region=${region}` : null;
    },
  },
  "/api/landing/craft": {
    ttl: 120,
    key: (params) => {
      const region = params.get("region") || "";
      const raw = params.get("batches");
      const batches = raw === null ? 1 : Number(raw);
      if (!regions.has(region) || !Number.isInteger(batches) || batches < 1 || batches > 50)
        return null;
      return `region=${region}&batches=${batches}`;
    },
  },
  // The scan routes return observations only (the page applies the player's cities, tax and
  // budget), so one answer per validated selection serves everyone.
  "/api/economy/crafts": {
    ttl: 120,
    key: (params) => {
      const region = params.get("region") || "",
        category = params.get("category") || "";
      const [tier, enchantment, quality] = ["tier", "enchantment", "quality"].map((k) =>
        params.get(k),
      );
      return regions.has(region) &&
        craftCategoryIds.includes(category as CraftCategory) &&
        /^[1-8]$/.test(tier || "") &&
        /^[0-4]$/.test(enchantment || "") &&
        /^[1-5]$/.test(quality || "")
        ? `region=${region}&category=${category}&tier=${tier}&enchantment=${enchantment}&quality=${quality}`
        : null;
    },
  },
  "/api/economy/black-market": {
    ttl: 120,
    key: (params) => {
      const region = params.get("region") || "",
        category = params.get("category") || "";
      const [from, to, enchantment, quality] = ["fromTier", "toTier", "enchantment", "quality"].map(
        (k) => params.get(k) || "",
      );
      return regions.has(region) &&
        gearCategoryIds.includes(category as CraftCategory) &&
        /^[2-8]$/.test(from) &&
        /^[2-8]$/.test(to) &&
        Number(from) <= Number(to) &&
        /^[0-4]$/.test(enchantment) &&
        /^[1-5]$/.test(quality)
        ? `region=${region}&category=${category}&fromTier=${from}&toTier=${to}&enchantment=${enchantment}&quality=${quality}`
        : null;
    },
  },
  "/api/market": {
    ttl: 60,
    key: (params) => {
      const [region, item, quality] = ["region", "item", "quality"].map((k) => params.get(k) || "");
      return regions.has(region) && itemId.test(item) && /^[1-5]$/.test(quality)
        ? `region=${region}&item=${encodeURIComponent(item)}&quality=${quality}`
        : null;
    },
  },
  // The item database's price line: one page of items, keyed by the sorted set so any order of
  // the same page shares one answer (the route sorts its answer the same way).
  "/api/items/prices": {
    ttl: 120,
    key: (params) => {
      const region = params.get("region") || "";
      const items = (params.get("items") || "").split(",");
      return regions.has(region) &&
        items.length <= ITEM_PRICE_BATCH &&
        items.every((id) => itemId.test(id)) &&
        new Set(items).size === items.length
        ? `region=${region}&items=${items.sort().join(",")}`
        : null;
    },
  },
  "/api/history": {
    ttl: 300,
    key: (params) => {
      const [kind, region, item, city, quality] = ["kind", "region", "item", "city", "quality"].map(
        (k) => params.get(k) || "",
      );
      if (!regions.has(region)) return null;
      if (kind === "gold") return `kind=gold&region=${region}`;
      return kind === "history" &&
        itemId.test(item) &&
        marketCities.has(city) &&
        /^[1-5]$/.test(quality)
        ? `kind=history&region=${region}&item=${encodeURIComponent(item)}&city=${encodeURIComponent(city)}&quality=${quality}`
        : null;
    },
  },
  "/api/combat-events/top": {
    ttl: 120,
    key: (params) => {
      const region = params.get("region") || "";
      return regions.has(region) ? `region=${region}` : null;
    },
  },
};

export const signedIn = (request: Request) =>
  /(?:^|;\s*)(?:__Secure-)?next-auth\.session-token=/.test(request.headers.get("Cookie") || "");

/** The normalised cache key and TTL for a cacheable signed-out request, or null. */
export function edgeCacheEntry(request: Request): { key: Request; ttl: number } | null {
  if (request.method !== "GET" || signedIn(request)) return null;
  const url = new URL(request.url);
  const rule = rules[url.pathname];
  if (!rule) return null;
  // Repeated parameters are ambiguous; let the app answer (and reject) them.
  if (new Set(url.searchParams.keys()).size !== [...url.searchParams.keys()].length) return null;
  const query = rule.key(url.searchParams);
  if (query === null) return null;
  return { key: new Request(`https://${url.hostname}${url.pathname}?${query}`), ttl: rule.ttl };
}
