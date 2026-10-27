"use client";
import { useState } from "react";
import type { CompositionInput } from "@/lib/compositions/validation";
import { equipmentName } from "@/lib/albion/equipment-catalog";
const slots = [
  "Main hand",
  "Off hand",
  "Helmet",
  "Chest",
  "Boots",
  "Cape",
  "Food",
  "Potion",
  "Mount",
];
export function CompositionPngExport({ composition }: { composition: CompositionInput }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [size, setSize] = useState("full");
  async function download() {
    if (!composition.slots.length) {
      setMessage("Add a player before exporting.");
      return;
    }
    if (size === "1080" && composition.slots.length > 20) {
      setMessage("Use full-height export for more than20 players so equipment stays readable.");
      return;
    }
    setBusy(true);
    setMessage("");
    const artwork = new Map<string, ImageBitmap>();
    try {
      await document.fonts.ready;
      const uiFont = getComputedStyle(document.body).fontFamily;
      const wide = size === "1080",
        smallParty = composition.slots.length <= 7;
      const canvas = document.createElement("canvas"),
        cols = wide && !smallParty ? 5 : smallParty ? Math.min(3, composition.slots.length) : 2,
        cardWidth = wide ? (smallParty ? 500 : 400) : 680,
        rowHeight = wide && smallParty ? 360 : wide ? 240 : 176;
      canvas.width = cols * cardWidth + 64;
      canvas.height = 164 + Math.ceil(composition.slots.length / cols) * rowHeight + 48;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Image export is unavailable in this browser.");
      ctx.fillStyle = "#101014";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#D1A36A";
      ctx.font = `600 15px ${uiFont}`;
      ctx.fillText("OUTPOST / PARTY LOADOUT", 32, 36);
      const text = (value: string, max: number) => {
        let v = value;
        while (ctx.measureText(v).width > max && v.length) v = v.slice(0, -1);
        return v === value ? v : `${v.slice(0, -1)}…`;
      };
      ctx.fillStyle = "#F2EEE9";
      ctx.font = `bold 32px ${uiFont}`;
      ctx.fillText(text(composition.title || "Untitled comp", canvas.width - 64), 32, 82);
      ctx.fillStyle = "#A9A4A9";
      ctx.font = `16px ${uiFont}`;
      ctx.fillText(
        `${composition.contentType} · ${composition.region} · ${composition.slots.length} players · ${composition.visibility.toLowerCase()} plan`,
        32,
        116,
      );
      // Same-origin bounded renderer avoids cross-origin canvas taint; no new image proxy or external upload.
      const ids = [
        ...new Set(
          composition.slots.flatMap((s) =>
            s.equipment
              .filter((e) => slots.includes(e.slot))
              .map((e) => `${e.itemId}:${e.quality}`),
          ),
        ),
      ];
      let missing = 0;
      // Bound concurrent requests to protect the existing image service.
      for (let offset = 0; offset < ids.length; offset += 4)
        await Promise.all(
          ids.slice(offset, offset + 4).map(async (key) => {
            try {
              const [id, quality] = key.split(":");
              const response = await fetch(
                `/api/item-icon?${new URLSearchParams({ id, quality })}`,
                { signal: AbortSignal.timeout(5000) },
              );
              if (!response.ok || response.headers.get("X-Icon-Status") !== "available")
                throw new Error();
              artwork.set(key, await createImageBitmap(await response.blob()));
            } catch {
              missing++;
            }
          }),
        );
      composition.slots.forEach((member, i) => {
        const x = 32 + (i % cols) * cardWidth,
          y = 148 + Math.floor(i / cols) * rowHeight;
        ctx.fillStyle = "#201C1E";
        ctx.fillRect(x, y, cardWidth - 16, rowHeight - 16);
        ctx.strokeStyle = "#393033";
        ctx.strokeRect(x + 0.5, y + 0.5, cardWidth - 17, rowHeight - 17);
        ctx.fillStyle = "#D1A36A";
        ctx.font = `bold 16px ${uiFont}`;
        ctx.fillText(String(i + 1).padStart(2, "0"), x + 14, y + 28);
        ctx.fillStyle = "#F2EEE9";
        ctx.font = `bold 18px ${uiFont}`;
        ctx.fillText(
          text(
            member.role === "Custom" ? member.customRole || "Custom" : member.role,
            cardWidth - 80,
          ),
          x + 48,
          y + 28,
        );
        ctx.fillStyle = "#A9A4A9";
        ctx.font = `14px ${uiFont}`;
        ctx.fillText(text(member.playerName || "Unassigned player", 460), x + 14, y + 52);
        slots.forEach((slot, j) => {
          const grid = wide && smallParty;
          const box = grid ? 66 : wide ? 54 : 60;
          const left = grid
              ? x + (cardWidth - 240) / 2 + (j % 3) * 80
              : x + 14 + (wide ? j % 5 : j) * 70,
            top = y + 66 + (grid ? Math.floor(j / 3) * 86 : wide ? Math.floor(j / 5) * 76 : 0),
            item = member.equipment.find((e) => e.slot === slot),
            image = item ? artwork.get(`${item.itemId}:${item.quality}`) : null;
          ctx.fillStyle = "#101014";
          ctx.fillRect(left, top, box, box);
          ctx.strokeStyle = "#393033";
          ctx.strokeRect(left, top, box, box);
          if (image) ctx.drawImage(image, left + 2, top + 2, box - 4, box - 4);
          else if (item) {
            ctx.fillStyle = "#F2EEE9";
            ctx.font = `10px ${uiFont}`;
            const name = equipmentName(item.itemId);
            ctx.fillText(text(name, box - 6), left + 3, top + box / 2);
          }
          ctx.fillStyle = "#A9A4A9";
          ctx.font = `${wide && !smallParty ? 9 : 10}px ${uiFont}`;
          ctx.fillText(slot, left, top + box + 14);
        });
      });
      ctx.fillStyle = "#A9A4A9";
      ctx.font = `12px ${uiFont}`;
      ctx.fillText(
        "Player-authored plan · Item artwork © Sandbox Interactive · No live market values",
        32,
        canvas.height - 15,
      );
      let output = canvas;
      if (size === "1080") {
        output = document.createElement("canvas");
        output.width = 1920;
        output.height = 1080;
        const target = output.getContext("2d");
        if (!target) throw new Error("Image export is unavailable in this browser.");
        target.fillStyle = "#101014";
        target.fillRect(0, 0, output.width, output.height);
        const scale = Math.min(output.width / canvas.width, output.height / canvas.height);
        target.drawImage(
          canvas,
          (output.width - canvas.width * scale) / 2,
          (output.height - canvas.height * scale) / 2,
          canvas.width * scale,
          canvas.height * scale,
        );
      }
      const blob = await new Promise<Blob>((resolve, reject) =>
        output.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Could not encode PNG."))),
          "image/png",
        ),
      );
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `outpost-${composition.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 60) || "composition"}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        missing
          ? "PNG exported. Unavailable artwork is labeled with item names."
          : "PNG exported. It includes the visible party plan; share private plans deliberately.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "PNG export failed. Try again.");
    } finally {
      artwork.forEach((bitmap) => bitmap.close());
      setBusy(false);
    }
  }
  return (
    <span className="png-export">
      <label className="png-size">
        PNG size
        <select
          aria-label="PNG size"
          value={size}
          disabled={busy}
          onChange={(e) => setSize(e.target.value)}
        >
          <option value="full">Full height</option>
          <option value="1080" disabled={composition.slots.length > 20}>
            1920 × 1080 · up to20 players
          </option>
        </select>
      </label>
      <button type="button" className="button secondary" disabled={busy} onClick={download}>
        {busy ? "Preparing image…" : "Export PNG"}
      </button>
      {message && <span role="status">{message}</span>}
    </span>
  );
}
