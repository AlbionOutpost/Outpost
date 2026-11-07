"use client";
import { AccountPageMore, appendAccountRows } from "./account-page-more";
import { useState } from "react";
import Link from "@/components/link";
import { PanelHead } from "./panel-head";
import { Field } from "./field";
import styles from "./shopping-workspace.module.css";
import { savedShoppingSchema, type ShoppingList } from "@/lib/albion/shopping";
type Saved = { id: string; title: string; configuration: unknown };
export function ShoppingAccountLists({
  list,
  onLoad,
}: {
  list: ShoppingList;
  onLoad: (list: ShoppingList) => void;
}) {
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [title, setTitle] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [rows, setRows] = useState<Saved[]>([]);
  async function load() {
    setNextCursor(null);
    setBusy(true);
    try {
      const r = await fetch("/api/scenarios?kind=shopping-list");
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "Could not open account lists");
      setRows(body);
      setNextCursor(r.headers.get("X-Next-Cursor"));
      setMessage("Your account lists are ready. Choose a list on this server to restore it.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not open account lists");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`panel ${styles.accountPanel}`} aria-labelledby="shopping-saved-title">
      <PanelHead
        id="shopping-saved-title"
        emblem="tool-planner"
        title="Saved lists"
        line="Name a list to keep it on your account and open it on any device."
      />
      <div className={styles.accountBody}>
        <div className={styles.accountForm}>
          <Field label="List name">
            <input
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekend regear"
            />
          </Field>
          <button
            type="button"
            className="button secondary"
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
        </div>
        <button
          type="button"
          className={`button secondary ${styles.accountLoad}`}
          disabled={busy}
          onClick={load}
        >
          Load account lists
        </button>
        <p>
          Saved lists need{" "}
          <Link href="/signin" className="text-link">
            sign-in
          </Link>
          . The list on this page stays on this device until you restore another.
        </p>
        {list.entries.length > 100 && (
          <p>Account lists support up to 100 purchase lines. Your larger device list is kept.</p>
        )}
        {message && <p role="status">{message}</p>}
        {rows.map((row) => {
          const parsed = savedShoppingSchema.safeParse(row.configuration);
          const compatible = parsed.success && parsed.data.region === list.region;
          return (
            <div className={styles.savedRow} key={row.id}>
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
        <AccountPageMore<Saved>
          url="/api/scenarios?kind=shopping-list"
          cursor={nextCursor}
          disabled={busy}
          label="Load older account lists"
          onPage={(older, cursor) => {
            setRows((current) => appendAccountRows(current, older));
            setNextCursor(cursor);
          }}
        />
      </div>
    </section>
  );
}
