"use client";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import type { Region } from "@/lib/albion/region-config";
type Saved = { id: string; title: string; kind: string; configuration: unknown };
export function ScenarioControls<T extends { kind: string; region: Region }>({
  configuration,
  onLoad,
  schema,
  hashKey = "scenario",
}: {
  configuration: T;
  onLoad: (data: T) => void;
  schema: z.ZodType<T>;
  hashKey?: "scenario" | "production-plan";
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<Saved[]>([]);
  const [busy, setBusy] = useState(false);
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    const frame = window.requestAnimationFrame(() => {
      restored.current = true;
      const hash = window.location.hash;
      const prefix = `#${hashKey}=`;
      if (!hash.startsWith(prefix)) return;
      try {
        if (hash.length > 65536) throw new Error();
        const parsed = schema.parse(JSON.parse(decodeURIComponent(hash.slice(prefix.length))));
        if (parsed.kind !== configuration.kind) throw new Error();
        onLoad(parsed);
        setMessage(
          "Shared static scenario restored. Observed prices retain their timestamps; refresh them before trading.",
        );
      } catch {
        setMessage("This shared scenario is invalid or belongs to another calculator.");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [configuration.kind, onLoad, schema, hashKey]);
  async function refresh() {
    setBusy(true);
    try {
      const response = await fetch(`/api/scenarios?kind=${encodeURIComponent(configuration.kind)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setRows(body.filter((r: Saved) => r.kind === configuration.kind));
      setMessage("Loaded your most recent saved scenarios for this calculator.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load scenarios");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel section">
      <h2>Save & share assumptions</h2>
      <p>
        Saved scenarios are private to your account. Share links include static inputs and price
        timestamps, not a promise of live prices.
      </p>
      <div className="market-form">
        <label>
          {hashKey === "production-plan" ? "Production plan title" : "Scenario title"}
          <input
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekly crafting run"
          />
        </label>
        <button
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const parsed = schema.parse(configuration);
              const response = await fetch("/api/scenarios", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: title.trim() || `${parsed.kind} scenario`,
                  configuration: parsed,
                }),
              });
              const body = await response.json();
              if (!response.ok) throw new Error(body.error);
              setMessage("Scenario saved to your account.");
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Could not save scenario");
            } finally {
              setBusy(false);
            }
          }}
        >
          {hashKey === "production-plan" ? "Save production plan" : "Save new scenario"}
        </button>
        <button className="button secondary" disabled={busy} onClick={refresh}>
          {hashKey === "production-plan" ? "Load saved production plans" : "Load saved scenarios"}
        </button>
        <button
          className="button secondary"
          onClick={async () => {
            try {
              const parsed = schema.parse(configuration);
              const url = new URL(window.location.href);
              url.searchParams.set("region", parsed.region);
              url.hash = `${hashKey}=${encodeURIComponent(JSON.stringify(parsed))}`;
              await navigator.clipboard.writeText(url.href);
              setMessage(
                "Scenario link copied. It shares static assumptions and source timestamps.",
              );
            } catch {
              setMessage(
                "Could not copy scenario link. Check the inputs and clipboard permission.",
              );
            }
          }}
        >
          {hashKey === "production-plan" ? "Copy production plan link" : "Copy scenario link"}
        </button>
      </div>
      <p role="status">{message}</p>
      {rows.map((r) => (
        <div className="group-member" key={r.id}>
          <span>{r.title}</span>
          <button
            className="button secondary"
            onClick={() => {
              const parsed = schema.safeParse(r.configuration);
              if (!parsed.success || parsed.data.kind !== configuration.kind) {
                setMessage(
                  "Saved scenario no longer matches the current format; no inputs were replaced.",
                );
                return;
              }
              onLoad(parsed.data);
              setTitle(r.title);
              setMessage(
                "Saved assumptions and region restored. Refresh market observations before trading.",
              );
            }}
          >
            Restore {r.title}
          </button>
          <button
            className="button secondary negative"
            onClick={async () => {
              try {
                const response = await fetch(`/api/scenarios/${r.id}`, { method: "DELETE" });
                if (!response.ok) throw new Error("Could not delete scenario");
                setRows(rows.filter((row) => row.id !== r.id));
                setMessage("Scenario deleted.");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Could not delete scenario");
              }
            }}
          >
            Delete {r.title}
          </button>
        </div>
      ))}
    </section>
  );
}
