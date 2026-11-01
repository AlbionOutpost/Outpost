"use client";
import { shoppingListSchema, type ShoppingList } from "@/lib/albion/shopping";
import type { Region } from "@/lib/albion/region-config";
const key = (region: Region) => `outpost-shopping-v1:${region}`;
export function readShopping(region: Region): ShoppingList {
  const raw = localStorage.getItem(key(region));
  if (!raw) return { version: 1, region, entries: [] };
  if (raw.length > 131072) throw new Error("Your saved shopping list is too large to open");
  const list = shoppingListSchema.parse(JSON.parse(raw));
  if (list.region !== region) throw new Error("This shopping list belongs to another server");
  return list;
}
export function writeShopping(list: ShoppingList) {
  const parsed = shoppingListSchema.parse(list),
    raw = JSON.stringify(parsed);
  if (raw.length > 131072) throw new Error("The shopping list is full. Remove a few items first.");
  localStorage.setItem(key(parsed.region), raw);
  window.dispatchEvent(new Event("outpost-shopping-change"));
}
