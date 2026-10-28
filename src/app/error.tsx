"use client";
import Link from "@/components/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel">
      <h1 className="page-title">This page is temporarily unavailable.</h1>
      <p>We could not complete the request. Your previously saved content has not been replaced.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
      <Link className="button secondary" href="/">
        Return to overview
      </Link>
    </section>
  );
}
