"use client";
import { PartyBoard } from "./party-board";
import { CompositionPngExport } from "./composition-png-export";
import { EquipmentStrip } from "./equipment-strip";
import { ItemIcon } from "@/components/item-icon";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { compositionInput, type CompositionInput } from "@/lib/compositions/validation";
import { equipmentName } from "@/lib/albion/equipment-catalog";
export function CompositionView({
  id,
  composition,
  editable,
  deletable,
}: {
  id: string;
  composition: CompositionInput;
  editable: boolean;
  deletable: boolean;
}) {
  const [mode, setMode] = useState(
    composition.slots.length >= 2 && composition.slots.length <= 7 ? "board" : "compact",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function mutate(action: "duplicate" | "delete") {
    if (action === "delete" && !window.confirm("Permanently delete this comp and its revisions?"))
      return;
    setBusy(true);
    try {
      const response = await fetch(
        action === "duplicate" ? `/api/compositions/${id}/duplicate` : `/api/compositions/${id}`,
        { method: action === "duplicate" ? "POST" : "DELETE" },
      );
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error);
      }
      if (action === "duplicate") {
        const body = await response.json();
        router.push(`/compositions/${body.id}/edit`);
      } else router.push("/compositions");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not complete action");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="actions composition-toolbar">
        <CompositionPngExport composition={composition} />
        {editable && (
          <Link className="button primary" href={`/compositions/${id}/edit`}>
            Edit comp
          </Link>
        )}

        <button
          className="button secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setMessage("Comp URL copied. Visibility permissions still apply.");
            } catch {
              setMessage(
                "Copy the URL from your browser address bar. Visibility permissions still apply.",
              );
            }
          }}
        >
          Copy share link
        </button>

        <label>
          Display
          <select aria-label="Comp display" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="board">Visual party board</option>
            <option value="detailed">Detailed cards</option>
            <option value="compact">Compact roster</option>
            <option value="overview">Party overview</option>
          </select>
        </label>
        <details
          className="comp-more-actions"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.currentTarget.open = false;
              e.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary className="button secondary">More actions</summary>
          <div className="comp-more-actions-panel">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => mutate("duplicate")}
            >
              Duplicate comp
            </button>
            <button
              className="button secondary"
              onClick={() => {
                const parsed = compositionInput.parse(composition);
                const url = URL.createObjectURL(
                  new Blob(
                    [
                      JSON.stringify(
                        { format: "albion-atlas-composition", version: 1, composition: parsed },
                        null,
                        2,
                      ),
                    ],
                    { type: "application/json" },
                  ),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "atlas-composition.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export comp
            </button>
            {deletable && (
              <button
                className="button secondary negative"
                disabled={busy}
                onClick={() => mutate("delete")}
              >
                Delete comp
              </button>
            )}
          </div>
        </details>
      </div>
      <p role="status" className="comp-action-status">
        {message}
      </p>
      {mode === "board" && <PartyBoard members={composition.slots} title={composition.title} />}
      <div hidden={mode === "board"} className={`composition-cards ${mode}`}>
        {composition.slots.map((s, i) => (
          <article className="panel composition-card" key={s.id}>
            <div className="card-top">
              <span className="member-index">{String(i + 1).padStart(2, "0")}</span>
              <span className="badge">{s.mandatory ? "REQUIRED" : "OPTIONAL"}</span>
            </div>
            <h2>{s.playerName || "Unassigned player"}</h2>
            <p className="role-label">
              {s.role === "Custom" ? s.customRole : s.role}
              {s.substitute ? ` · Substitute: ${s.substitute}` : ""}
            </p>
            {mode !== "detailed" && <EquipmentStrip equipment={s.equipment} />}
            {mode === "detailed" && (
              <ul className="equipment-summary">
                {s.equipment.map((e) => (
                  <li key={e.slot}>
                    <ItemIcon id={e.itemId} quality={e.quality} />
                    <strong>{e.slot}</strong>
                    <span>
                      {equipmentName(e.itemId)} · Q{e.quality}
                    </span>
                    {mode === "detailed" && (
                      <>
                        <small>
                          {Object.entries(e.abilities)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ") || "Abilities not specified"}
                        </small>
                        {e.alternatives.length > 0 && (
                          <small>
                            Alternatives: {e.alternatives.map(equipmentName).join(", ")}
                          </small>
                        )}
                      </>
                    )}
                  </li>
                ))}
                {!s.equipment.length && <li className="muted">Equipment not assigned</li>}
              </ul>
            )}
            {mode === "detailed" && s.notes && <p className="preserve">{s.notes}</p>}
          </article>
        ))}
      </div>
      <section className="panel section">
        <h2>Comp / shotcaller notes</h2>
        <p className="preserve">{composition.notes || "No additional notes."}</p>
      </section>
    </>
  );
}
