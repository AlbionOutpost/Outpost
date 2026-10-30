"use client";
import { buildInventoryLayout } from "@/lib/build-inventory-layout";
import { useState } from "react";
import Link from "@/components/build-region-link";
import { useAtlasRegion } from "./region-context";
import type { LibraryBuild, LibraryComposition } from "@/lib/grind-library-types";
import { activityName } from "@/lib/grind-library-types";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { ItemIcon } from "./item-icon";
import { SpellIcon } from "./spell-icon";
import { CompositionPngExport, type CompositionImageInput } from "./composition-png-export";

const order: readonly string[] = buildInventoryLayout.map(({ slot }) => slot);
export function LibraryGroupWorkspace({
  composition,
  builds,
  spellNames,
}: {
  composition: LibraryComposition;
  builds: LibraryBuild[];
  spellNames: Record<string, string>;
}) {
  const region = useAtlasRegion(),
    [equipment, setEquipment] = useState(true),
    [alternatives, setAlternatives] = useState(true),
    [mounts, setMounts] = useState(true),
    [message, setMessage] = useState("");
  const byId = new Map(builds.map((build) => [build.id, build]));
  const recordedMounts = [
    ...new Set(
      builds.flatMap((build) =>
        build.equipment.filter((row) => row.slot === "Mount").map((row) => row.itemId),
      ),
    ),
  ];
  const image: CompositionImageInput = {
    title: composition.title,
    contentType: activityName(composition.category),
    region,
    visibility: "PUBLIC",
    slots: composition.members.map((id, i) => {
      const build = byId.get(id);
      return {
        role: "Custom",
        customRole: build?.title || `Slot ${i + 1}: loadout unavailable`,
        playerName: `Slot ${i + 1}${composition.optional.includes(id) ? " · Optional" : ""}`,
        equipment: (build?.equipment || []).map((row) => ({
          slot: row.slot,
          itemId: row.itemId,
          quality: 1,
          abilities: Object.fromEntries(
            row.skills.map((id, j) => [String(j), spellNames[id] || id]),
          ),
          alternatives: row.alternatives,
        })),
      };
    }),
  };
  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Copy this page’s address from your browser.");
      await navigator.clipboard.writeText(location.href);
      setMessage("Group build link copied.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Link copying is unavailable.");
    }
  }
  return (
    <>
      <section className="group-build-detail-tools" aria-label="Group build controls">
        <div className="button-row">
          <button type="button" className="button secondary" onClick={copyLink}>
            Copy link
          </button>
          <Link
            className="button primary"
            rel="nofollow"
            href={`/compositions/new?${new URLSearchParams({ fromComposition: composition.slug, region })}`}
          >
            Clone group build
          </Link>
        </div>
        <div className="group-build-view-options">
          <label>
            <input
              type="checkbox"
              checked={equipment}
              onChange={(e) => setEquipment(e.target.checked)}
            />
            Show equipment instead of abilities
          </label>
          <label>
            <input
              type="checkbox"
              checked={alternatives}
              onChange={(e) => setAlternatives(e.target.checked)}
            />
            Show equipment alternatives
          </label>
          <label>
            <input type="checkbox" checked={mounts} onChange={(e) => setMounts(e.target.checked)} />
            Include recorded mount requirements
          </label>
        </div>
        <CompositionPngExport
          composition={image}
          view={equipment ? "equipment" : "abilities"}
          showAlternatives={alternatives}
          includeMounts={mounts}
          allowCopy
        />
        {message && <p role="status">{message}</p>}
      </section>
      <h2>Builds in this group ({composition.members.length})</h2>
      <div className="library-comp-members">
        {composition.members.map((id, index) => {
          const build = byId.get(id);
          return (
            <section key={`${id}-${index}`} className="group-loadout-card">
              <div className="library-member-label">
                Slot {index + 1}
                {composition.optional.includes(id) && <span>Optional</span>}
              </div>
              {build ? (
                <>
                  <h2>
                    <Link href={`/builds/library/${encodeURIComponent(build.slug)}`}>
                      {build.title}
                    </Link>
                  </h2>
                  {equipment ? (
                    <div
                      className="group-loadout-equipment"
                      aria-label={`Slot ${index + 1} equipment`}
                    >
                      {order
                        .filter((slot) => mounts || slot !== "Mount")
                        .map((slot) => {
                          const row = build.equipment.find((row) => row.slot === slot);
                          return row ? (
                            <span key={slot} title={`${slot}: ${equipmentName(row.itemId)}`}>
                              <ItemIcon id={row.itemId} size={46} />
                              <span className="sr-only">
                                {slot}: {equipmentName(row.itemId)}
                              </span>
                            </span>
                          ) : null;
                        })}
                    </div>
                  ) : (
                    <div
                      className="group-loadout-abilities"
                      aria-label={`Slot ${index + 1} recorded abilities`}
                    >
                      {build.equipment
                        .filter((row) => mounts || row.slot !== "Mount")
                        .map((row) => (
                          <div key={row.slot}>
                            <small>{row.slot}</small>
                            {row.skills.length ? (
                              row.skills.map((id, i) => (
                                <span key={`${id}-${i}`} title={spellNames[id] || id}>
                                  <SpellIcon id={id} name={spellNames[id] || id} size={28} />
                                  <span className="sr-only">{spellNames[id] || id}</span>
                                </span>
                              ))
                            ) : (
                              <span className="muted">No recorded abilities</span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                  {alternatives && (
                    <div
                      className="group-loadout-alternatives"
                      aria-label={`Slot ${index + 1} equipment alternatives`}
                    >
                      {build.equipment
                        .filter((row) => mounts || row.slot !== "Mount")
                        .flatMap((row) =>
                          row.alternatives.map((id, i) => (
                            <span
                              key={`${row.slot}-${id}-${i}`}
                              title={`${row.slot}: ${equipmentName(id)}`}
                            >
                              <ItemIcon id={id} size={32} />
                              <span className="sr-only">
                                {row.slot}: {equipmentName(id)}
                              </span>
                              {!equipment &&
                                (row.alternativeSkills[id] || []).map((spell, j) => (
                                  <span key={`${spell}-${j}`} title={spellNames[spell] || spell}>
                                    <SpellIcon
                                      id={spell}
                                      name={spellNames[spell] || spell}
                                      size={24}
                                    />
                                    <span className="sr-only">{spellNames[spell] || spell}</span>
                                  </span>
                                ))}
                            </span>
                          )),
                        )}
                      {!build.equipment.some((row) => row.alternatives.length) && (
                        <span>No recorded equipment swaps</span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2>Loadout unavailable</h2>
                  <p>
                    This member’s position is retained. Choose another build when planning your
                    composition.
                  </p>
                </>
              )}
            </section>
          );
        })}
      </div>
      {mounts && (
        <section className="group-recorded-mounts">
          <h2>Recorded mount requirements</h2>
          {recordedMounts.length ? (
            <ul>
              {recordedMounts.map((id) => (
                <li key={id}>
                  <ItemIcon id={id} size={48} />
                  {equipmentName(id)}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No mount items were recorded for this group build. Confirm your party’s mount
              requirement before setting out.
            </p>
          )}
        </section>
      )}
    </>
  );
}
