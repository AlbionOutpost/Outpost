"use client";
import { useEffect, useState } from "react";
import { Home, Trash2 } from "lucide-react";
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
import "@/app/tool-workspace.css";
const KEY = "outpost:avalon-map-v1";
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
  const [message, setMessage] = useState("");
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
      setMessage(note);
    } catch {
      setMessage(`${note} This browser could not save it, so it will be lost on reload.`);
    }
  }
  const home = map.home;
  const route = home && target ? findRoute(map, home, target, now) : null;
  const links = map.links.toSorted((x, y) => Date.parse(x.expiresAt) - Date.parse(y.expiresAt));
  return (
    <div className="tool-workspace avalon-workspace">
      <section className="panel tool-library" aria-labelledby="avalon-add-title">
        <h2 id="avalon-add-title">Add a portal</h2>
        <datalist id="avalon-zones">
          {allZones.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
        <form
          className="avalon-form"
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
              setMessage(error instanceof Error ? error.message : "Check the portal");
            }
          }}
        >
          <label>
            From
            <input
              list="avalon-zones"
              value={form.a}
              onChange={(e) => setForm({ ...form, a: e.target.value })}
              required
            />
          </label>
          <label>
            To
            <input
              list="avalon-zones"
              value={form.b}
              onChange={(e) => setForm({ ...form, b: e.target.value })}
              required
            />
          </label>
          <label>
            Portal size
            <select
              value={form.size}
              onChange={(e) => setForm({ ...form, size: Number(e.target.value) as 7 | 20 })}
            >
              <option value={7}>7 players</option>
              <option value={20}>20 players</option>
            </select>
          </label>
          <div className="avalon-time">
            <label>
              Hours left
              <input
                type="number"
                min={0}
                max={48}
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })}
              />
            </label>
            <label>
              Minutes
              <input
                type="number"
                min={0}
                max={59}
                value={form.minutes}
                onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}
              />
            </label>
          </div>
          <button className="button primary" type="submit">
            Save portal
          </button>
        </form>
        <p role="status" className="muted">
          {message}
        </p>
      </section>
      <div className="tool-inputs">
        <section className="panel">
          <div className="tool-section-heading">
            <h2>Portals ({links.filter((l) => isOpen(l, now)).length} open)</h2>
            <span className="avalon-actions">
              <button
                className="button secondary"
                type="button"
                disabled={!links.some((l) => !isOpen(l, now))}
                onClick={() =>
                  save(
                    { ...map, links: map.links.filter((l) => isOpen(l, Date.now())) },
                    "Closed portals removed.",
                  )
                }
              >
                Remove closed
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={!links.length}
                onClick={() => {
                  if (confirm("Clear every portal from this device?"))
                    save({ ...emptyAvalonMap, home }, "Map cleared.");
                }}
              >
                Clear map
              </button>
            </span>
          </div>
          {!links.length ? (
            <p className="muted">
              No portals yet. Add the connections your scout finds; they stay in this browser only
              and are never sent to a server.
            </p>
          ) : (
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Saved portals">
              <table className="tool-table">
                <thead>
                  <tr>
                    <th scope="col">Zones</th>
                    <th scope="col">Size</th>
                    <th scope="col" className="numeric">
                      Time left
                    </th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((l) => (
                    <tr key={l.id} data-closed={!isOpen(l, now)}>
                      <th scope="row">
                        {l.a} ↔ {l.b}
                        <small className="avalon-zone-info">
                          {[zoneInfo(l.a), zoneInfo(l.b)].filter(Boolean).join(" · ")}
                        </small>
                      </th>
                      <td>{l.size}</td>
                      <td className="numeric">{now ? remaining(l, now) : "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Remove ${l.a} to ${l.b}`}
                          onClick={() =>
                            save(
                              { ...map, links: map.links.filter((x) => x.id !== l.id) },
                              "Portal removed.",
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <aside className="panel tool-results" aria-labelledby="avalon-route-title">
        <Home size={22} aria-hidden="true" />
        <h2 id="avalon-route-title">Route from home</h2>
        <label>
          Home zone
          <input
            list="avalon-zones"
            value={home ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              if (allZones.includes(value)) save({ ...map, home: value }, `Home set to ${value}.`);
              else setMap({ ...map, home: value || null });
            }}
          />
        </label>
        <label>
          Destination
          <input list="avalon-zones" value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        {home && target ? (
          route ? (
            <ol className="avalon-route">
              {route.zones.map((zone, i) => (
                <li key={zone}>
                  <strong>{zone}</strong>
                  {zoneInfo(zone) && <small>{zoneInfo(zone)}</small>}
                  {route.links[i] && (
                    <small>
                      {route.links[i].size}-player portal · {remaining(route.links[i], now)} left
                    </small>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p>No open route between these zones with the portals you have saved.</p>
          )
        ) : (
          <p className="muted">Set a home zone and a destination to see the fewest-portal route.</p>
        )}
      </aside>
    </div>
  );
}
