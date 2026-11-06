import type { ToolIcon } from "./tool-icon";
import type { ComponentProps } from "react";
import { toolEmblem } from "@/lib/search-emblems";
type Glyph = ComponentProps<typeof ToolIcon>["name"];
/** Painted scenes behind page titles. Working panels below never get background art. */
export type Scene = "market" | "economy" | "builds" | "comps" | "guides" | "roads";
export function WorkspaceHeading({
  title,
  accent,
  description,
  icon = "calculator",
  glyph,
  emblem,
  scene,
  cover,
  titleId,
  children,
  actions,
}: {
  title: string;
  /** One word of the title to set in ember, as the landing does ("Market *Explorer*"). */
  accent?: string;
  description: string;
  icon?: "calculator" | "account" | "timer";
  /** Original task emblem from the tool directory; overrides `icon`. */
  glyph?: Glyph | "cook" | "alchemy";
  /** Custom emblem content (an item render, a painted mark); overrides `glyph` and `icon`. */
  emblem?: React.ReactNode;
  scene?: Scene;
  /** A painting of the page's own (a guide cover) in place of the scene. */
  cover?: string;
  /** An id for the title, for in-page links back to the top. */
  titleId?: string;
  /** Optional actions or tabs rendered under the title. */
  children?: React.ReactNode;
  /** Primary action rendered at the right edge of the masthead. */
  actions?: React.ReactNode;
}) {
  return (
    <header
      className="workspace-identity"
      data-scene={cover ? "cover" : (scene ?? "page")}
      style={cover ? ({ "--scene": `url("${cover}")` } as React.CSSProperties) : undefined}
    >
      <div className="workspace-identity-copy">
        <div className="workspace-identity-head">
          <span className="workspace-emblem" aria-hidden="true">
            {emblem ?? (
              // The painted emblem for what the page does, like the landing's windows
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="painted-emblem"
                src={`/albion/icons/${icon === "timer" && !glyph ? "team-calendar" : toolEmblem(glyph ?? icon)}.webp`}
                alt=""
                width={64}
                height={64}
              />
            )}
          </span>
          <div>
            <h1 id={titleId} className="page-title display-title">
              {accentedTitle(title, accent)}
            </h1>
            <p className="intro">{description}</p>
          </div>
        </div>
        {children}
      </div>
      {actions && <div className="workspace-identity-actions">{actions}</div>}
    </header>
  );
}

/** Sets the first whole-word match of `accent` in ember; the title reads the same without it. */
function accentedTitle(title: string, accent?: string) {
  const at = accent
    ? title.search(new RegExp(`\\b${accent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`))
    : -1;
  if (!accent || at < 0) return title;
  return (
    <>
      {title.slice(0, at)}
      <em>{title.slice(at, at + accent.length)}</em>
      {title.slice(at + accent.length)}
    </>
  );
}
