import Link from "@/components/link";

export default function NotFound() {
  return (
    <section className="outpost-not-found" aria-labelledby="not-found-title">
      <picture className="not-found-art" aria-hidden="true">
        <source media="(max-width: 700px)" srcSet="/albion/illustrations/hero-v1-phone.webp" />
        <img src="/albion/illustrations/hero-v1.webp" alt="" width={1600} height={900} />
      </picture>
      <div className="not-found-copy">
        <p className="not-found-code">404</p>
        <h1 id="not-found-title" className="page-title display-title">
          Page not found.
        </h1>
        <p>
          The link may have expired, the content may have moved, or you may not have access. For
          a private Team resource, ask an officer for a new invitation.
        </p>
        <div className="actions">
          <Link className="button primary" href="/">
            Go home
          </Link>
          <Link className="button secondary" href="/tools">
            Browse tools
          </Link>
        </div>
      </div>
    </section>
  );
}
