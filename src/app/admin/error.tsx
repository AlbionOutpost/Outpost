"use client";
import { EmptyWell } from "@/components/empty-well";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="admin-workspace" role="alert">
      <div className="admin-main">
        <EmptyWell
          emblem="status-error"
          title="Administration is unavailable"
          line="The records could not be loaded and no change was confirmed. Reload the data before you try an action again."
          action={
            <button className="pill-link" onClick={reset}>
              Retry
            </button>
          }
        />
      </div>
    </div>
  );
}
