"use client";
import { LoadoutPriceCheck } from "./loadout-price-check";
import { useOutpostRegion } from "./region-context";
import { EquipmentSets, StartingSets } from "./equipment-sets";
import { EquipmentPicker } from "./equipment-picker";
import { findEquipment } from "@/lib/albion/equipment-catalog";
import type { EquipmentChoice } from "@/lib/compositions/validation";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CircleAlert,
  Coins,
  Ellipsis,
  Download,
  Eye,
  FileJson,
  History,
  Link2,
  LogIn,
  NotebookPen,
  Package,
  Plus,
  Repeat2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { archivedSpellOptions } from "@/lib/albion/equipment-abilities";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { BuildWindow } from "./build-window";
import { Disclosure } from "./disclosure";
import { PanelHead } from "./panel-head";
import { StatusLine } from "./status-line";
import { WellSelect } from "./well-select";
import { BuildCompositionLink } from "./build-composition-link";
import { BuildLoadoutView } from "./build-loadout-view";
import { EditorDialog } from "./editor-dialog";
import Link from "@/components/link";
import { useRouter } from "next/navigation";
import { buildInput, slots, contentTypes, type BuildInput } from "@/lib/builds/validation";
import { accountBuildDrafts, accountLogoutEvent } from "@/lib/account-build-drafts";
import {
  guestBuildStorageKey,
  readGuestBuildDraft,
  writeGuestBuildDraft,
} from "@/lib/guest-build-storage";
import { NumberField } from "./number-field";
function buildValidationMessage(issue?: { path: PropertyKey[]; message: string }) {
  if (!issue) return "Review your equipment and build settings before saving.";
  if (issue.message === "Equipment slots must be unique")
    return "Each equipment slot can only be used once. Review the slots in Notes.";
  if (issue.message === "Main hand is required") return "Equip a main-hand weapon before saving.";
  if (issue.message.includes("two-handed"))
    return "Choose a one-handed weapon or remove the off hand before saving.";
  const field = issue.path[0];
  if (field === "title") return "Give your build a name between 3 and 100 characters.";
  if (field === "equipmentSets") return "Review spare-set names, equipment and the five-set limit.";
  if (field === "equipment")
    return "Review the selected items, abilities and alternatives. Each choice must match its equipment slot.";
  if (field === "recommendedIP")
    return "Enter recommended item power between 0 and 4,000 in Notes.";
  if (field === "playerCount") return "Choose a whole player count between 1 and 400 in Notes.";
  if (field === "description") return "Keep the build description within 4,000 characters.";
  if (field === "strategy") return "Keep strategy notes within 12,000 characters.";
  if (field === "patchNotes") return "Keep revision notes within 2,000 characters.";
  return "Review your activity, server and visibility settings before saving.";
}
const empty: BuildInput = {
  equipmentSets: [],
  title: "",
  description: "",
  contentType: "Other",
  region: "europe",
  visibility: "PRIVATE",
  playerCount: 1,
  recommendedIP: 0,
  strategy: "",
  patchNotes: "",
  equipment: [
    {
      slot: "Main hand",
      itemId: "",
      quality: 1,
      abilities: "",
      alternatives: "",
      abilitySelections: {},
      alternativeItemIds: [],
    },
  ],
};
export function BuildEditor({
  initial,
  id,
  version,
  guest = false,
  ownerId,
  recoveryKey,
}: {
  initial?: BuildInput;
  id?: string;
  version?: number;
  guest?: boolean;
  ownerId?: string;
  recoveryKey?: string;
}) {
  const region = useOutpostRegion();
  const [draft, setDraft] = useState<BuildInput>(initial || { ...empty, region });
  const [savedDraft, setSavedDraft] = useState(() =>
    JSON.stringify(initial || { ...empty, region }),
  );
  const dirty = JSON.stringify(draft) !== savedDraft;
  const [baseVersion, setBaseVersion] = useState(version);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [guestRecoveryReady, setGuestRecoveryReady] = useState(false);
  const [deviceSaved, setDeviceSaved] = useState(false);
  const guestDeviceKey = guestBuildStorageKey(recoveryKey, !!initial);
  const protectedGuestRecord = useRef(false);
  const recoveryLease = useRef<number | undefined>(undefined);
  const accountNavigationDraft = useRef<{
    ownerId: string;
    key: string;
    lease: number;
    draft: BuildInput;
    baseVersion?: number;
    dirty: boolean;
  } | null>(null);
  const titleId = useId();
  const [mainFlag, setMainFlag] = useState(false);
  const [docked, setDocked] = useState(false);
  const commandRef = useRef<HTMLElement>(null);
  const saveSlotRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const panel = commandRef.current;
    if (!panel) return;
    const observer = new IntersectionObserver(([entry]) => {
      const dock = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      // Keep the bar's place in the panel so nothing above the fold reflows when it docks
      const slot = saveSlotRef.current;
      if (slot) {
        slot.style.minWidth = dock ? `${slot.offsetWidth}px` : "";
        slot.style.minHeight = dock ? `${slot.offsetHeight}px` : "";
      }
      setDocked(dock);
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [section, setSection] = useState<
    "equipment" | "abilities" | "alternatives" | "cost" | "notes"
  >("equipment");
  const guestNavigationDraft = useRef<BuildInput | null>(null);
  useEffect(() => {
    if (guest || !ownerId || !recoveryKey) return;
    recoveryLease.current = accountBuildDrafts.activate(ownerId);
    const recovered = accountBuildDrafts.read(ownerId, recoveryKey);
    const frame = requestAnimationFrame(() => {
      if (recovered) {
        setDraft(recovered.draft);
        setBaseVersion(recovered.baseVersion);
        setRecoveryMessage(
          recovered.baseVersion !== version
            ? "Your unsaved draft was restored. A newer revision exists; saving this draft will report a conflict. Export JSON to keep it before reviewing the newer revision."
            : "Your unsaved draft was restored after navigation. Save or export it to keep a permanent copy. Recovery stays in this tab for up to 30 minutes and ends when you sign out or reload.",
        );
      }
      setRecoveryReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [guest, ownerId, recoveryKey, version]);
  useLayoutEffect(() => {
    if (!recoveryReady || guest || !ownerId || !recoveryKey || recoveryLease.current === undefined)
      return;
    accountNavigationDraft.current = {
      ownerId,
      key: recoveryKey,
      lease: recoveryLease.current,
      draft,
      baseVersion,
      dirty,
    };
    if (!dirty) {
      accountBuildDrafts.forget(ownerId, recoveryKey);
      return;
    }
    if (
      !accountBuildDrafts.remember(ownerId, recoveryKey, recoveryLease.current, draft, baseVersion)
    ) {
      const frame = requestAnimationFrame(() =>
        setRecoveryMessage(
          "Navigation recovery is unavailable for this draft. Save or export JSON before leaving this page.",
        ),
      );
      return () => cancelAnimationFrame(frame);
    }
  }, [recoveryReady, dirty, guest, ownerId, recoveryKey, draft, baseVersion]);
  useLayoutEffect(
    () => () => {
      const latest = accountNavigationDraft.current;
      if (latest?.dirty)
        accountBuildDrafts.remember(
          latest.ownerId,
          latest.key,
          latest.lease,
          latest.draft,
          latest.baseVersion,
        );
    },
    [],
  );
  useEffect(() => {
    if (!dirty) return;
    function flushGuestDraft() {
      if (!guest || !guestRecoveryReady || protectedGuestRecord.current) return false;
      try {
        return writeGuestBuildDraft(localStorage, guestDeviceKey, draft).status === "saved";
      } catch {
        return false;
      }
    }
    function beforeUnload(event: BeforeUnloadEvent) {
      if (flushGuestDraft()) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function beforeLogout(event: Event) {
      if (guest) return;
      if (
        !window.confirm(
          "Sign out and discard this unsaved build draft? Save or export JSON first to keep it.",
        )
      )
        event.preventDefault();
    }
    function followLink(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const link =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const target = new URL(link.href, location.href);
      if (target.origin === location.origin && target.pathname === location.pathname) return;
      if (flushGuestDraft()) return;
      if (
        !window.confirm(
          "Leave this build with unsaved changes? Save it or export JSON first to keep your draft.",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener(accountLogoutEvent, beforeLogout);
    document.addEventListener("click", followLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener(accountLogoutEvent, beforeLogout);
      document.removeEventListener("click", followLink, true);
    };
  }, [dirty, guest, draft, guestRecoveryReady, guestDeviceKey]);
  useEffect(() => {
    if (!guest) return;
    const frame = requestAnimationFrame(() => {
      try {
        const saved = readGuestBuildDraft(localStorage, guestDeviceKey);
        if (saved.status === "ready") {
          setDraft(saved.draft);
          setSavedDraft(JSON.stringify(saved.draft));
          setDeviceSaved(true);
          setShareMessage("Guest draft restored from this device.");
        } else if (saved.status === "invalid") {
          protectedGuestRecord.current = true;
          setError(
            "The saved device draft could not be restored and has been kept. Export your current build or use Save on this device to replace it deliberately.",
          );
        } else if (saved.status === "unavailable") {
          protectedGuestRecord.current = true;
          setError(
            "Device storage is unavailable. Export JSON to keep your build; automatic save is paused.",
          );
        }
      } catch {
        protectedGuestRecord.current = true;
        setError(
          "Device storage is unavailable. Export JSON to keep your build; automatic save is paused.",
        );
      } finally {
        setGuestRecoveryReady(true);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [guest, guestDeviceKey]);
  useLayoutEffect(() => {
    // Keep only committed input, and never flush the initial empty state over a
    // saved guest draft while the asynchronous restoration frame is pending.
    if (!guest || !guestRecoveryReady) return;
    guestNavigationDraft.current = draft;
  }, [draft, guest, guestRecoveryReady]);
  useEffect(() => {
    if (!guest) return;
    return () => {
      if (!guestNavigationDraft.current || protectedGuestRecord.current) return;
      try {
        writeGuestBuildDraft(localStorage, guestDeviceKey, guestNavigationDraft.current);
      } catch {
        // Explicit links/unload retain their existing storage-failure prompt.
      }
    };
  }, [guest, guestDeviceKey]);
  useEffect(() => {
    if (!guest || !guestRecoveryReady || protectedGuestRecord.current) return;
    // A restored or explicitly saved draft needs no delayed write. Leaving that timer
    // armed could replace a storage record changed while this clean draft was open.
    if (deviceSaved && !dirty) return;
    const parsed = buildInput.safeParse(draft);
    if (!parsed.success) return;
    const timer = setTimeout(() => {
      try {
        const saved = writeGuestBuildDraft(localStorage, guestDeviceKey, parsed.data);
        if (saved.status === "saved") {
          setSavedDraft(saved.json);
          setDeviceSaved(true);
          setShareMessage("Draft saved on this device.");
        } else
          setShareMessage(
            "Automatic save is unavailable. Keep device drafts under 64 KB or export JSON for a backup.",
          );
      } catch {
        setShareMessage("Automatic save is unavailable. Export your build to keep a backup.");
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [draft, guest, guestRecoveryReady, guestDeviceKey, deviceSaved, dirty]);
  const router = useRouter();
  const update = <K extends keyof BuildInput>(key: K, value: BuildInput[K]) =>
    setDraft({ ...draft, [key]: value });
  function equip(index: number, field: string, value: string | number) {
    update(
      "equipment",
      draft.equipment.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
              ...(field === "itemId" ? { abilitySelections: {}, alternativeItemIds: [] } : {}),
            }
          : row,
      ),
    );
  }
  const supportedEquipment = draft.equipment
    .filter((e) => !!findEquipment(e.itemId))
    .map((e) => ({
      slot: e.slot,
      itemId: e.itemId,
      quality: e.quality,
      abilities: e.abilitySelections,
      alternatives: e.alternativeItemIds,
    }));
  function updateEquipment(gear: EquipmentChoice[]) {
    update("equipment", [
      ...draft.equipment.filter(
        (e) => !findEquipment(e.itemId) && !gear.some((g) => g.slot === e.slot),
      ),
      ...gear.map((e) => ({
        slot: e.slot,
        itemId: e.itemId,
        quality: e.quality,
        abilities: draft.equipment.find((old) => old.slot === e.slot)?.abilities || "",
        alternatives: draft.equipment.find((old) => old.slot === e.slot)?.alternatives || "",
        abilitySelections: e.abilities,
        alternativeItemIds: e.alternatives,
      })),
    ]);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.equipment.some((row) => row.slot === "Main hand" && row.itemId)) {
      setError("Choose a main hand to save.");
      setMainFlag(true);
      setSection("equipment");
      return;
    }
    const parsed = buildInput.safeParse(draft);
    if (!parsed.success) {
      setError(buildValidationMessage(parsed.error.issues[0]));
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (guest) {
        const saved = writeGuestBuildDraft(localStorage, guestDeviceKey, parsed.data);
        if (saved.status !== "saved") {
          setError(
            saved.status === "oversized"
              ? "Device drafts must stay under 64 KB. Export JSON to keep this larger build."
              : "Your browser could not save this draft. Export JSON to keep a backup.",
          );
          return;
        }
        protectedGuestRecord.current = false;
        setSavedDraft(saved.json);
        setDeviceSaved(true);
        setShareMessage(
          "Guest draft saved on this device. No account or public build was created.",
        );
        return;
      }
      const response = await fetch(id ? `/api/builds/${id}` : "/api/builds", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { version: baseVersion, build: parsed.data } : parsed.data),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setSavedDraft(JSON.stringify(parsed.data));
      accountNavigationDraft.current = null;
      if (ownerId && recoveryKey) accountBuildDrafts.forget(ownerId, recoveryKey);
      router.push(`/builds/${body.id}`);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(
        guest
          ? "Your browser could not save this draft. Export build JSON to keep a backup."
          : e instanceof TypeError
            ? "Outpost could not be reached. Check your connection and try saving again."
            : message && !/^[\[{]/.test(message)
              ? message
              : "The build could not be saved. Review the inputs and try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  const status = saving
    ? "Saving your build…"
    : guest
      ? dirty || !deviceSaved
        ? "Device draft · not saved yet"
        : "Saved on this device"
      : id
        ? dirty
          ? `Unsaved changes · revision ${baseVersion ?? version ?? 1}`
          : `Saved revision ${baseVersion ?? version ?? 1}`
        : "Unsaved private draft";
  const equipped = draft.equipment.filter((row) => row.itemId);
  const spellNames: Record<string, string> = {};
  const pieces = equipped.map((row) => {
    const options = archivedSpellOptions(row.itemId);
    const skills = Object.entries(row.abilitySelections).flatMap(([key, name]) => {
      const spell = options.find((option) => option.key === key && option.name === name);
      if (spell) spellNames[spell.id] = spell.name;
      return spell ? [spell.id] : [];
    });
    return { slot: row.slot, itemId: row.itemId, skills };
  });
  const mainHand = equipped.find((row) => row.slot === "Main hand");
  const mainFlagged = mainFlag && !mainHand;
  return (
    <form
      onSubmit={save}
      className="focused-build-editor build-editor-workspace"
      aria-busy={guest ? !guestRecoveryReady : !!ownerId && !!recoveryKey && !recoveryReady}
    >
      <fieldset
        className="editor-ready-guard"
        disabled={guest ? !guestRecoveryReady : !!ownerId && !!recoveryKey && !recoveryReady}
      >
        <section className="raised editor-command" aria-label="Build details" ref={commandRef}>
          <div className="editor-command-fields">
            <label className="editor-title-field">
              <span>Build title</span>
              <input
                required
                minLength={3}
                maxLength={100}
                value={draft.title}
                placeholder="Name your loadout"
                onChange={(e) => update("title", e.target.value)}
              />
            </label>
            <label>
              <span>Activity</span>
              <WellSelect
                aria-label="Content type"
                value={draft.contentType}
                onChange={(e) => update("contentType", e.target.value as BuildInput["contentType"])}
              >
                {contentTypes.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </WellSelect>
            </label>
            {!guest && (
              <label>
                <span>Visibility</span>
                <WellSelect
                  aria-label="Build visibility"
                  value={draft.visibility}
                  onChange={(e) => update("visibility", e.target.value as BuildInput["visibility"])}
                >
                  <option value="PRIVATE">Private</option>
                  <option value="UNLISTED">Unlisted</option>
                  <option value="PUBLIC">Public</option>
                </WellSelect>
              </label>
            )}
          </div>
          <div className="editor-command-foot">
            <span className="landing-chip is-muted editor-draft-label" aria-live="polite">
              {status}
            </span>
            {id && !guest && (
              <details className="editor-file-menu editor-more-menu">
                <summary className="pill-link is-small">
                  <Ellipsis size={14} aria-hidden="true" /> More
                </summary>
                <div>
                  <Link className="button secondary" href={`/builds/${id}#build-actions`}>
                    <History size={15} aria-hidden="true" /> Revision history
                  </Link>
                  <BuildCompositionLink
                    fromBuild={id}
                    label="Add saved build to comp"
                    className="button secondary"
                  />
                  <button
                    type="button"
                    className="button secondary"
                    onClick={async (event) => {
                      event.currentTarget.closest("details")?.removeAttribute("open");
                      try {
                        await navigator.clipboard.writeText(`${location.origin}/builds/${id}`);
                        setShareMessage(
                          "Saved build link copied. Access follows build visibility.",
                        );
                      } catch {
                        setShareMessage("Open the saved build to copy its address.");
                      }
                    }}
                  >
                    <Link2 size={15} aria-hidden="true" /> Copy saved link
                  </button>
                </div>
              </details>
            )}
            <details className="editor-file-menu">
              <summary className="pill-link is-small">
                <FileJson size={14} aria-hidden="true" /> Import & export
              </summary>
              <div>
                <button
                  type="button"
                  className="button secondary"
                  onClick={(event) => {
                    event.currentTarget.closest("details")?.removeAttribute("open");
                    const parsed = buildInput.safeParse(draft);
                    if (!parsed.success) {
                      setError("Add a title and valid equipment before exporting.");
                      return;
                    }
                    const url = URL.createObjectURL(
                      new Blob([JSON.stringify(parsed.data, null, 2)], {
                        type: "application/json",
                      }),
                    );
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "outpost-build.json";
                    link.click();
                    URL.revokeObjectURL(url);
                    setShareMessage(
                      "Build JSON exported with your equipment, abilities, swaps and spare sets.",
                    );
                  }}
                >
                  <Download size={15} aria-hidden="true" /> Export build JSON
                </button>
                <label className="button secondary editor-import">
                  <Upload size={15} aria-hidden="true" /> Import build JSON
                  <input
                    className="sr-only"
                    type="file"
                    accept="application/json,.json"
                    onChange={async (e) => {
                      e.target.closest("details")?.removeAttribute("open");
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        if (file.size > 65536) throw new Error();
                        const parsed = buildInput.parse(JSON.parse(await file.text()));
                        setDraft(parsed);
                        setError("");
                        setShareMessage("Build imported. Review it before saving.");
                      } catch {
                        setError(
                          "Choose a valid Outpost build JSON file under 64 KB. Your current build was kept.",
                        );
                      }
                    }}
                  />
                </label>
                <small>Keeps equipment, abilities, swaps and spare sets.</small>
              </div>
            </details>
            {/* Save and Preview sit here; once this panel scrolls away they dock to the bottom */}
            <div className="editor-save-slot" ref={saveSlotRef}>
              <div className={`editor-save-bar${docked ? " is-docked" : ""}`}>
                <span className="editor-save-summary" aria-hidden="true">
                  <strong>{draft.title || "Untitled build"}</strong>
                  <small>
                    {equipped.length}/10 equipped · {status}
                  </small>
                </span>
                <button
                  type="button"
                  className="button secondary"
                  disabled={!supportedEquipment.length}
                  data-editor-action="preview"
                  onClick={() => setPreview(true)}
                >
                  <Eye size={15} aria-hidden="true" /> Preview build
                </button>
                <button className="button primary editor-persistent-save" disabled={saving}>
                  {saving
                    ? "Saving…"
                    : guest
                      ? "Save on this device"
                      : id
                        ? "Save new revision"
                        : "Save build"}
                </button>
              </div>
            </div>
          </div>
          {(recoveryMessage || shareMessage || (!guest && dirty && ownerId) || error) && (
            <div className="editor-messages">
              {recoveryMessage && <StatusLine>{recoveryMessage}</StatusLine>}
              {!guest && dirty && !recoveryMessage && ownerId && (
                <p className="editor-muted">
                  Unsaved changes stay in this tab while you browse, until you sign out or reload.
                </p>
              )}
              {shareMessage && <StatusLine>{shareMessage}</StatusLine>}
              {error && (
                <p className="editor-error" role="alert">
                  <CircleAlert size={16} aria-hidden="true" />
                  {error}
                  {/kept|main hand to save/.test(error) ? "" : " Your draft has been kept."}
                </p>
              )}
            </div>
          )}
        </section>
        {preview && (
          <EditorDialog open wide title="Build preview" onClose={() => setPreview(false)}>
            <div className="guest-build-preview build-detail-page editor-preview">
              <div className="editor-preview-top">
                <div className="editor-preview-card">
                  <BuildWindow
                    titleId={`${titleId}-preview`}
                    href={id ? `/builds/${id}` : "/builds/new"}
                    title={draft.title || "Untitled build"}
                    category={draft.contentType}
                    activity={draft.contentType}
                    weaponName={mainHand ? equipmentName(mainHand.itemId) : ""}
                    weaponItemId={mainHand?.itemId}
                    author="you"
                    updatedAt={new Date()}
                    pieces={pieces}
                    spellNames={spellNames}
                    heart={null}
                  />
                  <p className="editor-muted">
                    How the build shows in the builds list.{" "}
                    {guest ? "Guest draft" : "Not saved yet"}.
                  </p>
                </div>
                <section
                  id="build-cost"
                  className="raised detail-panel-frame editor-preview-cost"
                  aria-label="Preview loadout cost"
                >
                  <LoadoutPriceCheck region={draft.region} equipment={equipped} />
                </section>
              </div>
              <BuildLoadoutView region={draft.region} equipment={equipped} />
            </div>
          </EditorDialog>
        )}
        <div className="editor-workspace-tabs" role="tablist" aria-label="Build workspace">
          {(
            [
              ["equipment", "Equipment", Package],
              ["abilities", "Abilities", Sparkles],
              ["alternatives", "Alternatives", Repeat2],
              ["cost", "Cost", Coins],
              ["notes", "Notes", NotebookPen],
            ] as const
          ).map(([key, label, Icon], index) => (
            <button
              type="button"
              role="tab"
              key={key}
              id={`editor-tab-${key}`}
              aria-selected={section === key}
              aria-controls={
                key === "notes" || key === "cost"
                  ? `editor-panel-${key}`
                  : "editor-equipment-workspace"
              }
              tabIndex={section === key ? 0 : -1}
              onClick={() => {
                setSection(key);
                if (
                  (key === "abilities" || key === "alternatives") &&
                  matchMedia("(max-width: 980px)").matches
                )
                  requestAnimationFrame(() => {
                    const panel = document.getElementById("editor-selected-slot");
                    panel?.focus({ preventScroll: true });
                    panel?.scrollIntoView({ block: "start", behavior: "instant" });
                  });
              }}
              onKeyDown={(event) => {
                const next =
                  event.key === "ArrowRight"
                    ? (index + 1) % 5
                    : event.key === "ArrowLeft"
                      ? (index + 4) % 5
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? 4
                          : null;
                if (next === null) return;
                event.preventDefault();
                setSection(
                  (["equipment", "abilities", "alternatives", "cost", "notes"] as const)[next],
                );
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLElement>('[role="tab"]')
                  [next]?.focus();
              }}
            >
              <Icon size={16} aria-hidden="true" /> {label}
              {key === "alternatives" && !!draft.equipmentSets.length && (
                <span className="editor-tab-count" aria-hidden="true">
                  {draft.equipmentSets.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {draft.equipment.some((row) => row.itemId && !findEquipment(row.itemId)) && (
          <div className="editor-notice">
            <span>
              This build has item IDs the picker doesn’t list. They stay in your draft; edit them
              under Notes.
            </span>
            <a
              className="pill-link is-small"
              href="#advanced-build-items"
              onClick={() => setSection("notes")}
            >
              Edit item IDs
            </a>
          </div>
        )}
        <div
          hidden={section === "notes" || section === "cost"}
          role="tabpanel"
          id="editor-equipment-workspace"
          aria-labelledby={`editor-tab-${section === "notes" || section === "cost" ? "equipment" : section}`}
        >
          <EquipmentPicker
            variant="build"
            view={section === "notes" || section === "cost" ? "equipment" : section}
            value={supportedEquipment}
            onChange={updateEquipment}
            flaggedSlot={mainFlagged ? "Main hand" : undefined}
            boardEmpty={
              <StartingSets
                onPick={(template, rows) => {
                  updateEquipment(rows);
                  if (template === "battleaxe" && !draft.title)
                    setDraft((d) => ({ ...d, title: "My Battleaxe build" }));
                }}
              />
            }
            captureUndo={() => {
              const equipment = structuredClone(draft.equipment);
              return () => setDraft((latest) => ({ ...latest, equipment }));
            }}
          />
          <div hidden={section !== "alternatives"} className="editor-template-workspace">
            <EquipmentSets
              equipment={supportedEquipment}
              sets={draft.equipmentSets}
              onEquipment={updateEquipment}
              onSets={(sets) => update("equipmentSets", sets)}
              expanded
            />
          </div>
        </div>
        <div
          hidden={section !== "notes"}
          role="tabpanel"
          id="editor-panel-notes"
          aria-labelledby="editor-tab-notes"
          className="editor-notes-workspace"
        >
          <section className="raised editor-notes-panel" aria-labelledby="editor-settings-title">
            <PanelHead
              id="editor-settings-title"
              title="Build settings"
              line="Where it’s played, for how many, and what it’s about."
            />
            <div className="editor-field-grid">
              <label>
                <span>Build region</span>
                <WellSelect
                  aria-label="Build region"
                  value={draft.region}
                  onChange={(e) => update("region", e.target.value as BuildInput["region"])}
                >
                  <option value="europe">Europe</option>
                  <option value="americas">Americas</option>
                  <option value="asia">Asia</option>
                </WellSelect>
              </label>
              <label>
                <span>Player count</span>
                <NumberField
                  min={1}
                  max={400}
                  value={draft.playerCount}
                  onValueChange={(v) => update("playerCount", v ?? NaN)}
                />
              </label>
              <label>
                <span>Recommended IP</span>
                <NumberField
                  min={0}
                  max={4000}
                  value={draft.recommendedIP}
                  aria-describedby="editor-ip-help"
                  onValueChange={(v) => update("recommendedIP", v ?? NaN)}
                />
                <small id="editor-ip-help">Your estimate. 0 hides it.</small>
              </label>
            </div>
            <label>
              <span>Description</span>
              <textarea
                rows={4}
                maxLength={4000}
                value={draft.description}
                placeholder="What the build is for, in a sentence or two."
                onChange={(e) => update("description", e.target.value)}
              />
            </label>
          </section>
          <section className="raised editor-notes-panel" aria-labelledby="editor-strategy-title">
            <PanelHead
              id="editor-strategy-title"
              title="Strategy & patch notes"
              line="How to play it, what it beats, and what changed."
            />
            <label>
              <span>Strategy, strengths, weaknesses and matchups</span>
              <textarea
                rows={7}
                maxLength={12000}
                value={draft.strategy}
                onChange={(e) => update("strategy", e.target.value)}
              />
            </label>
            <label>
              <span>Patch notes</span>
              <textarea
                rows={3}
                maxLength={2000}
                value={draft.patchNotes}
                placeholder="Which patch this was made for, or what changed in this revision."
                onChange={(e) => update("patchNotes", e.target.value)}
              />
            </label>
            <div id="advanced-build-items" className="editor-advanced">
              <Disclosure
                summary="Advanced item IDs & notes"
                meta="For items the picker doesn’t list"
              >
                <div className="editor-id-rows">
                  {draft.equipment.map((row, i) => (
                    <div key={i} className="editor-id-row">
                      <label>
                        <span>Equipment slot {i + 1}</span>
                        <WellSelect
                          aria-label={`Equipment slot ${i + 1}`}
                          value={row.slot}
                          onChange={(e) => equip(i, "slot", e.target.value)}
                        >
                          {slots.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </WellSelect>
                      </label>
                      <label>
                        <span>Item ID {i + 1}</span>
                        <input
                          pattern="[A-Z0-9_@]+"
                          maxLength={100}
                          value={row.itemId}
                          onChange={(e) => equip(i, "itemId", e.target.value.toUpperCase())}
                        />
                      </label>
                      <label>
                        <span>Quality {i + 1}</span>
                        <WellSelect
                          aria-label={`Quality ${i + 1}`}
                          value={row.quality}
                          onChange={(e) => equip(i, "quality", Number(e.target.value))}
                        >
                          {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"].map(
                            (q, j) => (
                              <option key={q} value={j + 1}>
                                {q}
                              </option>
                            ),
                          )}
                        </WellSelect>
                      </label>
                      <label>
                        <span>Abilities / passives {i + 1}</span>
                        <input
                          maxLength={1000}
                          value={row.abilities}
                          onChange={(e) => equip(i, "abilities", e.target.value)}
                        />
                      </label>
                      <label>
                        <span>Alternatives / swaps {i + 1}</span>
                        <input
                          maxLength={1000}
                          value={row.alternatives}
                          onChange={(e) => equip(i, "alternatives", e.target.value)}
                        />
                      </label>
                      <button
                        className="button secondary editor-remove-item"
                        type="button"
                        onClick={() =>
                          update(
                            "equipment",
                            draft.equipment.filter((_, j) => j !== i),
                          )
                        }
                      >
                        <Trash2 size={15} aria-hidden="true" /> Remove {row.slot}
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="button secondary editor-add-row"
                    disabled={draft.equipment.length >= 10}
                    onClick={() => {
                      const slot = slots.find((s) => !draft.equipment.some((r) => r.slot === s));
                      if (slot)
                        update("equipment", [
                          ...draft.equipment,
                          {
                            slot,
                            itemId: "",
                            quality: 1,
                            abilities: "",
                            alternatives: "",
                            abilitySelections: {},
                            alternativeItemIds: [],
                          },
                        ]);
                    }}
                  >
                    <Plus size={15} aria-hidden="true" /> Add equipment slot
                  </button>
                </div>
              </Disclosure>
            </div>
          </section>
        </div>
        {/* The detail page's cost panel, as it is there, as its own tab */}
        <div
          hidden={section !== "cost"}
          role="tabpanel"
          id="editor-panel-cost"
          aria-labelledby="editor-tab-cost"
          className="build-detail-page editor-price-workspace"
        >
          <div className="raised detail-panel-frame">
            <LoadoutPriceCheck region={draft.region} equipment={equipped} />
          </div>
        </div>
        {/* Deleting is a settings matter: it shows with the Notes tab */}
        {id && section === "notes" && (
          <section className="editor-danger-zone" aria-labelledby="editor-delete-title">
            <PanelHead
              id="editor-delete-title"
              title="Delete this build"
              line="Removes the build and every revision for good."
              actions={
                <button
                  type="button"
                  className="button secondary editor-remove-item"
                  onClick={async () => {
                    if (!window.confirm("Permanently delete this build and all revisions?")) return;
                    setSaving(true);
                    try {
                      const response = await fetch(`/api/builds/${id}`, { method: "DELETE" });
                      if (!response.ok) throw new Error("Could not delete build");
                      router.push("/builds");
                      router.refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Could not delete build");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <Trash2 size={15} aria-hidden="true" /> Delete build
                </button>
              }
            />
          </section>
        )}
      </fieldset>
      {/* A guest's draft lives on this device; signing in is what publishes and shares it. */}
      {guest && (
        <section
          className="raised has-scene builds-next-step"
          data-scene="build"
          aria-labelledby="editor-next-step"
        >
          <h2 id="editor-next-step">
            Keep it on your <em>account</em>
          </h2>
          <p>
            Sign in with Discord to publish the build, share a link and put it in your Team’s comps.
          </p>
          <div className="builds-next-step-actions">
            <Link className="button primary" href="/signin">
              <LogIn size={16} aria-hidden="true" /> Sign in
            </Link>
            <Link className="button secondary" href="/builds?source=library">
              Browse the library <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}
    </form>
  );
}
