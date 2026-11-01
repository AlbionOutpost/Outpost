"use client";
import { useState } from "react";
import Link from "@/components/link";
import { savedShoppingSchema, type ShoppingList } from "@/lib/albion/shopping";
type Saved = { id: string; title: string; configuration: unknown };
export function ShoppingAccountLists({
  list,
  onLoad,
}: {
  list: ShoppingList;
  onLoad: (list: ShoppingList) => void;
}) {
  const [title, setTitle] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [rows, setRows] = useState<Saved[]>([]);
  async function load() {
    setBusy(true);
    try {
      const r = await fetch("/api/scenarios?kind=shopping-list");
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "Could not open account lists");
      setRows(body);
      setMessage("Your account lists are ready. Choose a list on this server to restore it.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not open account lists");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="panel shopping-account-lists">
      <summary>Save & load account lists</summary>
      <div>
        <h2>Keep a list for your next session.</h2>
        <p>
          Named lists are private to your account.{" "}
          <Link href="/signin" className="text-link">
            Sign in
          </Link>{" "}
          to keep them across devices. Your current device list stays here until you replace it.
        </p>
        <div className="market-form">
          <label>
            Shopping list title
            <input
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekend regear"
            />
          </label>
          <button
            type="button"
            className="button primary"
            disabled={busy || !list.entries.length || list.entries.length > 100}
            onClick={async () => {
              setBusy(true);
              try {
                const configuration = savedShoppingSchema.parse({
                  kind: "shopping-list",
                  region: list.region,
                  list,
                });
                const r = await fetch("/api/scenarios", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: title.trim() || "My shopping list",
                    configuration,
                  }),
                });
                const body = await r.json();
                if (!r.ok) throw new Error(body.error || "List could not be saved");
                setMessage("Shopping list saved to your account.");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "List could not be saved");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save account list
          </button>
          <button type="button" className="button secondary" disabled={busy} onClick={load}>
            Load account lists
          </button>
        </div>
        {list.entries.length > 100 && (
          <p>Account lists support up to 100 purchase lines. Your larger device list is kept.</p>
        )}
        {message && <p role="status">{message}</p>}
        {rows.map((row) => {
          const parsed = savedShoppingSchema.safeParse(row.configuration);
          const compatible = parsed.success && parsed.data.region === list.region;
          return (
            <div className="shopping-saved-list" key={row.id}>
              <span>
                <strong>{row.title}</strong>
                {parsed.success && (
                  <small>
                    {parsed.data.region} · {parsed.data.list.entries.length} purchase lines
                  </small>
                )}
              </span>
              <button
                type="button"
                className="button secondary"
                disabled={!compatible}
                onClick={() => {
                  if (parsed.success) {
                    onLoad(parsed.data.list);
                    setMessage("List restored. Check observation dates before buying.");
                  }
                }}
              >
                Restore {row.title}
              </button>
              <button
                type="button"
                className="button secondary negative"
                onClick={async () => {
                  try {
                    const r = await fetch(`/api/scenarios/${encodeURIComponent(row.id)}`, {
                      method: "DELETE",
                    });
                    if (!r.ok) throw new Error();
                    setRows(rows.filter((item) => item.id !== row.id));
                    setMessage("Account list deleted. Your device list is kept.");
                  } catch {
                    setMessage("The account list could not be deleted. Try again.");
                  }
                }}
              >
                Delete {row.title}
              </button>
            </div>
          );
        })}
      </div>
    </details>
  );
}
