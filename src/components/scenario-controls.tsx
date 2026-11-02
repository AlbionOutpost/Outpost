"use client";
import { AccountPageMore, appendAccountRows } from "./account-page-more";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { z } from "zod";
import type { Region } from "@/lib/albion/region-config";
import { scenarioHashLimit, scenarioLink, type ScenarioHashKey } from "@/lib/scenario-link";
type Saved = { id: string; title: string; kind: string; configuration: unknown };
export function ScenarioControls<T extends { kind: string; region: Region }>({
  configuration,
  onLoad,
  schema,
  hashKey = "scenario",
  prepare,
}: {
  configuration: T;
  onLoad: (data: T) => void;
  schema: z.ZodType<T>;
  hashKey?: ScenarioHashKey;
  prepare?: (configuration: unknown, signal?: AbortSignal) => Promise<void>;
}) {
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<Saved[]>([]);
  const [busy, setBusy] = useState(false);
  const restored = useRef(false);
  const onLoadRef = useRef(onLoad);
  const configurationRef = useRef(JSON.stringify(configuration));
  const restoreGeneration = useRef(0);
  useLayoutEffect(() => {
    onLoadRef.current = onLoad;
    configurationRef.current = JSON.stringify(configuration);
  });
  useEffect(() => {
    if (restored.current) return;
    const controller = new AbortController();
    const frame = window.requestAnimationFrame(async () => {
      restored.current = true;
      const hash = window.location.hash;
      const prefix = `#${hashKey}=`;
      if (!hash.startsWith(prefix)) return;
      const generation = ++restoreGeneration.current;
      const initialConfiguration = configurationRef.current;
      try {
        if (hash.length > scenarioHashLimit) throw new Error();
        const raw = JSON.parse(decodeURIComponent(hash.slice(prefix.length)));
        await prepare?.(raw, controller.signal);
        if (controller.signal.aborted || generation !== restoreGeneration.current) return;
        if (initialConfiguration !== configurationRef.current) {
          setMessage(
            "Your inputs changed while the recipe loaded. Your current inputs were kept; restore again to replace them.",
          );
          return;
        }
        const parsed = schema.parse(raw);
        if (parsed.kind !== configuration.kind) throw new Error();
        onLoadRef.current(parsed);
        setMessage(
          "Shared static scenario restored. Observed prices retain their timestamps; refresh them before trading.",
        );
      } catch (error) {
        if (!controller.signal.aborted && generation === restoreGeneration.current)
          setMessage(
            prepare && error instanceof Error && error.message.startsWith("Saved recipe")
              ? error.message
              : "This shared scenario is invalid or belongs to another calculator. Your current inputs were kept.",
          );
      }
    });
    return () => {
      controller.abort();
      // An operation counter, not a DOM ref: invalidate the latest pending restore on cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      restoreGeneration.current++;
      window.cancelAnimationFrame(frame);
    };
  }, [configuration.kind, schema, hashKey, prepare]);
  async function refresh() {
    setNextCursor(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/scenarios?kind=${encodeURIComponent(configuration.kind)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setRows(body.filter((r: Saved) => r.kind === configuration.kind));
      setNextCursor(response.headers.get("X-Next-Cursor"));
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
              const url = scenarioLink(window.location.href, parsed, hashKey);
              if (!url) {
                setMessage(
                  hashKey === "production-plan"
                    ? "This plan is too large for a share link. Save it to your account or use Export plan JSON."
                    : "This scenario is too large for a share link. Save it to your account or reduce its inputs.",
                );
                return;
              }
              await navigator.clipboard.writeText(url);
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
            disabled={busy}
            onClick={async () => {
              const generation = ++restoreGeneration.current;
              const initialConfiguration = configurationRef.current;
              setBusy(true);
              try {
                await prepare?.(r.configuration);
                if (generation !== restoreGeneration.current) return;
                if (initialConfiguration !== configurationRef.current) {
                  setMessage(
                    "Your inputs changed while the recipe loaded. Your current inputs were kept; restore again to replace them.",
                  );
                  return;
                }
                const parsed = schema.safeParse(r.configuration);
                if (!parsed.success || parsed.data.kind !== configuration.kind) {
                  setMessage(
                    "Saved scenario no longer matches the current format; no inputs were replaced.",
                  );
                  return;
                }
                onLoadRef.current(parsed.data);
                setTitle(r.title);
                setMessage(
                  "Saved assumptions and region restored. Refresh market observations before trading.",
                );
              } catch (error) {
                if (generation !== restoreGeneration.current) return;
                setMessage(
                  error instanceof Error && error.message.startsWith("Saved recipe")
                    ? error.message
                    : "Saved scenario could not be restored. Your current inputs were kept.",
                );
              } finally {
                if (generation === restoreGeneration.current) setBusy(false);
              }
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
      <AccountPageMore<Saved>
        url={`/api/scenarios?kind=${encodeURIComponent(configuration.kind)}`}
        cursor={nextCursor}
        disabled={busy}
        label="Load older scenarios"
        onPage={(older, cursor) => {
          setRows((current) =>
            appendAccountRows(
              current,
              older.filter((r) => r.kind === configuration.kind),
            ),
          );
          setNextCursor(cursor);
        }}
      />
    </section>
  );
}
