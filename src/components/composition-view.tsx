"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, Link2, Pencil, Trash2, TriangleAlert } from "lucide-react";
import Link from "@/components/build-region-link";
import type { CompositionInput, MemberSlot } from "@/lib/compositions/validation";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { roleTone, slotRosterMember } from "@/lib/compositions/roster";
import { PartyReadiness } from "./party-readiness";
import { SavedEquipmentSets } from "./saved-equipment-sets";
import { CompositionPngExport } from "./composition-png-export";
import { ItemIcon } from "./item-icon";
import { BuildCardLoadout } from "./build-card-loadout";
import { RosterRows } from "./comp-roster";
import { CompParty } from "./comp-members";
import { BuildWindow } from "./build-window";
import { CompMenu } from "./comp-menu";
import { SectionHeading } from "./section-heading";
import { PanelHead } from "./panel-head";
import { StatusLine } from "./status-line";
import { EmptyWell } from "./empty-well";
import styles from "./comps.module.css";

const qualities = ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];

/** Downloads the comp in Outpost's import format. */
function exportJson(composition: CompositionInput) {
  const url = URL.createObjectURL(
    new Blob(
      [JSON.stringify({ format: "albion-outpost-composition", version: 1, composition }, null, 2)],
      { type: "application/json" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "albion-outpost-composition.json";
  a.click();
  URL.revokeObjectURL(url);
}

/** The masthead actions of a saved comp: Edit, and the rest behind one menu. */
export function CompositionActions({
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
      } else router.push("/compositions?mine=1");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "That didn’t work. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.mastActions}>
      {editable && (
        <Link className="button primary" href={`/compositions/${id}/edit`}>
          <Pencil size={16} aria-hidden="true" /> Edit comp
        </Link>
      )}
      <CompMenu label="More actions">
        {() => (
          <>
            <button
              type="button"
              className="button secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setMessage("Link copied. Only players who can see this comp can open it.");
                } catch {
                  setMessage("Copy the address from your browser’s address bar.");
                }
              }}
            >
              <Link2 size={16} aria-hidden="true" /> Copy share link
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => mutate("duplicate")}
            >
              <Copy size={16} aria-hidden="true" /> Duplicate comp
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => exportJson(composition)}
            >
              <Download size={16} aria-hidden="true" /> Export comp
            </button>
            {deletable && (
              <button
                type="button"
                className={`button secondary ${styles.danger}`}
                disabled={busy}
                onClick={() => mutate("delete")}
              >
                <Trash2 size={16} aria-hidden="true" /> Delete comp
              </button>
            )}
            {message && <StatusLine>{message}</StatusLine>}
            <CompositionPngExport composition={composition} />
          </>
        )}
      </CompMenu>
    </div>
  );
}

/** One member as the build window: role on the bar, the loadout on the board (or every piece
 * with its abilities in Details), the weapon and who plays it in the foot. */
