import { Calculator, Settings, Clock3 } from "lucide-react";
import { ToolIcon } from "./tool-icon";
import type { ComponentProps } from "react";
type Glyph = ComponentProps<typeof ToolIcon>["name"];
/** Painted scenes behind page titles. Working panels below never get background art. */
export type Scene = "market" | "economy" | "builds" | "comps" | "guides" | "roads";
export function WorkspaceHeading({
  title,
  description,
  icon = "calculator",
  glyph,
  scene,
  children,
  actions,
}: {
  title: string;
  description: string;
  icon?: "calculator" | "account" | "timer";
  /** Original task emblem from the tool directory; overrides `icon`. */
  glyph?: Glyph;
  scene?: Scene;
  /** Optional actions or tabs rendered under the title. */
  children?: React.ReactNode;
  /** Primary action rendered at the right edge of the masthead. */
  actions?: React.ReactNode;
}) {
  const Icon = icon === "account" ? Settings : icon === "timer" ? Clock3 : Calculator;
  return (
    <header className="workspace-identity" data-scene={scene}>
      <div className="workspace-identity-copy">
        <div className="workspace-identity-head">
          <span className="workspace-emblem" aria-hidden="true">
            {glyph ? <ToolIcon name={glyph} size={26} /> : <Icon />}
          </span>
          <div>
            <h1 className="page-title display-title">{title}</h1>
            <p className="intro">{description}</p>
          </div>
        </div>
        {children}
      </div>
      {actions && <div className="workspace-identity-actions">{actions}</div>}
    </header>
  );
}
