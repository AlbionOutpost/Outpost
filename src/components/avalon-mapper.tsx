"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import {
  allZones,
  avalonMap,
  emptyAvalonMap,
  findRoute,
  isOpen,
  roadZones,
  upsertLink,
  type AvalonLink,
  type AvalonMap,
} from "@/lib/albion/avalon-map";
import { CalculatorShell, ResultFigure, useCalculatorStep } from "./calculator-shell";
import { StatusLine } from "./status-line";
import { EmptyWell } from "./empty-well";
import { WellSelect } from "./well-select";
import { Missing } from "./calculator-figures";
import s from "./calculator-shell.module.css";
import c from "@/app/calculators.module.css";
import { NumberField } from "./number-field";
const KEY = "outpost:avalon-map-v1";
/** No painted Roads art yet; the neutral seal stands in (see the batch 4 report). */
const EMBLEM = "tool-planner";
const ICON_LABEL: Record<string, string> = {
  GREEN: "green chest",
  BLUE: "blue chest",
  GOLD: "gold chest",
  DUNGEON: "dungeon",
  WOOD: "wood",
  ROCK: "stone",
  FIBER: "fiber",
  HIDE: "hide",
  ORE: "ore",
};
const steps = ["avalon-add", "avalon-portals", "avalon-route"];
function remaining(link: AvalonLink, now: number) {
  const ms = Date.parse(link.expiresAt) - now;
  if (ms <= 0) return "Closed";
  const minutes = Math.floor(ms / 60000);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}
