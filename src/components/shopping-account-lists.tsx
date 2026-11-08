"use client";
import { AccountPageMore, appendAccountRows } from "./account-page-more";
import { useState } from "react";
import { LogIn, RotateCcw, Trash2 } from "lucide-react";
import { useAccountId } from "./account-saves";
import Link from "@/components/link";
import { signInPath } from "@/lib/sign-in-return";
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
  const signedIn = useAccountId() !== null;
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
  async function save() {
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
        body: JSON.stringify({ title: title.trim() || "My shopping list", configuration }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "List could not be saved");
      setMessage("Shopping list saved to your account.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "List could not be saved");
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
      {!signedIn ? (
        <div className={styles.accountGuest}>
          <p>Sign in with Discord to keep lists on your account. This list stays on this device.</p>
          <Link href={signInPath("/shopping-list")} className="button secondary">
            <LogIn size={15} aria-hidden="true" /> Sign in to save lists
          </Link>
        </div>
      ) : (
        <div className={styles.accountBody}>
          {list.entries.length > 0 && list.entries.length <= 100 ? (
            <div className={styles.accountForm}>
              <Field label="List name">
                <input
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Weekend regear"
                />
              </Field>
              <button type="button" className="button primary" disabled={busy} onClick={save}>
                Save account list
              </button>
            </div>
          ) : (
            <p>
              {list.entries.length > 100
                ? "Account lists hold up to 100 purchase lines. Your larger device list is kept."
                : "Add an item to save this list to your account."}
            </p>
          )}
          <div className={styles.accountHead}>
            <span>On your account</span>
            <button type="button" className="pill-link is-small" disabled={busy} onClick={load}>
              <RotateCcw size={14} aria-hidden="true" />{" "}
              {rows.length ? "Reload" : "Load account lists"}
            </button>
          </div>
          {message && <p role="status">{message}</p>}
          {rows.length > 0 && (
            <ul className={styles.savedRows}>
              {rows.map((row) => {
                const parsed = savedShoppingSchema.safeParse(row.configuration);
                const compatible = parsed.success && parsed.data.region === list.region;
                return (
                  <li className={styles.savedRow} key={row.id}>
                    <span>
                      <strong>{row.title}</strong>
                      <small>
                        {parsed.success
                          ? `${parsed.data.region} · ${parsed.data.list.entries.length} purchase lines`
                          : "Could not be read"}
                      </small>
                    </span>
                    {compatible ? (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => {
                          if (parsed.success) {
                            onLoad(parsed.data.list);
                            setMessage("List restored. Check observation dates before buying.");
                          }
                        }}
                      >
                        Restore<span className="sr-only"> {row.title}</span>
                      </button>
                    ) : (
                      <small className={styles.savedNote}>
                        {parsed.success ? "Other server" : "Unreadable"}
                      </small>
                    )}
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`Delete ${row.title}`}
                      title="Delete"
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
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
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
      )}
    </section>
  );
}
