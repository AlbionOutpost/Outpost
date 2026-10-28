import { BarChart3, ShieldCheck, ClipboardList } from "lucide-react";
export function WorkspaceHeading({ title, description }: { title: string; description: string }) {
  return (
    <header className="premium-workspace-heading">
      <div>
        <h1 className="page-title display-title">{title}</h1>
        <p className="intro">{description}</p>
      </div>
      <div className="workspace-capabilities">
        <span>
          <BarChart3 size={20} />
          <strong>Regional prices</strong>
          <small>Compare your markets</small>
        </span>
        <span>
          <ShieldCheck size={20} />
          <strong>Visible assumptions</strong>
          <small>Understand every cost</small>
        </span>
        <span>
          <ClipboardList size={20} />
          <strong>Plan your next run</strong>
          <small>Keep purchases together</small>
        </span>
      </div>
    </header>
  );
}