export function memberWindow(
  slot: MemberSlot,
  i: number,
  detailed: boolean,
  titleId: string,
  category: string,
) {
  const member = slotRosterMember(slot);
  const weapon = slot.equipment.find((e) => e.slot === "Main hand");
  const n = i + 1;
  return (
    <BuildWindow
      titleId={`${titleId}-${n}`}
      heading="h3"
      number={n}
      title={slot.playerName || `Slot ${n}`}
      category={category}
      chips={
        <>
          <span className={`landing-chip ${styles.roleChip}`}>{member.role}</span>
          {!slot.mandatory && <span className="landing-chip is-muted">Optional</span>}
        </>
      }
      weaponName={member.name}
      weaponItemId={weapon?.itemId}
      weaponQuality={weapon?.quality}
      line={
        [
          slot.playerName ? "" : "No player named yet",
          slot.substitute ? `Sub: ${slot.substitute}` : "",
          slot.equipmentSets.length
            ? `${slot.equipmentSets.length} spare ${slot.equipmentSets.length === 1 ? "set" : "sets"}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ") || (slot.mandatory ? "Required slot" : "Optional slot")
      }
      pieces={slot.equipment.map((e) => ({ ...e, swap: e.alternatives[0] }))}
      abilities={false}
    >
      {detailed ? (
        <div className={styles.memberDetails}>
          {slot.equipment.length ? (
            <ul className={styles.pieces} aria-label={`Member ${n} equipment`}>
              {slot.equipment.map((e) => {
                const abilities = Object.entries(e.abilities);
                return (
                  <li key={e.slot}>
                    <ItemIcon id={e.itemId} quality={e.quality} size={40} />
                    <span>
                      <strong>{equipmentName(e.itemId)}</strong>
                      <small>
                        {e.slot} · {qualities[e.quality - 1]}
                      </small>
                      <small>
                        {abilities.length
                          ? abilities.map(([k, v]) => `${k}: ${v}`).join(" · ")
                          : "Abilities not chosen"}
                      </small>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.memberNote}>No equipment chosen yet.</p>
          )}
          <SavedEquipmentSets sets={slot.equipmentSets} />
          {slot.notes && <p className={`preserve ${styles.memberNote}`}>{slot.notes}</p>}
        </div>
      ) : slot.equipment.length ? undefined : (
        // An open slot keeps the card's empty loadout, so every window in a row is the same box
        <BuildCardLoadout pieces={[]} abilities={false} label={`Member ${n} equipment`} />
      )}
    </BuildWindow>
  );
}

export function CompositionView({
  id,
  composition,
  editable,
  dropped = 0,
}: {
  id: string;
  composition: CompositionInput;
  editable: boolean;
  /** Stored members that could not be read (see readStoredComposition). */
  dropped?: number;
}) {
  const [mode, setMode] = useState<"loadouts" | "details" | "roster">("loadouts");
  const titleId = useId();
  const slots = composition.slots;
  return (
    <>
      <section className={styles.section} aria-labelledby="comp-party">
        <SectionHeading
          id="comp-party"
          title={
            <>
              The <em>party</em>
            </>
          }
          line={`${slots.length} ${slots.length === 1 ? "player" : "players"}. Open a member for their loadout and swaps.`}
        />
        {dropped > 0 && (
          <p className={styles.warning} role="status">
            <TriangleAlert size={18} aria-hidden="true" />
            <span>
              {dropped === 1 ? "One member" : `${dropped} members`} of this comp could not be read
              and {dropped === 1 ? "is" : "are"} not shown.
              {editable ? ` Saving a new revision removes ${dropped === 1 ? "it" : "them"}.` : ""}
            </span>
          </p>
        )}
        {slots.length ? (
          <>
            <PartyReadiness members={slots} region={composition.region} />
            <div className={styles.toolbar}>
              <div className={styles.show} role="group" aria-label="Show the party as">
                <span className={styles.showLabel}>Show</span>
                <span className="segmented">
                  {(
                    [
                      ["loadouts", "Loadouts"],
                      ["details", "Details"],
                      ["roster", "Roster"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={mode === value}
                      onClick={() => setMode(value)}
                    >
                      {label}
                    </button>
                  ))}
                </span>
              </div>
            </div>
            {mode === "roster" ? (
              <div className={`raised ${styles.rosterPanel}`}>
                <RosterRows
                  members={slots.map((slot) => slotRosterMember(slot))}
                  limit={slots.length}
                  label={`${composition.title} roster`}
                />
              </div>
            ) : (
              <CompParty
                label={`${composition.title} members`}
                members={slots.map((slot, i) => ({
                  key: slot.id,
                  tone: roleTone(slot.role),
                  window: memberWindow(
                    slot,
                    i,
                    mode === "details",
                    titleId,
                    composition.contentType,
                  ),
                }))}
              />
            )}
          </>
        ) : (
          <EmptyWell
            surface
            emblem="team-comps"
            title="No member of this comp could be read"
            line="The comp is still here; its roster needs to be planned again."
            action={
              editable ? (
                <Link className="button secondary" href={`/compositions/${id}/edit`}>
                  Edit comp
                </Link>
              ) : undefined
            }
          />
        )}
      </section>
      {composition.notes.trim() && (
        <section
          className={`panel ${styles.panel} ${styles.afterSection}`}
          aria-labelledby="comp-notes"
        >
          <PanelHead id="comp-notes" title="Shotcaller notes" />
          <p className={`preserve ${styles.prose}`}>{composition.notes}</p>
        </section>
      )}
    </>
  );
}
