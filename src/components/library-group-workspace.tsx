"use client";
import { useState } from "react";
import { Link2 } from "lucide-react";
import Link from "@/components/build-region-link";
import { useOutpostRegion } from "./region-context";
import type { LibraryBuild, LibraryComposition } from "@/lib/grind-library-types";
import { activityName } from "@/lib/grind-library-types";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { ItemIcon } from "./item-icon";
import { LoadoutBoard } from "./loadout-board";
import { SpellIcon } from "./spell-icon";
import { CompositionPngExport, type CompositionImageInput } from "./composition-png-export";
import { libraryRosterMember } from "./comp-roster";
import { CompMembers, type CompMemberCard } from "./comp-members";
import { CompMenu } from "./comp-menu";
import { SectionHeading } from "./section-heading";
import { PanelHead } from "./panel-head";
import { StatusLine } from "./status-line";
import { Disclosure } from "./disclosure";
import styles from "./comps.module.css";

export function LibraryGroupWorkspace({
  composition,
  builds,
  spellNames,
  notes,
}: {
  composition: LibraryComposition;
  builds: LibraryBuild[];
  spellNames: Record<string, string>;
  /** The author's notes when they are too long for the masthead. */
  notes?: string;
}) {
  const region = useOutpostRegion(),
    [view, setView] = useState<"equipment" | "abilities">("equipment"),
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
      setMessage("Link copied.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Copy this page’s address from your browser.");
    }
  }
  const cards: CompMemberCard[] = composition.members.map((id, index) => {
    const build = byId.get(id);
    const optional = composition.optional.includes(id) ? (
      <span className="landing-chip is-muted">Optional</span>
    ) : null;
    if (!build)
      return {
        member: {
          key: `${id}-${index}`,
          name: "Loadout unavailable",
          role: "Open slot",
          armor: [],
        },
        title: "Loadout unavailable",
        badges: optional,
        body: (
          <p className={styles.memberNote}>
            This slot’s build is no longer in the library. Pick another when you plan the comp.
          </p>
        ),
      };
    const rows = build.equipment.filter((row) => mounts || row.slot !== "Mount");
    const swaps = rows.flatMap((row) =>
      row.alternatives.map((alt, i) => ({ row, alt, key: `${row.slot}-${alt}-${i}` })),
    );
    return {
      member: libraryRosterMember(build, index),
      title: <Link href={`/builds/library/${encodeURIComponent(build.slug)}`}>{build.title}</Link>,
      badges: optional,
      body: (
        <>
          {view === "equipment" ? (
            <div className={styles.memberBoard}>
              <LoadoutBoard
                pieces={rows}
                size="mini"
                abilities={false}
                label={`Slot ${index + 1} equipment`}
              />
            </div>
          ) : (
            <ul className={styles.abilities} aria-label={`Slot ${index + 1} recorded abilities`}>
              {rows.map((row) => (
                <li key={row.slot}>
                  <span className={styles.abilitySlot}>{row.slot}</span>
                  {row.skills.length ? (
                    <span className={styles.abilityIcons}>
                      {row.skills.map((spell, i) => (
                        <span key={`${spell}-${i}`} title={spellNames[spell] || spell}>
                          <SpellIcon id={spell} name={spellNames[spell] || spell} size={28} />
                          <span className="sr-only">{spellNames[spell] || spell}</span>
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className={styles.muted}>None recorded</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {alternatives && (
            <div
              className={styles.swaps}
              aria-label={`Slot ${index + 1} equipment alternatives`}
              role="group"
            >
              <span className={styles.swapsLabel}>Swaps</span>
              {swaps.length ? (
                <span className={styles.swapIcons}>
                  {swaps.map(({ row, alt, key }) => (
                    <span key={key} title={`${row.slot}: ${equipmentName(alt)}`}>
                      <ItemIcon id={alt} size={32} />
                      <span className="sr-only">
                        {row.slot}: {equipmentName(alt)}
                      </span>
                      {view === "abilities" &&
                        (row.alternativeSkills[alt] || []).map((spell, j) => (
                          <span key={`${spell}-${j}`} title={spellNames[spell] || spell}>
                            <SpellIcon id={spell} name={spellNames[spell] || spell} size={24} />
                            <span className="sr-only">{spellNames[spell] || spell}</span>
                          </span>
                        ))}
                    </span>
                  ))}
                </span>
              ) : (
                <span className={styles.muted}>None recorded</span>
              )}
            </div>
          )}
        </>
      ),
    };
  });
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
          line={`${composition.members.length} members. Roles are read from each weapon; open a member for the full build.`}
        />
        {notes && (
          <div className={styles.notes}>
            <Disclosure summary="Author’s notes">
              <p className="preserve">{notes}</p>
            </Disclosure>
          </div>
        )}
        <div className={styles.toolbar}>
          <div className={styles.show} role="group" aria-label="Show on each member">
            <span className={styles.showLabel}>Show</span>
            <span className={styles.segment}>
              <button
                type="button"
                aria-pressed={view === "equipment"}
                onClick={() => setView("equipment")}
              >
                Loadout
              </button>
              <button
                type="button"
                aria-pressed={view === "abilities"}
                onClick={() => setView("abilities")}
              >
                Abilities
              </button>
            </span>
            <button
              type="button"
              className={styles.toggle}
              aria-pressed={alternatives}
              onClick={() => setAlternatives((on) => !on)}
            >
              Swaps
            </button>
            <button
              type="button"
              className={styles.toggle}
              aria-pressed={mounts}
              onClick={() => setMounts((on) => !on)}
            >
              Mounts
            </button>
          </div>
          <CompMenu label="Share">
            {() => (
              <>
                <button type="button" className="button secondary" onClick={copyLink}>
                  <Link2 size={16} aria-hidden="true" /> Copy link
                </button>
                {message && <StatusLine>{message}</StatusLine>}
                <CompositionPngExport
                  composition={image}
                  view={view}
                  showAlternatives={alternatives}
                  includeMounts={mounts}
                  allowCopy
                />
              </>
            )}
          </CompMenu>
        </div>
        <CompMembers cards={cards} label={`${composition.title} members`} />
      </section>
      {mounts && (
        <section className={`panel ${styles.panel}`} aria-labelledby="comp-mounts">
          <PanelHead
            id="comp-mounts"
            title="Recorded mounts"
            line="What the members’ builds ride. Agree on mounts before you set out."
          />
          {recordedMounts.length ? (
            <ul className={styles.mounts}>
              {recordedMounts.map((id) => (
                <li key={id}>
                  <ItemIcon id={id} size={48} />
                  <span>{equipmentName(id)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <StatusLine>No member’s build records a mount.</StatusLine>
          )}
        </section>
      )}
    </>
  );
}
