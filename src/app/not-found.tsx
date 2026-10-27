import Link from "next/link";
import { MapPinned } from "lucide-react";

export default function NotFound() {
  return (
    <section className="outpost-not-found">
      <MapPinned size={40} aria-hidden="true" />
      <h1 className="page-title display-title">This page is unavailable</h1>
      <p>
        The link may have expired, the content may have moved, or you may not have access. For a
        private guild resource, ask an officer for a new invitation.
      </p>
      <div className="actions">
        <Link className="button primary" href="/">
          Return to Outpost
        </Link>
        <Link className="button secondary" href="/tools">
          Browse tools
        </Link>
      </div>
    </section>
  );
}
