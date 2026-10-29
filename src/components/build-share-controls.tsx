"use client";
import { useEffect, useRef, useState } from "react";
import { Share2, Link2, Download, Image as ImageIcon, ChevronDown } from "lucide-react";
import type { BuildImageEquipment } from "@/lib/build-image-export";

export function BuildShareControls({
  title,
  equipment,
  privateBuild = false,
}: {
  title: string;
  equipment: BuildImageEquipment[];
  privateBuild?: boolean;
}) {
  const menu = useRef<HTMLDetailsElement>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (menu.current?.open && !menu.current.contains(event.target as Node))
        menu.current.removeAttribute("open");
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  async function run(action: "link" | "image" | "download") {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (action === "link") {
        if (!navigator.clipboard?.writeText)
          throw new Error(
            "Link copying is unavailable. Copy this page’s address from your browser.",
          );
        await navigator.clipboard.writeText(window.location.href);
        setMessage(
          privateBuild
            ? "Private link copied. Existing viewing permissions still apply."
            : "Build link copied.",
        );
      } else {
        if (
          action === "image" &&
          (!navigator.clipboard?.write || typeof ClipboardItem === "undefined")
        )
          throw new Error(
            "Image copying is unavailable in this browser. Use Download PNG instead.",
          );
        const { exportBuildImage } = await import("@/lib/build-image-export");
        const { blob, missing } = await exportBuildImage(title, equipment);
        if (action === "image") {
          if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined")
            throw new Error(
              "Image copying is unavailable in this browser. Use Download PNG instead.",
            );
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setMessage(
            missing
              ? "Image copied. Unavailable artwork is labeled with item names."
              : "Build image copied.",
          );
        } else {
          const url = URL.createObjectURL(blob),
            link = document.createElement("a");
          link.href = url;
          link.download = `outpost-${title.replace(/[^a-z0-9]+/gi, "-").slice(0, 60) || "build"}.png`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setMessage(
            missing
              ? "PNG downloaded. Unavailable artwork is labeled with item names."
              : "Build PNG downloaded.",
          );
        }
      }
      menu.current?.removeAttribute("open");
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Your browser blocked clipboard access. Copy the page address or use Download PNG."
          : error instanceof Error
            ? error.message
            : "Sharing failed. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="build-share-control">
      <details
        ref={menu}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            menu.current?.removeAttribute("open");
            menu.current?.querySelector("summary")?.focus();
          }
        }}
      >
        <summary className="button secondary">
          <Share2 size={15} />
          Share
          <ChevronDown size={13} />
        </summary>
        <div className="build-share-menu">
          <button type="button" disabled={busy} onClick={() => run("link")}>
            <Link2 size={15} />
            Copy build link
          </button>
          <button type="button" disabled={busy} onClick={() => run("image")}>
            <ImageIcon size={15} />
            Copy as image
          </button>
          <button type="button" disabled={busy} onClick={() => run("download")}>
            <Download size={15} />
            Download PNG
          </button>
        </div>
      </details>
      <span className="build-share-status" role="status">
        {busy ? "Preparing your build…" : message}
      </span>
    </div>
  );
}
