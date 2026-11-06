import Link from "@/components/link";
import { SystemPage } from "@/components/system-page";

export default function NotFound() {
  return (
    <SystemPage
      eyebrow="404"
      emblem="tool-planner"
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
