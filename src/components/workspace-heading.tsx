import { Calculator, Settings, Clock3 } from "lucide-react";
export function WorkspaceHeading({
  title,
  description,
  icon = "calculator",
}: {
  title: string;
  description: string;
  icon?: "calculator" | "account" | "timer";
}) {
  const Icon = icon === "account" ? Settings : icon === "timer" ? Clock3 : Calculator;
  return (
    <header className="workspace-identity">
      <span className="workspace-emblem" aria-hidden="true">
        <Icon />
      </span>
      <div>
        <h1 className="page-title display-title">{title}</h1>
        <p className="intro">{description}</p>
      </div>
    </header>
  );
}
