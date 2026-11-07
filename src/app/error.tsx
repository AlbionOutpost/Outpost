"use client";
import Link from "@/components/link";
import { SystemPage } from "@/components/system-page";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <SystemPage
      eyebrow="Something went wrong"
      emblem="status-error"
      title={
        <>
          This page didn&rsquo;t <em>load</em>
        </>
      }
      line="Nothing you saved has changed. Try again, and if it keeps failing, come back in a few minutes."
      actions={
        <>
          <button type="button" className="button primary" onClick={() => retry()}>
            Try again
          </button>
          <Link className="button secondary" href="/">
            Go to the home page
          </Link>
        </>
      }
    />
  );
}
