"use client";
import { LoadoutPriceCheck } from "./loadout-price-check";
import { useAtlasRegion } from "./region-context";
import { EquipmentSets } from "./equipment-sets";
import { EquipmentPicker } from "./equipment-picker";
import { findEquipment } from "@/lib/albion/equipment-catalog";
import type { EquipmentChoice } from "@/lib/compositions/validation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, Package, NotebookPen, Sparkles, Repeat2 } from "lucide-react";
import { BuildCompositionLink } from "./build-composition-link";
import { templateEquipment } from "@/lib/albion/equipment-sets";
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
  const region = useAtlasRegion();
  const [draft, setDraft] = useState<BuildInput>(initial || { ...empty, region });
  const [savedDraft, setSavedDraft] = useState(() =>
    JSON.stringify(initial || { ...empty, region }),
  );
  const dirty = JSON.stringify(draft) !== savedDraft;
  const [baseVersion, setBaseVersion] = useState(version);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [guestRecoveryReady, setGuestRecoveryReady] = useState(false);
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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [section, setSection] = useState<"equipment" | "abilities" | "alternatives" | "notes">(
    "equipment",
  );
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
    const parsed = buildInput.safeParse(draft);
    if (!parsed.success) return;
    const timer = setTimeout(() => {
      try {
        const saved = writeGuestBuildDraft(localStorage, guestDeviceKey, parsed.data);
        if (saved.status === "saved") {
          setSavedDraft(saved.json);
          setShareMessage("Draft saved on this device.");
        } else
          setShareMessage(
            "Automatic save is unavailable. Keep device drafts under64KB or export JSON for a backup.",
          );
      } catch {
        setShareMessage("Automatic save is unavailable. Export your build to keep a backup.");
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [draft, guest, guestRecoveryReady, guestDeviceKey]);
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
              ? "Device drafts must stay under64KB. Export JSON to keep this larger build."
              : "Your browser could not save this draft. Export JSON to keep a backup.",
          );
          return;
        }
        protectedGuestRecord.current = false;
        setSavedDraft(saved.json);
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
  return (
    <form
      onSubmit={save}
      className="build-editor focused-build-editor"
      aria-busy={guest ? !guestRecoveryReady : !!ownerId && !!recoveryKey && !recoveryReady}
    >
      <fieldset
        className="editor-ready-guard"
        disabled={guest ? !guestRecoveryReady : !!ownerId && !!recoveryKey && !recoveryReady}
      >
        <div className="editor-backline">
          <Link href="/builds">
            <ArrowLeft size={14} /> Builds
          </Link>
          <span>
            {guest ? "Device draft" : id ? `Revision ${version ?? 1}` : "New private draft"}
          </span>
          {id && !guest && (
            <BuildCompositionLink
              fromBuild={id}
              label="Add saved build to comp"
              className="text-link"
            />
          )}
        </div>
        <div className="build-command-bar">
          <label>
            Build title
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
            Activity
            <select
              aria-label="Content type"
              value={draft.contentType}
              onChange={(e) => update("contentType", e.target.value as BuildInput["contentType"])}
            >
              {contentTypes.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>

          {!guest && (
            <label>
              Build visibility
              <select
                aria-label="Build visibility"
                value={draft.visibility}
                onChange={(e) => update("visibility", e.target.value as BuildInput["visibility"])}
              >
                <option value="PRIVATE">Private</option>
                <option value="UNLISTED">Unlisted</option>
                <option value="PUBLIC">Public</option>
              </select>
            </label>
          )}
          <div className="build-save-action editor-persistent-save">
            <button className="button primary" disabled={saving}>
              {saving
                ? "Saving…"
                : guest
                  ? "Save on this device"
                  : id
                    ? "Save new revision"
                    : "Save build"}
            </button>
          </div>
          {!guest && (
            <button
              type="button"
              className="button secondary"
              disabled={!id}
              title={
                id
                  ? "Copy a link to the saved build; access follows its visibility"
                  : "Save the build to get a share link"
              }
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${location.origin}/builds/${id}`);
                  setShareMessage("Saved build link copied. Access follows build visibility.");
                } catch {
                  setShareMessage("Open the saved build to copy its address.");
                }
              }}
            >
              Copy saved link
            </button>
          )}
          <button
            type="button"
            className="button secondary"
            disabled={!supportedEquipment.length}
            data-editor-action="preview"
            onClick={() => setPreview(true)}
          >
            <Eye size={15} /> Preview build
          </button>
          <details className="build-file-tools">
            <summary>Import & export</summary>
            <div>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  const parsed = buildInput.safeParse(draft);
                  if (!parsed.success) {
                    setError("Add a title and valid equipment before exporting.");
                    return;
                  }
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(parsed.data, null, 2)], { type: "application/json" }),
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
                Export build JSON
              </button>
              <label className="build-import-label">
                Import build JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={async (e) => {
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
                        "Choose a valid Outpost build JSON file under64KB. Your current build was kept.",
                      );
                    }
                  }}
                />
              </label>
            </div>
          </details>
        </div>
        {recoveryMessage && (
          <p className="editor-save-status" role="status">
            {recoveryMessage}
          </p>
        )}
        {!guest && dirty && !recoveryMessage && ownerId && (
          <p className="editor-save-status">
            Unsaved edits stay in this tab for up to 30 minutes across navigation. Recovery keeps
            your eight most recent drafts and ends on sign out or reload. Save or export JSON to
            keep a permanent copy.
          </p>
        )}
        {shareMessage && (
          <p className="editor-save-status" role="status">
            {shareMessage}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error} Your draft has been kept. Use Import & export to keep a JSON backup before
            reloading.
          </p>
        )}
        {preview && (
          <EditorDialog open wide title="Build preview" onClose={() => setPreview(false)}>
            <div className="guest-build-preview">
              <h2>{draft.title || "Untitled build"}</h2>
              <p>
                {draft.contentType} · {guest ? "Guest draft" : "Unsaved preview"}
              </p>
              <BuildLoadoutView
                region={draft.region}
                equipment={draft.equipment.filter((row) => row.itemId)}
              />
            </div>
          </EditorDialog>
        )}
        <div className="editor-workspace-tabs" role="tablist" aria-label="Build workspace">
          {(
            [
              ["equipment", "Equipment", Package],
              ["abilities", "Abilities", Sparkles],
              ["alternatives", "Alternatives", Repeat2],
              ["notes", "Notes", NotebookPen],
            ] as const
          ).map(([key, label, Icon], index) => (
            <button
              type="button"
              role="tab"
              key={key}
              id={`editor-tab-${key}`}
              aria-selected={section === key}
              aria-controls={key === "notes" ? "editor-panel-notes" : "editor-equipment-workspace"}
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
                    ? (index + 1) % 4
                    : event.key === "ArrowLeft"
                      ? (index + 3) % 4
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? 3
                          : null;
                if (next === null) return;
                event.preventDefault();
                setSection((["equipment", "abilities", "alternatives", "notes"] as const)[next]);
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLElement>('[role="tab"]')
                  [next]?.focus();
              }}
            >
              <Icon size={16} /> {label}
              {key === "alternatives" && !!draft.equipmentSets.length && (
                <span aria-hidden="true">{draft.equipmentSets.length}</span>
              )}
            </button>
          ))}
        </div>
        {guest && !initial && !supportedEquipment.length && (
          <div className="build-editor-context">
            <div className="guest-build-notice">
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  if (
                    supportedEquipment.length &&
                    !window.confirm(
                      "Replace your current equipment with the example set? Save your draft first to keep it.",
                    )
                  )
                    return;
                  updateEquipment(templateEquipment("battleaxe"));
                  if (!draft.title) setDraft((d) => ({ ...d, title: "My Battleaxe build" }));
                }}
              >
                Load example equipment
              </button>
            </div>
          </div>
        )}
        {draft.equipment.some((row) => row.itemId && !findEquipment(row.itemId)) && (
          <p className="studio-notice">
            This build includes exact item IDs outside the visual picker. They are kept in your
            draft; use{" "}
            <a
              className="text-link"
              href="#advanced-build-items"
              onClick={() => setSection("notes")}
            >
              Advanced item IDs & notes
            </a>{" "}
            to edit them.
          </p>
        )}
        <div
          hidden={section === "notes"}
          role="tabpanel"
          id="editor-equipment-workspace"
          aria-labelledby={`editor-tab-${section === "notes" ? "equipment" : section}`}
        >
          <EquipmentPicker
            variant="build"
            view={section === "notes" ? "equipment" : section}
            value={supportedEquipment}
            onChange={updateEquipment}
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
          <details className="build-settings panel" open>
            <summary>Build settings & description</summary>
            <div className="input-grid">
              <label>
                Build region
                <select
                  aria-label="Build region"
                  value={draft.region}
                  onChange={(e) => update("region", e.target.value as BuildInput["region"])}
                >
                  <option value="europe">Europe</option>
                  <option value="americas">Americas</option>
                  <option value="asia">Asia</option>
                </select>
              </label>
              <label>
                Player count
                <input
                  type="number"
                  min={1}
                  max={400}
                  value={draft.playerCount}
                  onChange={(e) => update("playerCount", Number(e.target.value))}
                />
              </label>
              <label>
                Recommended IP (author estimate)
                <input
                  type="number"
                  min={0}
                  max={4000}
                  value={draft.recommendedIP}
                  onChange={(e) => update("recommendedIP", Number(e.target.value))}
                />
              </label>
            </div>
            <label>
              Description
              <textarea
                maxLength={4000}
                value={draft.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </label>
          </details>
          <details className="advanced-build panel" id="advanced-build-items">
            <summary>Advanced item IDs & notes</summary>
            <p className="muted">
              Use exact IDs for items outside the supported picker. Author-entered ability notes are
              not validated spell selections.
            </p>
            {draft.equipment.map((row, i) => (
              <div key={i} className="equipment-row">
                <div className="input-grid">
                  <label>
                    Equipment slot {i + 1}
                    <select
                      aria-label={`Equipment slot ${i + 1}`}
                      value={row.slot}
                      onChange={(e) => equip(i, "slot", e.target.value)}
                    >
                      {slots.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Item ID {i + 1}
                    <input
                      pattern="[A-Z0-9_@]+"
                      maxLength={100}
                      value={row.itemId}
                      onChange={(e) => equip(i, "itemId", e.target.value.toUpperCase())}
                    />
                  </label>
                  <label>
                    Quality {i + 1}
                    <select
                      aria-label={`Quality ${i + 1}`}
                      value={row.quality}
                      onChange={(e) => equip(i, "quality", Number(e.target.value))}
                    >
                      {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"].map((q, j) => (
                        <option key={q} value={j + 1}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Abilities / passives {i + 1}
                    <input
                      maxLength={1000}
                      value={row.abilities}
                      onChange={(e) => equip(i, "abilities", e.target.value)}
                    />
                  </label>
                  <label>
                    Alternatives / swaps {i + 1}
                    <input
                      maxLength={1000}
                      value={row.alternatives}
                      onChange={(e) => equip(i, "alternatives", e.target.value)}
                    />
                  </label>
                </div>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() =>
                    update(
                      "equipment",
                      draft.equipment.filter((_, j) => j !== i),
                    )
                  }
                >
                  Remove {row.slot}
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button secondary"
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
              Add equipment slot
            </button>
          </details>
          <details className="build-notes panel" open>
            <summary>Strategy & revision notes</summary>
            <label>
              Strategy, advantages, weaknesses and matchup notes
              <textarea
                rows={8}
                maxLength={12000}
                value={draft.strategy}
                onChange={(e) => update("strategy", e.target.value)}
              />
            </label>
            <label className="section">
              Patch / version notes
              <textarea
                maxLength={2000}
                value={draft.patchNotes}
                onChange={(e) => update("patchNotes", e.target.value)}
              />
            </label>
          </details>
        </div>
        {supportedEquipment.length > 0 && (
          <details className="editor-price-workspace">
            <summary>Market estimates & shopping list</summary>
            <LoadoutPriceCheck
              region={draft.region}
              equipment={draft.equipment.filter((row) => row.itemId)}
            />
          </details>
        )}
        <div className="actions section">
          <Link className="button secondary" href="/builds">
            Back to builds
          </Link>
          {id && (
            <button
              type="button"
              className="button secondary negative"
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
              Delete build
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}
