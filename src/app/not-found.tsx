import Link from "@/components/link";
import { SystemPage } from "@/components/system-page";
import type { Metadata } from "next";
import { privateRobots } from "@/lib/seo";

/* A missing, private, unlisted or hidden record renders this page. Content pages have no
   streamed loading boundary any more, so its head replaces the record's own: it names nothing
   and keeps every search and share preview out. */
export const metadata: Metadata = { title: "Page not found", robots: privateRobots };

export default function NotFound() {
  return (
    <SystemPage
      eyebrow="404"
      emblem="status-notfound"
      title={
        <>
          Page not <em>found</em>
        </>
      }
      line="This link is broken, or the page has moved or is private."
      actions={
        <>
          <Link className="button primary" href="/">
            Go to the home page
          </Link>
          <Link className="button secondary" href="/tools">
            Browse tools
          </Link>
        </>
      }
    />
  );
}