function zoneInfo(name: string) {
  const zone = roadZones.get(name);
  if (!zone) return null;
  return `T${zone.tier} · ${zone.icons.map((i) => `${i.count && i.count > 1 ? `${i.count}× ` : ""}${ICON_LABEL[i.node] ?? i.node.toLowerCase()}`).join(", ")}`;
}
export function AvalonMapper() {
  const [map, setMap] = useState<AvalonMap>(emptyAvalonMap);
  const [now, setNow] = useState(0);
  const [form, setForm] = useState({ a: "", b: "", size: 7 as 7 | 20, hours: 1, minutes: 0 });
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [step, goToStep] = useCalculatorStep(steps);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const parsed = avalonMap.safeParse(JSON.parse(localStorage.getItem(KEY) || "null"));
        if (parsed.success) setMap(parsed.data);
      } catch {}
      setNow(Date.now());
    });
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  function save(next: AvalonMap, note: string) {
    setMap(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setMessage({ text: note });
    } catch {
      setMessage({
        text: `${note} This browser couldn’t save it, so it will be gone after a reload.`,
        error: true,
      });
    }
  }
  const home = map.home;
  const route = home && target ? findRoute(map, home, target, now) : null;
  // Open portals first, soonest to close at the top; closed ones sink to the bottom.
  const links = map.links.toSorted(
    (x, y) =>
      Number(!isOpen(x, now)) - Number(!isOpen(y, now)) ||
      Date.parse(x.expiresAt) - Date.parse(y.expiresAt),
  );
  const open = links.filter((l) => isOpen(l, now)).length;
  const closed = links.length - open;
  const startAdding = () => {
    goToStep(1);
    requestAnimationFrame(() => document.getElementById("avalon-from")?.focus());
  };
  const add = (
    <form
      className={c.portalForm}
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const next = upsertLink(map, {
            a: form.a.trim(),
            b: form.b.trim(),
            size: form.size,
            minutes: form.hours * 60 + form.minutes,
          });
          save(next, `Saved ${form.a} ↔ ${form.b}.`);
          setForm((f) => ({ ...f, a: f.b, b: "" }));
        } catch (error) {
          setMessage({
            text: error instanceof Error ? error.message : "Check the portal.",
            error: true,
          });
        }
      }}
    >
      <datalist id="avalon-zones">
        {allZones.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
      <div className={`${s.fields} ${c.portalFields}`}>
        <label>
          From
          <input
            id="avalon-from"
            list="avalon-zones"
            autoComplete="off"
            placeholder="Zone you’re in, e.g. Cases-Ugumlos"
            value={form.a}
            onChange={(e) => setForm({ ...form, a: e.target.value })}
            required
          />
        </label>
        <label>
          To
          <input
            list="avalon-zones"
            autoComplete="off"
            placeholder="Zone the portal leads to"
            value={form.b}
            onChange={(e) => setForm({ ...form, b: e.target.value })}
            required
          />
        </label>
        <label>
          Portal size
          <WellSelect
            value={form.size}
            onChange={(e) => setForm({ ...form, size: Number(e.target.value) as 7 | 20 })}
          >
            <option value={7}>7 players</option>
            <option value={20}>20 players</option>
          </WellSelect>
        </label>
        <label>
          Hours left
          <NumberField
            min={0}
            max={48}
            value={form.hours}
            onValueChange={(v) => setForm({ ...form, hours: v ?? NaN })}
          />
        </label>
        <label>
          Minutes
          <NumberField
            min={0}
            max={59}
            value={form.minutes}
            onValueChange={(v) => setForm({ ...form, minutes: v ?? NaN })}
          />
        </label>
        <p className={s.help}>
          Start typing for the {allZones.length.toLocaleString()} known zones and Royal cities. Your
          map stays in this browser and is never sent anywhere.
        </p>
      </div>
      {message && (
        <StatusLine tone={message.error ? "error" : "default"}>{message.text}</StatusLine>
      )}
      <button className={`button secondary ${c.start}`} type="submit">
        Save portal
      </button>
    </form>
  );
  const portals = links.length ? (
    <>
      <ul className={c.portals} aria-label="Saved portals">
        {links.map((l) => {
          const live = isOpen(l, now);
          return (
            <li key={l.id} data-closed={live ? undefined : ""}>
              <span>
                <strong>
                  {l.a} ↔ {l.b}
                </strong>
                <small>
                  {[zoneInfo(l.a), zoneInfo(l.b)].filter(Boolean).join(" · ") || "City"}
                </small>
              </span>
              <span className={c.portalMeta}>
                <b>{now ? remaining(l, now) : "…"}</b>
                <small>{l.size} players</small>
              </span>
              <button
                type="button"
                className={c.iconButton}
                aria-label={`Remove ${l.a} to ${l.b}`}
                onClick={() =>
                  save({ ...map, links: map.links.filter((x) => x.id !== l.id) }, "Portal removed.")
                }
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      <div className={c.portalActions}>
        {closed > 0 && (
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              save(
                { ...map, links: map.links.filter((l) => isOpen(l, Date.now())) },
                "Closed portals removed.",
              )
            }
          >
            Remove {closed} closed
          </button>
        )}
        <button
          className="button secondary"
          type="button"
          onClick={() => {
            if (confirm("Clear every portal from this device?"))
              save({ ...emptyAvalonMap, home }, "Map cleared.");
          }}
        >
          Clear map
        </button>
      </div>
    </>
  ) : (
    <div className={c.columnEmpty}>
      <EmptyWell
        emblem={EMBLEM}
        title="No portals yet"
        line="Add each connection your scout finds, with its time left."
        action={
          <button type="button" className="button secondary" onClick={startAdding}>
            Add your first portal <ArrowRight size={16} aria-hidden="true" />
          </button>
        }
      />
    </div>
  );
  const hops = route ? route.zones.length - 1 : null;
  // Destinations are the zones on your map: a route can only run through saved portals.
  const destinations = [...new Set(map.links.flatMap((l) => [l.a, l.b]))]
    .filter((zone) => zone !== home)
    .sort((x, y) => x.localeCompare(y));
  const routePanel = (
    <>
      <div className={s.fields}>
        <label className={s.wide}>
          Home zone
          <input
            list="avalon-zones"
            autoComplete="off"
            placeholder="Your hideout or exit, e.g. Lymhurst"
            value={home ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              if (allZones.includes(value)) save({ ...map, home: value }, `Home set to ${value}.`);
              else setMap({ ...map, home: value || null });
            }}
          />
        </label>
        <label className={s.wide}>
          Destination
          <WellSelect
            aria-label="Destination"
            value={destinations.includes(target) ? target : ""}
            disabled={!destinations.length}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">
              {destinations.length ? "Choose a zone on your map" : "Save a portal first"}
            </option>
            {destinations.map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </WellSelect>
        </label>
      </div>
      <ResultFigure
        label="Fewest portals"
        value={
          <span data-result="avalon-hops">
            {hops === null ? <Missing /> : hops.toLocaleString()}
          </span>
        }
        note={
          !home || !target
            ? "Set a home zone and a destination"
            : route
              ? `${route.zones[0]} → ${route.zones.at(-1)}`
              : "No open route with the portals you saved"
        }
      />
      {route ? (
        <ol className={c.route}>
          {route.zones.map((zone, i) => (
            <li key={zone}>
              <strong>{zone}</strong>
              {zoneInfo(zone) && <small>{zoneInfo(zone)}</small>}
              {route.links[i] && (
                <small
                  className={
                    Date.parse(route.links[i].expiresAt) - now < 30 * 60000 ? c.soon : undefined
                  }
                >
                  {route.links[i].size}-player portal · {remaining(route.links[i], now)} left
                </small>
              )}
            </li>
          ))}
        </ol>
      ) : home && target ? (
        <p className={s.resultNote}>
          Add the portals between them, or check that none of them has closed.
        </p>
      ) : (
        <p className={s.resultNote}>The route only uses portals that are still open.</p>
      )}
    </>
  );
  return (
    <div className={`${s.journey} ${c.equalPanels}`}>
      <CalculatorShell
        label="Roads of Avalon"
        step={step}
        onStep={goToStep}
        steps={[
          {
            id: steps[0],
            label: "Add portal",
            title: "Add a portal",
            line: "Two zones and the time on the portal.",
            children: add,
          },
          {
            id: steps[1],
            label: "Your map",
            title: "Portals",
            line: links.length
              ? `${open} open${closed ? ` · ${closed} closed` : ""}, soonest to close first.`
              : "Everything you’ve scouted, with its time left.",
            children: portals,
          },
          {
            id: steps[2],
            label: "Route home",
            title: "Route",
            line: "The shortest way through the portals you saved.",
            children: routePanel,
          },
        ]}
      />
    </div>
  );
}
