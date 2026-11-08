"use client";
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { regionSchema } from "@/lib/albion/region-config";
import type { MasteryLevels } from "@/lib/albion/focus";
import {
  bookmarkCollection,
  buildDeviceKey,
  type SavedLibraryBuild,
} from "@/lib/build-device-collections";
import { readMasteryLevels } from "@/lib/mastery-storage";

/** The signed-in account's id from the server session (null for guests). Never authority: the
 * server checks the session on every read and write. */
export const AccountIdContext = createContext<string | null>(null);
export const useAccountId = () => useContext(AccountIdContext);

type Data = {
  favorites: SavedLibraryBuild[];
  levels: MasteryLevels;
  limit: number;
  unavailable: number;
};
type Snapshot = {
  userId: string | null;
  status: "idle" | "loading" | "ready" | "error";
  data: Data | null;
  error: string;
  /** Spec levels waiting to be written, being written, or that failed to write. */
  levels: "saved" | "saving" | "error";
};
const idle: Snapshot = { userId: null, status: "idle", data: null, error: "", levels: "saved" };
let snapshot = idle;
const listeners = new Set<() => void>();
function update(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

async function request<T>(init?: { body: unknown }): Promise<T> {
  const response = await fetch("/api/account/saves", {
    ...(init
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(init.body),
        }
      : {}),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof body.error === "string" ? body.error : "Your account saves are unavailable.",
    );
  return body as T;
}

/** What this browser holds for a guest: library favorites on every server, and spec levels. */
function deviceCopy() {
  const favorites: string[] = [];
  for (const region of regionSchema.options)
    try {
      const raw = localStorage.getItem(buildDeviceKey("bookmarks", region));
      for (const build of bookmarkCollection(raw, region).builds)
        if (!favorites.includes(build.slug)) favorites.push(build.slug);
    } catch {}
  return { favorites, levels: readMasteryLevels() };
}
// The part of the device copy already merged into this account, so a favorite removed on the
// account is never added back, while one saved later as a guest still moves over.
const markerKey = (userId: string) => `outpost:account-merged:v1:${userId}`;
function readMarker(userId: string): { favorites: string[]; levels: MasteryLevels } {
  try {
    const raw = JSON.parse(localStorage.getItem(markerKey(userId)) || "{}");
    return {
      favorites: Array.isArray(raw.favorites) ? raw.favorites : [],
      levels: raw.levels && typeof raw.levels === "object" ? raw.levels : {},
    };
  } catch {
    return { favorites: [], levels: {} };
  }
}

async function load(userId: string, retry = false) {
  if (snapshot.userId === userId && snapshot.status !== "error" && !retry) return;
  update({ ...idle, userId, status: "loading" });
  try {
    const device = deviceCopy(),
      merged = readMarker(userId);
    const favorites = device.favorites.filter((key) => !merged.favorites.includes(key)),
      levels = Object.fromEntries(
        Object.entries(device.levels).filter(([id, level]) => merged.levels[id] !== level),
      );
    let data: Data;
    if (favorites.length || Object.keys(levels).length) {
      data = await request<Data>({ body: { action: "merge", favorites, levels } });
      try {
        localStorage.setItem(markerKey(userId), JSON.stringify(device));
      } catch {}
    } else data = await request<Data>();
    if (snapshot.userId === userId) update({ status: "ready", data });
  } catch (e) {
    if (snapshot.userId === userId)
      update({
        status: "error",
        error: e instanceof Error ? e.message : "Your account saves are unavailable.",
      });
  }
}

const serverSnapshot = () => idle;
/** The signed-in account's library favorites and spec levels, loaded once per page session.
 * The first load after signing in merges this browser's copy into the account. */
export function useAccountSaves() {
  const userId = useAccountId();
  const current = useSyncExternalStore(subscribe, () => snapshot, serverSnapshot);
  useEffect(() => {
    if (userId) void load(userId);
  }, [userId]);
  const mine = userId && current.userId === userId ? current : { ...idle, userId };
  return {
    ...mine,
    status: userId && mine.status === "idle" ? ("loading" as const) : mine.status,
    retry: () => userId && load(userId, true),
  };
}

/** Save or remove one library favorite on the account; resolves to the confirmed state. */
export async function setAccountFavorite(build: SavedLibraryBuild, active: boolean) {
  const body = await request<{ favorite: boolean }>({
    body: { action: "favorite", slug: build.slug, active },
  });
  if (typeof body.favorite !== "boolean")
    throw new Error("The server did not confirm your favorite. Refresh and try again.");
  const data = snapshot.data;
  if (data)
    update({
      data: {
        ...data,
        favorites: body.favorite
          ? [build, ...data.favorites.filter((b) => b.slug !== build.slug)]
          : data.favorites.filter((b) => b.slug !== build.slug),
      },
    });
  return body.favorite;
}

let levelsTimer: ReturnType<typeof setTimeout> | undefined;
/** Show new spec levels at once and write them to the account a moment after the last change,
 * so typing a level costs one request, not one per keystroke. */
export function saveAccountLevels(levels: MasteryLevels) {
  const data = snapshot.data;
  if (!data) return;
  update({ data: { ...data, levels }, levels: "saving" });
  clearTimeout(levelsTimer);
  levelsTimer = setTimeout(() => {
    const sent = snapshot.data?.levels;
    request<{ levels: MasteryLevels }>({
      body: {
        action: "levels",
        levels: Object.fromEntries(Object.entries(sent ?? {}).filter(([, v]) => v > 0)),
      },
    })
      .then(() => {
        if (snapshot.data?.levels === sent) update({ levels: "saved" });
      })
      .catch(() => update({ levels: "error" }));
  }, 800);
}
